import { randomUUID } from 'node:crypto'
import { Subject } from 'rxjs'
import type { Observable } from 'rxjs'
import type { GameAction } from 'uno-model/src/dto/action'
import type { GameStateEvent } from 'uno-model/src/dto/events'
import { applyAction, handJustEnded, toGameStateEvent } from 'uno-model/src/model/protocol'
import { createGame } from 'uno-model/src/model/uno'
import type { Game } from 'uno-model/src/model/uno'

// The server's memory and its rules about who may do what. All the UNO rules are the model's:
// `applyAction` and `toGameStateEvent` are the same pure functions the client's dummy used.
// This file only holds the current games and pushes the new snapshots out.

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

// A factory, not module-level maps: every test (or server) gets its own empty world.
export const createGameService = () => {
  const pending = new Map<string, PendingGame>()
  const running = new Map<string, Game>()
  const state_subjects = new Map<string, Subject<GameStateEvent>>()
  const pending_subject = new Subject<PendingGame>()

  const state_subject = (player: string): Subject<GameStateEvent> => {
    const existing = state_subjects.get(player)
    if (existing) return existing
    const created = new Subject<GameStateEvent>()
    state_subjects.set(player, created)
    return created
  }

  // Hands are private: every player in the game gets THEIR OWN projection of the same game
  const publish = (id: string, game: Game, hand_ended: boolean) =>
    game.players.forEach((name, seat) => state_subject(name).next(toGameStateEvent(game, id, seat, hand_ended)))

  const start = (lobby: PendingGame) => {
    pending.delete(lobby.id)
    const game = createGame({
      players: lobby.players,
      targetScore: lobby.target_score,
      cardsPerPlayer: lobby.cards_per_player
    })
    running.set(lobby.id, game)
    publish(lobby.id, game, false)
  }

  // Add a player. A full lobby is announced one last time (full = no longer pending), then starts.
  const admit = (lobby: PendingGame, player: string): PendingGame => {
    const updated = { ...lobby, players: [...lobby.players, player] }
    pending_subject.next(updated)
    if (updated.players.length >= updated.number_of_players) start(updated)
    else pending.set(updated.id, updated)
    return updated
  }

  return {
    // --- queries ---
    games: (player: string): GameStateEvent[] =>
      [...running.entries()]
        .filter(([, game]) => game.players.includes(player))
        .map(([id, game]) => toGameStateEvent(game, id, game.players.indexOf(player))),

    pending_games: (): PendingGame[] => [...pending.values()],

    // --- lobby ---
    new_game: (creator: string, settings: NewGameSettings): PendingGame => {
      const { number_of_players, target_score, cards_per_player } = settings
      if (number_of_players < 2 || number_of_players > 10) throw Error('A game needs 2 to 10 players')
      if (target_score <= 0) throw Error('The target score must be positive')
      if (cards_per_player < 1 || number_of_players * cards_per_player >= 100) throw Error('Invalid number of cards per player')

      const lobby: PendingGame = { id: randomUUID(), creator, players: [creator], number_of_players, target_score, cards_per_player }
      pending.set(lobby.id, lobby)
      pending_subject.next(lobby)
      return lobby
    },

    join: (id: string, player: string): PendingGame => {
      const lobby = pending.get(id)
      if (lobby === undefined) throw Error('No such pending game')
      if (lobby.players.includes(player)) throw Error('You have already joined this game')
      return admit(lobby, player)
    },

    // --- game commands: throws the domain's reason when the action is not allowed ---
    act: (id: string, player: string, action: GameAction): void => {
      const game = running.get(id)
      if (game === undefined) throw Error('No such game')
      const seat = game.players.indexOf(player)
      if (seat < 0) throw Error('You are not in this game')
      const next = applyAction(game, seat, action)
      running.set(id, next)
      publish(id, next, handJustEnded(game, next))
    },

    // --- live updates ---
    game_state$: (player: string): Observable<GameStateEvent> => state_subject(player).asObservable(),
    pending$: (): Observable<PendingGame> => pending_subject.asObservable()
  }
}

export type GameService = ReturnType<typeof createGameService>
