import type {GameAction} from '../dto/action'
import {colors, hasColor} from './deck'
import type {Card, Color} from './deck'
import {canPlay} from './round'
import type {RoundState} from './round'

// A bot is a pure function: round in, list of GameActions out. It speaks the same
// protocol as a human player; the dice roll is injected so it stays testable.
// It lives in the model because the SERVER owns opponents (the dummy transport just borrows it).

const isWild = (card: Card) => card.type === 'WILD' || card.type === 'WILD DRAW FOUR'

// the color the bot holds the most of (the first color if it holds none)
const dominantColor = (hand: ReadonlyArray<Card>): Color =>
    colors
        .map(color => ({color, count: hand.filter(card => hasColor(color, card)).length}))
        .reduce((best, next) => (next.count > best.count ? next : best))
        .color

const REMEMBERS_UNO = 0.75

export const chooseBotActions = (round: RoundState, random: () => number): GameAction[] => {
    const player = round.playerInTurn
    if (player === undefined) return []

    const hand = round.hands[player]
    const cardPos = hand.findIndex((_card, i) => canPlay(i, round))
    if (cardPos < 0) return [{type: 'draw'}]

    const remembersUno = hand.length === 2 && random() < REMEMBERS_UNO
    return [
        ...(remembersUno ? [{type: 'say-uno'} as const] : []),
        {type: 'play', cardPos, color: isWild(hand[cardPos]) ? dominantColor(hand) : undefined}
    ]
}
