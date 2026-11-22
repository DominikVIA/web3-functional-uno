import { filter, groupBy, map, merge, mergeMap, pairwise, retry, share } from 'rxjs'
import type { Observable } from 'rxjs'
import type { GameStateEvent } from 'uno-model/src/dto/events'
import * as backend from '../model/api'
import { round_summary } from '../model/game'
import { notifications_slice } from '../slices/notifications_slice'
import { ongoing_games_slice } from '../slices/ongoing_games_slice'
import type { Thunk } from '../stores/store'

const RECONNECT_DELAY_MS = 2000

// A derived event: "a hand ended" is a snapshot flagged handEnded, compared with the previous
// snapshot OF THE SAME GAME (groupBy keeps games apart; pairwise pairs each snapshot with the
// one before it).
const round_ended = (games$: Observable<GameStateEvent>) => games$.pipe(
  groupBy(game => game.gameId),
  mergeMap(same_game$ => same_game$.pipe(pairwise())),
  filter(([, now]) => now.handEnded),
  map(([before, now]) => round_summary(before, now))
)

// The server pushes one snapshot per change, projected for this player. Every snapshot goes
// into the store, and the same stream also yields the "round ended" toasts.
export default (player: string): Thunk<() => void> => dispatch => {
  // `share` keeps ONE Apollo subscription for the two pipelines below
  const games$ = backend.game_state_rxjs(player).pipe(retry({ delay: RECONNECT_DELAY_MS }), share())

  const subscription = merge(
    games$.pipe(map(ongoing_games_slice.actions.snapshot_received)),
    round_ended(games$).pipe(map(text => notifications_slice.actions.toast_added({ level: 'info', text })))
  ).subscribe(dispatch)

  return () => subscription.unsubscribe()
}
