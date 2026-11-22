import { Link, Navigate, useParams } from 'react-router'
import { useAppSelector } from '../hooks'
import { find_game } from '../model/game'
import { game as find_pending } from '../slices/pending_games_slice'

// The waiting room. When the lobby fills up, the server starts the game: the lobby leaves
// `pending_games` and a snapshot with the same id arrives in `ongoing_games`.
export default function PendingPage() {
  const { id = '' } = useParams()
  const lobby = useAppSelector(state => find_pending(id, state.pending_games))
  const started = useAppSelector(state => find_game(id, state.ongoing_games))

  if (started !== undefined) return <Navigate to={`/game/${id}`} replace />

  if (lobby === undefined)
    return <section className="panel"><p>This lobby is gone. <Link to="/">Back to start</Link></p></section>

  return (
    <section className="panel">
      <h2>Waiting for players ({lobby.players.length}/{lobby.number_of_players})</h2>
      <ul>{lobby.players.map(name => <li key={name}>{name}</li>)}</ul>
      <p>Target score {lobby.target_score}, {lobby.cards_per_player} cards each.</p>
    </section>
  )
}
