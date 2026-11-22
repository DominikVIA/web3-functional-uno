import { useEffect } from 'react'
import { matchPath, Navigate, Outlet, useLocation } from 'react-router'
import { useAppDispatch, useAppSelector } from '../hooks'
import InitGameThunk from '../thunks/InitGameThunk'
import LiveUpdateGames from '../thunks/LiveUpdateGames'
import LiveUpdatePending from '../thunks/LiveUpdatePending'

// Where the visitor wanted to go, in the shape LoginThunk reads: /game/7 -> ?game=7
const login_url = (pathname: string): string => {
  const game = matchPath('/game/:id', pathname)
  const pending = matchPath('/pending/:id', pathname)
  return game ? `/login?game=${game.params.id}`
      : pending ? `/login?pending=${pending.params.id}`
          : '/login'
}

// Everything behind the login. While a player is logged in: load once, then keep listening.
// The live-update thunks return their "stop" function, which is exactly an effect cleanup.
export default function RequireLogin() {
  const { pathname } = useLocation()
  const player = useAppSelector(state => state.player.player)
  const dispatch = useAppDispatch()

  useEffect(() => {
    if (player === undefined) return
    dispatch(InitGameThunk(player))
    const stop_games = dispatch(LiveUpdateGames(player))
    const stop_pending = dispatch(LiveUpdatePending())
    return () => { stop_games(); stop_pending() }
  }, [player, dispatch])

  return player === undefined ? <Navigate to={login_url(pathname)} replace /> : <Outlet />
}
