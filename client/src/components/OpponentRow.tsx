// One opponent: name, card count and (when they forgot to say UNO) the catch button
type Props = {
  name: string
  card_count: number
  in_turn: boolean
  can_be_caught: boolean
  onCatch: () => void
}

export default function OpponentRow({ name, card_count, in_turn, can_be_caught, onCatch }: Props) {
  return (
    <div className="card-count-display">
      <span className={in_turn ? 'player-name in-turn' : 'player-name'}>{name}</span>:{' '}
      <span className="count-badge">{card_count} cards</span>
      {can_be_caught && <button className="catch-button" onClick={onCatch}>Catch UNO!</button>}
    </div>
  )
}
