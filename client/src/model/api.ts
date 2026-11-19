import { ApolloClient, gql, InMemoryCache, type DocumentNode, HttpLink, ApolloLink } from "@apollo/client/core";
import { getMainDefinition } from '@apollo/client/utilities';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import type { Observable } from 'rxjs';
import type { GameStateEvent } from 'uno-model/src/dto/events';
import type { Color } from 'uno-model/src/model/deck';
import { type GraphQlGameState, type PendingGame, type NewGameSettings, from_graphql_game_state } from "./game";
import { subscriptionsRxJS } from "./rxjs";

// The real backend. The operations below are the contract the server module has to
// implement: see schema.graphql. api.dummy.ts has the same exports, backed by memory.

const wsLink = new GraphQLWsLink(createClient({
  url: 'ws://localhost:4000/graphql',
}))

const httpLink = new HttpLink({
  uri: 'http://localhost:4000/graphql'
})

const splitLink = ApolloLink.split(
  ({ query }) => {
    const definition = getMainDefinition(query)
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    )
  },
  wsLink,
  httpLink,
)

const apolloClient = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache()
})

async function query(query: DocumentNode, variables?: object): Promise<unknown> {
  const result = await apolloClient.query({ query, variables, fetchPolicy: 'network-only' })
  return result.data
}

async function mutate(mutation: DocumentNode, variables?: object): Promise<unknown> {
  const result = await apolloClient.mutate({ mutation, variables, fetchPolicy: 'network-only' })
  return result.data
}

// The fields of a per-player snapshot (GameStateEvent). Hands are private, so the server
// fills `playerHand` for the player the snapshot is for, and only the hand COUNT for the others.
const GAME_STATE_FIELDS = `
  gameId playerPos players scores targetScore handEnded playerInTurn currentColor
  discardPileTop { type color number }
  playerHandCount
  playerHand { type color number }
  unoState`

const PENDING_GAME_FIELDS = `id creator players number_of_players target_score cards_per_player`

// --- queries -------------------------------------------------------------------------------

export async function games(player: string): Promise<GameStateEvent[]> {
  const response = await query(gql`
    query Games($player: String!) {
      games(player: $player) { ${GAME_STATE_FIELDS} }
    }`, { player }) as { games: GraphQlGameState[] }
  return response.games.map(from_graphql_game_state)
}

export async function pending_games(): Promise<PendingGame[]> {
  const response = await query(gql`{
    pending_games { ${PENDING_GAME_FIELDS} }
  }`) as { pending_games: PendingGame[] }
  return response.pending_games
}

// --- lobby mutations -----------------------------------------------------------------------

export async function new_game(creator: string, settings: NewGameSettings): Promise<PendingGame> {
  const response = await mutate(gql`
    mutation NewGame($creator: String!, $numberOfPlayers: Int!, $targetScore: Int!, $cardsPerPlayer: Int!) {
      new_game(creator: $creator, number_of_players: $numberOfPlayers, target_score: $targetScore, cards_per_player: $cardsPerPlayer) {
        ${PENDING_GAME_FIELDS}
      }
    }`, {
      creator,
      numberOfPlayers: settings.number_of_players,
      targetScore: settings.target_score,
      cardsPerPlayer: settings.cards_per_player
    }) as { new_game: PendingGame }
  return response.new_game
}

export async function join(id: string, player: string): Promise<PendingGame> {
  const response = await mutate(gql`
    mutation Join($id: ID!, $player: String!) {
      join(id: $id, player: $player) { ${PENDING_GAME_FIELDS} }
    }`, { id, player }) as { join: PendingGame }
  return response.join
}

// --- game commands -------------------------------------------------------------------------
// They answer only "accepted or rejected" (a GraphQL error carries the reason). The new game
// state is NOT returned: it arrives through the subscription, which is the only writer of
// game state. Two writers (mutation result + subscription) could overwrite a newer snapshot
// with an older one.

export async function play(id: string, player: string, card_pos: number, color?: Color): Promise<void> {
  await mutate(gql`
    mutation Play($id: ID!, $player: String!, $cardPos: Int!, $color: String) {
      play(id: $id, player: $player, card_pos: $cardPos, color: $color)
    }`, { id, player, cardPos: card_pos, color: color ?? null })
}

export async function draw(id: string, player: string): Promise<void> {
  await mutate(gql`
    mutation Draw($id: ID!, $player: String!) {
      draw(id: $id, player: $player)
    }`, { id, player })
}

export async function say_uno(id: string, player: string): Promise<void> {
  await mutate(gql`
    mutation SayUno($id: ID!, $player: String!) {
      say_uno(id: $id, player: $player)
    }`, { id, player })
}

export async function catch_uno(id: string, player: string, accused: number): Promise<void> {
  await mutate(gql`
    mutation CatchUno($id: ID!, $player: String!, $accused: Int!) {
      catch_uno(id: $id, player: $player, accused: $accused)
    }`, { id, player, accused })
}

// --- subscriptions (cold Observables, see rxjs.ts) ------------------------------------------

// One snapshot per change, for every game this player is in, projected for this player
export function game_state_rxjs(player: string): Observable<GameStateEvent> {
  return subscriptionsRxJS(
    apolloClient,
    gql`subscription GameStateSubscription($player: String!) {
      game_state(player: $player) { ${GAME_STATE_FIELDS} }
    }`,
    { player },
    ({ game_state }: { game_state: GraphQlGameState }) => from_graphql_game_state(game_state)
  )
}

// A lobby changed: someone created it or joined it
export function pending_rxjs(): Observable<PendingGame> {
  return subscriptionsRxJS(
    apolloClient,
    gql`subscription PendingSubscription {
      pending { ${PENDING_GAME_FIELDS} }
    }`,
    {},
    ({ pending }: { pending: PendingGame }) => pending
  )
}
