import fp from 'lodash/fp'
import {
    add,
    canPlayCard,
    cardPoints,
    colors,
    createDeck,
    createInitialDeck,
    deal,
    shuffle,
    top
} from './deck'
import type {Card, Color, Deck, WildCard} from './deck'
import {standardShuffler} from '../utils/random_utils'
import type {Shuffler} from '../utils/random_utils'

export type Direction = 'clockwise' | 'counterclockwise'
type Hand = ReadonlyArray<Card>

export type RoundState = Readonly<{
    players: ReadonlyArray<string>
    hands: ReadonlyArray<Hand>
    drawPile: Deck
    discardPile: Deck
    currentColor: Color
    currentDirection: Direction
    dealer: number
    playerInTurn: number | undefined
    winnerIndex: number | undefined
    said: ReadonlyArray<number>      // was Set<number>
    missed: ReadonlyArray<number>    // was Set<number>
    activeUno: number | undefined
    shuffler: Shuffler<Card>
}>

const mod = (n: number, d: number) => ((n % d) + d) % d
const inRange = (i: number, n: number) => Number.isInteger(i) && i >= 0 && i < n
const isColor = (x: unknown): x is Color => (colors as readonly unknown[]).includes(x)
const isWild = (c: Card): c is WildCard => c.type === 'WILD' || c.type === 'WILD DRAW FOUR'
const penalty = (c: Card) => c.type === 'DRAW TWO' ? 2 : c.type === 'WILD DRAW FOUR' ? 4 : 0

const insert = (x: number) => (xs: ReadonlyArray<number>) => xs.includes(x) ? xs : [...xs, x]
const remove = (x: number) => (xs: ReadonlyArray<number>) => xs.filter(n => n !== x)

export const playerCount = (r: RoundState) => r.players.length

const requirePlayer = (i: number, r: RoundState) => {
    if (!inRange(i, playerCount(r))) throw Error('Player out of bounds')
}
const requireTurn = (r: RoundState): number => {
    if (r.playerInTurn === undefined) throw Error('Round ended')
    return r.playerInTurn
}

const modifyHand = (p: number, f: (h: Hand) => Hand) => (r: RoundState): RoundState =>
    ({...r, hands: r.hands.map((h, i) => i === p ? f(h) : h)})

const nextPlayer = (n: number) => (r: RoundState): number | undefined =>
    r.playerInTurn === undefined
        ? undefined
        : mod(r.playerInTurn + (r.currentDirection === 'clockwise' ? n : -n), playerCount(r))

const advance = (n = 1) => (r: RoundState): RoundState =>
    ({...r, playerInTurn: nextPlayer(n)(r)})

const flipDirection = (r: RoundState): RoundState =>
    ({...r, currentDirection: r.currentDirection === 'clockwise' ? 'counterclockwise' : 'clockwise'})

const legal = (r: RoundState, card: Card, hand: Hand) =>
    canPlayCard(r.currentColor, top(r.discardPile)!, hand, card)

const recycle = (r: RoundState): RoundState => {
    if (r.drawPile.length > 0 || r.discardPile.length <= 1) return r
    const [topCard, ...rest] = r.discardPile.cards
    return {
        ...r,
        drawPile: shuffle(r.shuffler, createDeck(rest)),
        discardPile: createDeck([topCard])
    }
}

const takeOne = (p: number) => (r0: RoundState): RoundState => {
    const r = recycle(r0)
    const {card, deck} = deal(r.drawPile)
    return card === undefined
        ? r
        : modifyHand(p, h => [...h, card])({...r, drawPile: deck})
}

const take = (n: number, p: number) => (r: RoundState): RoundState =>
    fp.range(0, n).reduce(acc => takeOne(p)(acc), r)

const penalise = (n: number) => (r: RoundState): RoundState => {
    const victim = nextPlayer(1)(r)
    return n === 0 || victim === undefined ? r : take(n, victim)(r)
}

const resetTurnCleanup = (p: number) => (r: RoundState): RoundState => ({
    ...r,
    said: r.said.filter(n => n === p),
    ...(r.activeUno !== undefined && r.activeUno !== p
        ? {missed: remove(r.activeUno)(r.missed), activeUno: undefined}
        : {})
})

const trackUno = (p: number, forgot: boolean) => (r: RoundState): RoundState => ({
    ...r,
    said: remove(p)(r.said),
    missed: forgot ? insert(p)(r.missed) : remove(p)(r.missed),
    activeUno: forgot ? p : r.activeUno
})

export const sayUno = (i: number, round: RoundState): RoundState => {
    requirePlayer(i, round)
    requireTurn(round)
    return {...round, said: insert(i)(round.said), missed: remove(i)(round.missed)}
}

export const checkUnoFailure = (
    {accuser, accused}: { accuser: number, accused: number },
    round: RoundState
): boolean => {
    requirePlayer(accused, round)
    requirePlayer(accuser, round)
    return round.missed.includes(accused)
}

export const catchUnoFailure = (
    accusation: { accuser: number, accused: number },
    round: RoundState
): RoundState =>
    checkUnoFailure(accusation, round)
        ? fp.flow(
            (r: RoundState): RoundState => ({...r, missed: remove(accusation.accused)(r.missed)}),
            take(4, accusation.accused)
        )(round)
        : round

