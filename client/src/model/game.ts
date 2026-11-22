import * as _ from 'lodash/fp'
import { canPlayCard, cardFromMemento, colors } from 'uno-model/src/model/deck'
import type { Card, CardMemento, Color } from 'uno-model/src/model/deck'
import type { GameStateEvent } from 'uno-model/src/dto/events'

// ---------------------------------------------------------------------------------------
// 1. Types that exist only on the client
// ---------------------------------------------------------------------------------------

// A game that is still waiting for players: the lobby. (Your Yahtzee `IndexedYahtzeeSpecs`.)
export type PendingGame = Readonly<{
  id: string,
  creator: string,
  players: string[],
  number_of_players: number,
  target_score: number,
  cards_per_player: number
}>

export type NewGameSettings = Readonly<{
  number_of_players: number,
  target_score: number,
  cards_per_player: number
}>

// What GraphQL gives us: absent fields arrive as null, and a card is one flat shape.
export type GraphQlCard = Readonly<{ type: string, color?: string | null, number?: number | null }>

export type GraphQlGameState = Readonly<{
  gameId: string,
  playerPos: number,
  players: string[],
  scores: number[],
  targetScore: number,
  handEnded: boolean,
  playerInTurn?: number | null,
  currentColor?: string | null,
  discardPileTop?: GraphQlCard | null,
  playerHandCount?: number[] | null,
  playerHand?: GraphQlCard[] | null,
  unoState?: boolean[] | null
}>

// ---------------------------------------------------------------------------------------
// 2. Wire -> domain. "Parse, don't validate": after this boundary the rest of the client
//    only ever sees real `Card`s and `GameStateEvent`s.
// ---------------------------------------------------------------------------------------

// `optional(f)` lifts f over "maybe a value": the Maybe functor's `map` (nothing stays nothing)
const optional = <A, B>(f: (a: A) => B) =>
    (value: A | null | undefined): B | undefined =>
        value === null || value === undefined ? undefined : f(value)

// The domain already knows how to build a valid card, so reuse it: drop the nulls, then let
// `cardFromMemento` check the type, colour and number and throw if the server sent nonsense.
export const from_graphql_card = (card: GraphQlCard): Card =>
    cardFromMemento(_.omitBy(_.isNil, card) as CardMemento)

const color_of = (color: string): Color => {
  if (!(colors as readonly string[]).includes(color)) throw Error(`Invalid colour: ${color}`)
  return color as Color
}

export const from_graphql_game_state = (g: GraphQlGameState): GameStateEvent => ({
  type: 'game-state',
  gameId: g.gameId,
  playerPos: g.playerPos,
  players: g.players,
  scores: g.scores,
  targetScore: g.targetScore,
  handEnded: g.handEnded,
  playerInTurn: g.playerInTurn ?? undefined,
  currentColor: optional(color_of)(g.currentColor),
  discardPileTop: optional(from_graphql_card)(g.discardPileTop),
  playerHandCount: g.playerHandCount ?? undefined,
  playerHand: optional(_.map(from_graphql_card))(g.playerHand),
  unoState: g.unoState ?? undefined
})

// ---------------------------------------------------------------------------------------
// 3. The viewmodel as plain functions: snapshot in, what the screen needs out.
//    Components call them (useMemo if needed). No selectors library, no cached copies.
// ---------------------------------------------------------------------------------------

export const find_game = (id: string, games: ReadonlyArray<GameStateEvent>): GameStateEvent | undefined =>
    games.find(game => game.gameId === id)

export const is_wild = (card: Card): boolean => !('color' in card)

export const is_my_turn = (g: GameStateEvent): boolean => g.playerInTurn === g.playerPos

export const my_hand = (g: GameStateEvent): ReadonlyArray<Card> => g.playerHand ?? []

// One flag per card in my hand: may I play it now? The rule is the domain's own `canPlayCard`.
export const playable = (g: GameStateEvent): boolean[] => {
  const hand = my_hand(g)
  const color = g.currentColor
  const top = g.discardPileTop
  return is_my_turn(g) && color && top
      ? hand.map(card => canPlayCard(color, top, hand, card))
      : hand.map(() => false)
}

// Drawing is only allowed when nothing in the hand can be played (the server enforces it too)
export const can_draw = (g: GameStateEvent): boolean => is_my_turn(g) && !playable(g).some(Boolean)

// You say UNO with two cards left (before playing one) or right after you played down to one
export const can_say_uno = (g: GameStateEvent): boolean => my_hand(g).length <= 2 && winner(g) === undefined

export const opponents = (g: GameStateEvent) =>
    g.players
        .map((name, index) => ({
          name,
          index,
          card_count: g.playerHandCount?.[index] ?? 0,
          in_turn: g.playerInTurn === index,
          can_be_caught: g.unoState?.[index] ?? false
        }))
        .filter(opponent => opponent.index !== g.playerPos)

// The game winner is whoever reached the target score
export const winner = (g: GameStateEvent): string | undefined => {
  const index = g.scores.findIndex(score => score >= g.targetScore)
  return index < 0 ? undefined : g.players[index]
}

// The server flags the snapshot in which a hand ended; comparing it with the previous
// snapshot of the same game tells us who won and how much.
export const round_summary = (before: GameStateEvent, now: GameStateEvent): string => {
  const index = now.scores.findIndex((score, i) => score !== before.scores[i])
  return index < 0   // the winner can score 0 when everyone else holds only zeros
      ? 'Round over'
      : `${now.players[index]} won the round and scored ${now.scores[index] - before.scores[index]} points`
}
