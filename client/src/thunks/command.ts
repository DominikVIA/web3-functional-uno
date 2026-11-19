import { notifications_slice } from "../slices/notifications_slice"
import type { Dispatch } from "../stores/store"

const message_of = (error: unknown): string => error instanceof Error ? error.message : String(error)

// Turns a backend call into a thunk. Its failure ("It is not your turn", a lost connection)
// becomes a toast_added event instead of an unhandled promise rejection.
// Resolves to the call's result, or undefined when it failed.
export default <A>(call: (dispatch: Dispatch) => Promise<A>) =>
  async (dispatch: Dispatch): Promise<A | undefined> => {
    try {
      return await call(dispatch)
    } catch (error) {
      dispatch(notifications_slice.actions.toast_added({ level: 'error', text: message_of(error) }))
      return undefined
    }
  }