const layCard = (card: Card, color: Color | undefined) => (r: RoundState): RoundState => ({
    ...r,
    discardPile: add(card, r.discardPile),
    currentColor: isWild(card) ? color! : card.color
})

const endRound = (card: Card, p: number) => (r: RoundState): RoundState => ({
    ...penalise(penalty(card))(r),
    playerInTurn: undefined,
    winnerIndex: p
})

const afterPlay = (card: Card) => (r: RoundState): RoundState => {
    const twoPlayers = playerCount(r) === 2
    switch (card.type) {
        case 'REVERSE':
            return fp.flow(flipDirection, advance(twoPlayers ? 0 : 1))(r)
        case 'SKIP':
            return advance(twoPlayers ? 0 : 2)(r)
        case 'DRAW TWO':
        case 'WILD DRAW FOUR':
            return fp.flow(penalise(penalty(card)), advance(2))(r)
        default:
            return advance()(r)
    }
}

export const play = (index: number, color: Color | undefined, round: RoundState): RoundState => {
    const p = requireTurn(round)
    const hand = round.hands[p]
    if (!inRange(index, hand.length)) throw Error('Card out of bounds')

    const card = hand[index]
    const colorOk = isWild(card) ? isColor(color) : color === undefined
    if (!colorOk || !legal(round, card, hand)) throw Error('Illegal play')

    const remaining = hand.filter((_c, i) => i !== index)
    const forgotUno = remaining.length === 1 && !round.said.includes(p)

    return fp.flow(
        resetTurnCleanup(p),
        modifyHand(p, () => remaining),
        layCard(card, color),
        trackUno(p, forgotUno),
        remaining.length === 0 ? endRound(card, p) : afterPlay(card)
    )(round)
}

export const draw = (round: RoundState): RoundState => {
    const p = requireTurn(round)
    const drawn = fp.flow(resetTurnCleanup(p), take(1, p), recycle)(round)
    const gotCard = drawn.hands[p].length > round.hands[p].length
    const playable = gotCard && legal(drawn, drawn.hands[p][drawn.hands[p].length - 1], drawn.hands[p])
    return playable ? drawn : advance()(drawn)
}

export const canPlay = (index: number, round: RoundState): boolean => {
    const p = round.playerInTurn
    if (p === undefined || !inRange(index, round.hands[p].length)) return false
    return legal(round, round.hands[p][index], round.hands[p])
}

export const canPlayAny = (round: RoundState): boolean => {
    const p = round.playerInTurn
    return p !== undefined && round.hands[p].some(c => legal(round, c, round.hands[p!]))
}

export const hasEnded = (round: RoundState): boolean => round.winnerIndex !== undefined

export const winner = (round: RoundState): number | undefined => round.winnerIndex

export const score = (round: RoundState): number | undefined =>
    hasEnded(round) ? round.hands.flat().reduce((s, c) => s + cardPoints(c), 0) : undefined

export const topOfDiscard = (round: RoundState): Card | undefined =>
    top(round.discardPile)

type RoundConfig = {
    players: string[]
    dealer: number
    shuffler?: Shuffler<Card>
    cardsPerPlayer?: number
}

const dealMany = (n: number, deck: Deck) => ({
    cards: deck.cards.slice(0, n),
    deck: createDeck(deck.cards.slice(n))
})

const pickStarter = (deck: Deck, shuffler: Shuffler<Card>): { card: Card, deck: Deck } => {
    const {card, deck: rest} = deal(deck)
    if (card === undefined) throw Error('Deck exhausted')
    return isWild(card)
        ? pickStarter(shuffle(shuffler, add(card, rest)), shuffler)
        : {card, deck: rest}
}

const starterTurn = (c: Card, dealer: number, n: number) =>
    mod(dealer + (c.type === 'REVERSE' ? -1 : c.type === 'SKIP' ? 2 : 1), n)

export const createRound = (
    {players, dealer, shuffler = standardShuffler, cardsPerPlayer = 7}: RoundConfig
): RoundState => {
    if (players.length < 2 || players.length > 10 || dealer < 0 || dealer >= players.length) {
        throw Error('Invalid round')
    }

    const {hands, deck: afterDeal} = players.reduce(
        (acc: { hands: Card[][], deck: Deck }) => {
            const {cards, deck} = dealMany(cardsPerPlayer, acc.deck)
            return {hands: [...acc.hands, [...cards]], deck}
        },
        {hands: [], deck: shuffle(shuffler, createInitialDeck())}
    )

    const {card: starter, deck: drawPile} = pickStarter(afterDeal, shuffler)
    const first = starterTurn(starter, dealer, players.length)

    const initial: RoundState = {
        players,
        hands,
        drawPile,
        discardPile: createDeck([starter]),
        currentColor: 'color' in starter ? starter.color : 'BLUE',
        currentDirection: 'clockwise',
        dealer,
        playerInTurn: first,
        winnerIndex: undefined,
        said: [],
        missed: [],
        activeUno: undefined,
        shuffler
    }

    return starter.type === 'DRAW TWO'
        ? fp.flow(take(2, first), advance())(initial)
        : initial
}