import { Subject } from 'rxjs';
import type { Observable } from 'rxjs';
import type { GameAction } from 'uno-model/src/dto/action';
import type { GameStateEvent } from 'uno-model/src/dto/events';
import type { Color } from 'uno-model/src/model/deck';
import { chooseBotActions } from 'uno-model/src/model/bot';
import { applyAction, handJustEnded, toGameStateEvent } from 'uno-model/src/model/protocol';
import { createGame } from 'uno-model/src/model/uno';
import type { Game } from 'uno-model/src/model/uno';
import type { NewGameSettings, PendingGame } from './game';

// An in-memory stand-in for the server, with the SAME exports as api.ts (backend.ts checks that).
// It runs the real model: `applyAction` and `toGameStateEvent` are the functions the server
// module will call too. Empty seats in a lobby are filled with bots, and bots play on a timer.
//
// The `Map`s below are the server's memory, the only mutable state in this file.

export const dummy_settings = { bot_delay_ms: 900, bot_join_delay_ms: 1200 }

const pending = new Map<string, PendingGame>()
const running = new Map<string, Game>()
const state_subjects = new Map<string, Subject<GameStateEvent>>()
const pending_subject = new Subject<PendingGame>()
const bot_timers = new Map<string, ReturnType<typeof setTimeout>>()
let next_id = 1

const is_bot = (name: string) => name.startsWith('Bot ')

const state_subject = (player: string): Subject<GameStateEvent> => {
  const existing = state_subjects.get(player)
  if (existing) return existing
  const created = new Subject<GameStateEvent>()
  state_subjects.set(player, created)
  return created
}

// Every human in the game gets THEIR OWN projection of the same game
const publish = (id: string, game: Game, hand_ended: boolean) =>
  game.players.forEach((name, seat) => {
    if (!is_bot(name)) state_subject(name).next(toGameStateEvent(game, id, seat, hand_ended))
  })

const schedule_bots = (id: string) => {
  clearTimeout(bot_timers.get(id))
  bot_timers.set(id, setTimeout(() => bot_step(id), dummy_settings.bot_delay_ms))
}

// Apply one action for one player; throws the domain's reason when it is not allowed
const act = (id: string, player: string, action: GameAction): void => {
  const game = running.get(id)
  if (game === undefined) throw Error('No such game')
  const seat = game.players.indexOf(player)
  if (seat < 0) throw Error('You are not in this game')
  const next = applyAction(game, seat, action)
  running.set(id, next)
  publish(id, next, handJustEnded(game, next))
  schedule_bots(id)   // whoever is next, if it is a bot, will answer shortly
}

const bot_step = (id: string) => {
  const round = running.get(id)?.currentRound
  const turn = round?.playerInTurn
  const bot = turn === undefined ? undefined : running.get(id)!.players[turn]
  if (round === undefined || bot === undefined || !is_bot(bot)) return   // a human's turn, or game over
  try {
    chooseBotActions(round, Math.random).forEach(action => act(id, bot, action))
  } catch (error) {
    console.error('[dummy bot]', error)
  }
}

const start = (lobby: PendingGame) => {
  pending.delete(lobby.id)
  const game = createGame({
    players: lobby.players,
    targetScore: lobby.target_score,
    cardsPerPlayer: lobby.cards_per_player
  })
  running.set(lobby.id, game)
  publish(lobby.id, game, false)
  schedule_bots(lobby.id)
}

// Add a player; a full lobby is announced one last time (full = no longer pending) and starts
const admit = (lobby: PendingGame, player: string): PendingGame => {
  const updated = { ...lobby, players: [...lobby.players, player] }
  pending_subject.next(updated)
  if (updated.players.length >= updated.number_of_players) start(updated)
  else pending.set(updated.id, updated)
  return updated
}

const fill_with_bots = (id: string) =>
  setTimeout(() => {
    const lobby = pending.get(id)
    if (lobby === undefined) return
    admit(lobby, `Bot ${lobby.players.filter(is_bot).length + 1}`)
    if (pending.has(id)) fill_with_bots(id)
  }, dummy_settings.bot_join_delay_ms)

// --- queries -------------------------------------------------------------------------------

export async function games(player: string): Promise<GameStateEvent[]> {
  return [...running.entries()]
    .filter(([, game]) => game.players.includes(player))
    .map(([id, game]) => toGameStateEvent(game, id, game.players.indexOf(player)))
}

export async function pending_games(): Promise<PendingGame[]> {
  return [...pending.values()]
}

// --- lobby mutations -----------------------------------------------------------------------

export async function new_game(creator: string, settings: NewGameSettings): Promise<PendingGame> {
  const { number_of_players, target_score, cards_per_player } = settings
  if (number_of_players < 2 || number_of_players > 10) throw Error('A game needs 2 to 10 players')
  if (target_score <= 0) throw Error('The target score must be positive')
  if (cards_per_player < 1 || number_of_players * cards_per_player >= 100) throw Error('Invalid number of cards per player')

  const lobby: PendingGame = {
    id: `game-${next_id++}`,
    creator,
    players: [creator],
    number_of_players,
    target_score,
    cards_per_player
  }
  pending.set(lobby.id, lobby)
  pending_subject.next(lobby)
  fill_with_bots(lobby.id)
  return lobby
}

export async function join(id: string, player: string): Promise<PendingGame> {
  const lobby = pending.get(id)
  if (lobby === undefined) throw Error('No such pending game')
  if (lobby.players.includes(player)) throw Error('You have already joined this game')
  return admit(lobby, player)
}

// --- game commands -------------------------------------------------------------------------

export async function play(id: string, player: string, card_pos: number, color?: Color): Promise<void> {
  act(id, player, { type: 'play', cardPos: card_pos, color })
}

export async function draw(id: string, player: string): Promise<void> {
  act(id, player, { type: 'draw' })
}

export async function say_uno(id: string, player: string): Promise<void> {
  act(id, player, { type: 'say-uno' })
}

export async function catch_uno(id: string, player: string, accused: number): Promise<void> {
  act(id, player, { type: 'catch-uno', accusedPosition: accused })
}

// --- subscriptions -------------------------------------------------------------------------

export function game_state_rxjs(player: string): Observable<GameStateEvent> {
  return state_subject(player).asObservable()
}

export function pending_rxjs(): Observable<PendingGame> {
  return pending_subject.asObservable()
}
