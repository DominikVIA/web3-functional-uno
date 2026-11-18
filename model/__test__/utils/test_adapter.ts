import { Shuffler, standardShuffler } from '../../src/utils/random_utils'
import * as deck from '../../src/model/deck'
import * as round from '../../src/model/round'
import * as uno from '../../src/model/uno'

export function createInitialDeck(): deck.Deck {
  return deck.createInitialDeck()
}

export type RoundProps = {
  players: string[]
  dealer: number
  shuffler?: Shuffler<deck.Card>
  cardsPerPlayer?: number
}

export function createRound({
    players, 
    dealer, 
    shuffler = standardShuffler,
    cardsPerPlayer = 7
  }: RoundProps): round.RoundState {
  return round.createRound({players, dealer, shuffler, cardsPerPlayer})
}

export function createGame(props: Partial<uno.GameConfig>): uno.Game {
  return uno.createGame(props)
}
