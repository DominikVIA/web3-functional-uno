import { Link, useParams } from 'react-router'
import type { Color } from 'uno-model/src/model/deck'
import { useAppDispatch, useAppSelector } from '../hooks'
import { can_draw, can_say_uno, find_game, is_my_turn, my_hand, opponents, playable, winner } from '../model/game'
import CatchUnoThunk from '../thunks/CatchUnoThunk'
import DrawThunk from '../thunks/DrawThunk'
import PlayThunk from '../thunks/PlayThunk'
import SayUnoThunk from '../thunks/SayUnoThunk'
import Card from '../components/Card'
import OpponentRow from '../components/OpponentRow'
import PlayerHand from '../components/PlayerHand'

// GameView, without the bot worker, the timers and the redirects: the server plays the bots and
// pushes snapshots, the page only draws the latest snapshot and sends commands.
export default function GamePage() {
  const { id = '' } = useParams()
  const player = useAppSelector(state => state.player.player)!
  const game = useAppSelector(state => find_game(id, state.ongoing_games))
  const dispatch = useAppDispatch()

  if (game === undefined)
    return <section className="panel"><p>Loading game… <Link to="/">Back to start</Link></p></section>

  const champion = winner(game)

  return (
    <section>
      <p>Turn: <strong>{game.playerInTurn === undefined ? '-' : game.players[game.playerInTurn]}</strong></p>
      <p>Color: <strong>{game.currentColor ?? '-'}</strong></p>

      <div className="scores">
        {game.players.map((name, i) => <span key={name}>{name}: {game.scores[i]} </span>)}
        <span>(target {game.targetScore})</span>
      </div>

      <div className="table">
        <div>
          <h2>Upper card</h2>
          {game.discardPileTop && <Card card={game.discardPileTop} disabled />}
        </div>
        <div>
          <h2>Opponents</h2>
          {opponents(game).map(opponent =>
            <OpponentRow key={opponent.index} {...opponent}
              onCatch={() => dispatch(CatchUnoThunk(id, opponent.index, player))} />)}
        </div>
      </div>

      {champion !== undefined
        ? <div className="panel">
            <h2>Game over</h2>
            <p>Winner: <strong>{champion}</strong></p>
            <Link to="/"><button>Play again</button></Link>
          </div>
        : is_my_turn(game)
          ? <PlayerHand
              hand={my_hand(game)}
              playable={playable(game)}
              can_draw={can_draw(game)}
              can_say_uno={can_say_uno(game)}
              onPlay={(pos: number, color?: Color) => dispatch(PlayThunk(id, pos, player, color))}
              onDraw={() => dispatch(DrawThunk(id, player))}
              onSayUno={() => dispatch(SayUnoThunk(id, player))} />
          : <p className="bot-turn">Waiting for the others to play…</p>}
    </section>
  )
}
