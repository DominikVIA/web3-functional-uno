import { Link, useNavigate } from 'react-router'
import { useAppDispatch, useAppSelector } from '../hooks'
import { player_slice } from '../slices/player_slice'

export default function AuthHeader() {
  const player = useAppSelector(state => state.player.player)
  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  const logout = () => {
    dispatch(player_slice.actions.logged_out())
    navigate('/login')
  }

  return (
    <header className="auth-header">
      {player === undefined
        ? <Link to="/login"><button className="btn-login">Login</button></Link>
        : <div className="user-info">
            <span>Logged in as: <strong>{player}</strong></span>
            <button className="btn-logout" onClick={logout}>Logout</button>
          </div>}
    </header>
  )
}
