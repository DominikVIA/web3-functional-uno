import type { PendingGame } from "../model/game";
import { createSlice, type PayloadAction } from "@reduxjs/toolkit"

export type PendingGamesState = Readonly<PendingGame[]>

export const game = (id: string, state: PendingGamesState): PendingGame | undefined =>
  state.find(pending => pending.id === id)

const init_state: PendingGamesState = []

// A full lobby is a game that is starting, so it is not pending any more. The rule is a
// function of the data itself: the server does not need a separate "closed" message.
const is_full = (lobby: PendingGame): boolean => lobby.players.length >= lobby.number_of_players

const pending_games_reducers = {
  reset(_state: PendingGamesState, action: PayloadAction<PendingGame[]>): PendingGamesState {
    return action.payload.filter(lobby => !is_full(lobby))
  },

  upserted(state: PendingGamesState, action: PayloadAction<PendingGame>): PendingGamesState {
    const lobby = action.payload
    const exists = state.some(pending => pending.id === lobby.id)
    if (is_full(lobby))
      return state.filter(pending => pending.id !== lobby.id)
    if (!exists)
      return [lobby, ...state]
    return state.map(pending => pending.id === lobby.id ? lobby : pending)
  }
}

export const pending_games_slice = createSlice({
  name: 'pending games',
  initialState: init_state,
  reducers: pending_games_reducers
})
