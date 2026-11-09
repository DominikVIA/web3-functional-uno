import type {Card} from './deck'
import {standardRandomizer, standardShuffler} from '../utils/random_utils'
import type {Randomizer, Shuffler} from '../utils/random_utils'
import {createRound, hasEnded, score as roundScore, winner as roundWinner} from './round'
import type {RoundState} from './round'

export type Game = Readonly<{
    playerCount: number
    players: ReadonlyArray<string>
    targetScore: number
    scores: ReadonlyArray<number>
    winner: number | undefined
    currentRound: RoundState | undefined
    cardsPerPlayer: number
    randomizer: Randomizer
    shuffler: Shuffler<Card>
}>

export type GameConfig = {
    players?: string[]
    targetScore?: number
    randomizer?: Randomizer
    shuffler?: Shuffler<Card>
    cardsPerPlayer?: number
}

const startRound = (g: Pick<Game, 'players' | 'randomizer' | 'shuffler' | 'cardsPerPlayer'>): RoundState =>
    createRound({
        players: [...g.players],
        dealer: g.randomizer(g.players.length),
        shuffler: g.shuffler,
        cardsPerPlayer: g.cardsPerPlayer
    })

export const createGame = ({
                               players = ['A', 'B'],
                               targetScore = 500,
                               randomizer = standardRandomizer,
                               shuffler = standardShuffler,
                               cardsPerPlayer = 7
                           }: GameConfig = {}): Game => {
    if (players.length < 2 || targetScore <= 0) throw Error('Invalid game')

    const base = {
        playerCount: players.length,
        players,
        targetScore,
        scores: players.map(() => 0),
        winner: undefined,
        cardsPerPlayer,
        randomizer,
        shuffler
    }
    return {...base, currentRound: startRound(base)}
}

const settle = (game: Game, round: RoundState): Game => {
    if (!hasEnded(round)) return {...game, currentRound: round}

    const w = roundWinner(round)!
    const points = roundScore(round)!
    const scores = game.scores.map((s, i) => i === w ? s + points : s)

    return scores[w] >= game.targetScore
        ? {...game, scores, winner: w, currentRound: undefined}
        : {...game, scores, currentRound: startRound(game)}
}

export const play = (f: (r: RoundState) => RoundState, game: Game): Game => {
    if (game.currentRound === undefined) throw Error('Game ended')
    return settle(game, f(game.currentRound))
}