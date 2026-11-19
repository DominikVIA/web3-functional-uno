import { map, retry } from 'rxjs'
import { backend } from '../model/backend'
import { pending_games_slice } from '../slices/pending_games_slice'
import type { Thunk } from '../stores/store'

const RECONNECT_DELAY_MS = 2000

// Server event -> RxJS pipeline -> store. `dispatch(LiveUpdatePending())` returns the function
// that stops it, so a component can write:  useEffect(() => dispatch(LiveUpdatePending()), [])
export default (): Thunk<() => void> => dispatch => {
  const subscription = backend.pending_rxjs().pipe(
    retry({ delay: RECONNECT_DELAY_MS }),   // resubscribes after a dropped connection
    map(pending_games_slice.actions.upserted)
  ).subscribe(dispatch)
  return () => subscription.unsubscribe()
}
