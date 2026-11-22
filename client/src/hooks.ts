import { useDispatch, useSelector } from 'react-redux'
import type { Dispatch, State } from './stores/store'

// The react-redux hooks, told what OUR store looks like (so `state.player.player` is checked)
export const useAppDispatch = useDispatch.withTypes<Dispatch>()
export const useAppSelector = useSelector.withTypes<State>()
