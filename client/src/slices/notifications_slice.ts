import { createSlice, type PayloadAction } from "@reduxjs/toolkit"

export type Toast = Readonly<{ id: number, level: 'error' | 'info', text: string }>

export type NotificationsState = Readonly<{ toasts: ReadonlyArray<Toast>, next_id: number }>

const init_state: NotificationsState = { toasts: [], next_id: 1 }

const MAX_TOASTS = 5

// Events from different places end up here: a rejected command (thunks/command.ts) and a
// finished round (thunks/LiveUpdateGames.ts). Neither knows this slice exists.
const notifications_reducers = {
  toast_added(state: NotificationsState, action: PayloadAction<{ level: Toast['level'], text: string }>): NotificationsState {
    return {
      toasts: [...state.toasts, { id: state.next_id, ...action.payload }].slice(-MAX_TOASTS),
      next_id: state.next_id + 1
    }
  },

  toast_dismissed(state: NotificationsState, action: PayloadAction<number>): NotificationsState {
    return { ...state, toasts: state.toasts.filter(toast => toast.id !== action.payload) }
  }
}

export const notifications_slice = createSlice({
  name: 'notifications',
  initialState: init_state,
  reducers: notifications_reducers
})
