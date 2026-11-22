import { useState } from 'react'
import type { Card as CardType, Color } from 'uno-model/src/model/deck'
import { is_wild } from '../model/game'
import Card from './Card'
import ColorPicker from './ColorPicker'

type Props = {
  hand: ReadonlyArray<CardType>
  playable: ReadonlyArray<boolean>
  can_draw: boolean
  can_say_uno: boolean
  onPlay: (card_pos: number, color?: Color) => void
  onDraw: () => void
  onSayUno: () => void
}

// The only state kept here is the one the server does not know about: "I clicked a wild card
// and now have to pick its colour". Everything else comes in as props.
export default function PlayerHand({ hand, playable, can_draw, can_say_uno, onPlay, onDraw, onSayUno }: Props) {
  const [pending_wild, set_pending_wild] = useState<number | undefined>(undefined)

  const select = (index: number) => {
    if (!playable[index]) return
    if (is_wild(hand[index])) set_pending_wild(index)
    else onPlay(index)
  }

  const pick_color = (color: Color) => {
    if (pending_wild === undefined) return
    onPlay(pending_wild, color)
    set_pending_wild(undefined)
  }

  return (
    <div className="human-turn">
      <h2>Your hand</h2>

      {can_say_uno && <>
        <p className="uno-message">Two cards left? Say "UNO" before you play one!</p>
        <button className="uno-button" onClick={onSayUno}>Say UNO!</button>
      </>}

      <div className="hand">
        {hand.map((card, index) =>
          // index as key is fine: a hand is a position-based list, the server addresses cards by position
          <Card key={index} card={card} disabled={!playable[index]} onClick={() => select(index)} />)}
      </div>

      {pending_wild !== undefined && <ColorPicker onSelect={pick_color} />}

      <button disabled={!can_draw} onClick={onDraw}>Draw Card</button>
    </div>
  )
}
