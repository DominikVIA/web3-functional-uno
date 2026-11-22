import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAppDispatch, useAppSelector } from '../hooks'
import type { NewGameSettings } from '../model/game'
import JoinThunk from '../thunks/JoinThunk'
import NewGameThunk from '../thunks/NewGameThunk'

// Replaces SetupView: instead of "start a game against N bots", the lobby flow of the real
// server: create a game (the dummy fills empty seats with bots), or join someone else's.
function NewGameForm({ player }: { player: string }) {
  const [settings, set_settings] = useState<NewGameSettings>({ number_of_players: 2, target_score: 500, cards_per_player: 7 })
  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  const field = (key: keyof NewGameSettings, label: string) =>
    <label>{label}{' '}
      <input type="number" value={settings[key]}
        onChange={event => set_settings({ ...settings, [key]: Number(event.target.value) })} />
    </label>

  return (
    <section className="panel">
      <h2>New game</h2>
      <div className="field">{field('number_of_players', 'Players')}</div>
      <div className="field">{field('target_score', 'Target score')}</div>
      <div className="field">{field('cards_per_player', 'Cards per player')}</div>
      <button onClick={() => dispatch(NewGameThunk(settings, player, navigate))}>Create game</button>
    </section>
  )
}

export default function HomePage() {
  const player = useAppSelector(state => state.player.player)!
  const ongoing = useAppSelector(state => state.ongoing_games)
  const pending = useAppSelector(state => state.pending_games)
  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  const join = async (id: string) => {
    const lobby = await dispatch(JoinThunk(id, player))
    if (lobby) navigate(`/pending/${id}`)   // `command` resolves to undefined when the server refused
  }

  return (
    <>
      <NewGameForm player={player} />

      <section className="panel">
        <h2>Your games</h2>
        {ongoing.length === 0 && <p>No games yet.</p>}
        <ul>
          {ongoing.map(game =>
            <li key={game.gameId}>
              <Link to={`/game/${game.gameId}`}>{game.gameId}</Link> vs {game.players.filter((_, i) => i !== game.playerPos).join(', ')}
            </li>)}
        </ul>
      </section>

      <section className="panel">
        <h2>Open lobbies</h2>
        {pending.length === 0 && <p>Nobody is waiting for players.</p>}
        <ul>
          {pending.map(lobby =>
            <li key={lobby.id}>
              {lobby.creator}'s game ({lobby.players.length}/{lobby.number_of_players}){' '}
              {lobby.players.includes(player)
                ? <Link to={`/pending/${lobby.id}`}>Open</Link>
                : <button onClick={() => join(lobby.id)}>Join</button>}
            </li>)}
        </ul>
      </section>
    </>
  )
}
