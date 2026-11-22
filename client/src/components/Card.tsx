import type { Card as CardType } from 'uno-model/src/model/deck'

const label = (card: CardType): string =>
  card.type === 'NUMBERED' ? `${card.color} ${card.number}`
  : 'color' in card ? `${card.color} ${card.type}`
  : card.type   // WILD, WILD DRAW FOUR

type Props = { card: CardType, disabled?: boolean, onClick?: () => void }

export default function Card({ card, disabled = false, onClick }: Props) {
  const color_class = 'color' in card ? card.color.toLowerCase() : 'wild'
  return (
    <button className={`card ${color_class}`} disabled={disabled} onClick={onClick}>
      {label(card)}
    </button>
  )
}
