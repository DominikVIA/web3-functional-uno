import { createSlice, type PayloadAction } from "@reduxjs/toolkit"

export type PlayerState = {
  player: string | undefined
}

const init_state: PlayerState = { player: undefined }

// Reducers are named after what HAPPENED (past tense). They are plain functions
// (state, event) => new state, so they can be tested without Redux.
const player_reducers = {
  logged_in(_state: PlayerState, action: PayloadAction<string>): PlayerState {
    return { player: action.payload }
  },

  logged_out(_state: PlayerState): PlayerState {
    return init_state
  }
}

export const player_slice = createSlice({
  name: 'player',
  initialState: init_state,
  reducers: player_reducers
})
