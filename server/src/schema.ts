import { readFileSync } from 'node:fs'
import { makeExecutableSchema } from '@graphql-tools/schema'
import type { GameService } from './game-service'
import { toAsyncIterable } from './to-async-iterable'

// What every resolver knows about the caller. It comes from the verified JWT, never from arguments.
export type Context = { username: string }

const typeDefs = readFileSync(new URL('../schema.graphql', import.meta.url), 'utf8')

// The client still sends `player` with every call (to avoid touching every thunk). It is only
// accepted when it is the caller itself, so nobody can act as somebody else.
const as_me = (ctx: Context, player: string): string => {
  if (ctx.username !== player) throw Error('You can only act as yourself')
  return player
}

type Ids = { id: string, player: string }

// The resolvers are thin: check who is asking, call the service, answer.
export const create_schema = (service: GameService) => makeExecutableSchema<Context>({
  typeDefs,
  resolvers: {
    Query: {
      games: (_: unknown, { player }: { player: string }, ctx: Context) => service.games(as_me(ctx, player)),
      pending_games: () => service.pending_games()
    },

    Mutation: {
      new_game: (_: unknown, args: { creator: string, number_of_players: number, target_score: number, cards_per_player: number }, ctx: Context) =>
        service.new_game(as_me(ctx, args.creator), args),

      join: (_: unknown, { id, player }: Ids, ctx: Context) => service.join(id, as_me(ctx, player)),

      play: (_: unknown, { id, player, card_pos, color }: Ids & { card_pos: number, color?: string | null }, ctx: Context) => {
        service.act(id, as_me(ctx, player), { type: 'play', cardPos: card_pos, color: (color ?? undefined) as never })
        return true
      },
      draw: (_: unknown, { id, player }: Ids, ctx: Context) => {
        service.act(id, as_me(ctx, player), { type: 'draw' })
        return true
      },
      say_uno: (_: unknown, { id, player }: Ids, ctx: Context) => {
        service.act(id, as_me(ctx, player), { type: 'say-uno' })
        return true
      },
      catch_uno: (_: unknown, { id, player, accused }: Ids & { accused: number }, ctx: Context) => {
        service.act(id, as_me(ctx, player), { type: 'catch-uno', accusedPosition: accused })
        return true
      }
    },

    // `subscribe` returns the stream, `resolve` says what to send for each value in it
    Subscription: {
      game_state: {
        subscribe: (_: unknown, { player }: { player: string }, ctx: Context) =>
          toAsyncIterable(service.game_state$(as_me(ctx, player))),
        resolve: (snapshot: unknown) => snapshot
      },
      pending: {
        subscribe: () => toAsyncIterable(service.pending$()),
        resolve: (lobby: unknown) => lobby
      }
    }
  }
})
