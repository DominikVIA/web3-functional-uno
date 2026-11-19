import type { GameStateEvent } from "uno-model/src/dto/events"
import { createSlice, type PayloadAction } from "@reduxjs/toolkit"

// One snapshot per game this player is in: exactly what the server said, nothing derived.
// (The derived things, like "which cards can I play", are functions in model/game.ts.)
export type OngoingGamesState = Readonly<GameStateEvent[]>

const init_state: OngoingGamesState = []

const ongoing_games_reducers = {
  reset(_state: OngoingGamesState, action: PayloadAction<GameStateEvent[]>): OngoingGamesState {
    return action.payload
  },

  snapshot_received(state: OngoingGamesState, action: PayloadAction<GameStateEvent>): OngoingGamesState {
    const snapshot = action.payload
    return state.some(game => game.gameId === snapshot.gameId)
      ? state.map(game => game.gameId === snapshot.gameId ? snapshot : game)
      : [...state, snapshot]
  }
}

export const ongoing_games_slice = createSlice({
  name: 'Ongoing games slice',
  initialState: init_state,
  reducers: ongoing_games_reducers
})
