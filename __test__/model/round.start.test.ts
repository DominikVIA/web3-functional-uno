import { describe, it, expect, jest } from '@jest/globals'
import { createRound, createInitialDeck} from '../utils/test_adapter'
import { Round } from '../../src/model/round'
import { shuffleBuilder } from '../utils/shuffling'
import { deterministicShuffle, noShuffle, successiveShufflers } from '../utils/shuffling'
import * as _ from 'lodash'

const normalShuffle = shuffleBuilder()
.discard()
.isnt({type: ['DRAW', 'REVERSE', 'SKIP', 'WILD', 'WILD DRAW']})
.build()

describe("Round set up", () => {
  const initialDeck = createInitialDeck()
  const dealtCardsCount = 4 * 7
  const cards = normalShuffle(initialDeck)
  const round = createRound({players: ['a', 'b', 'c', 'd'], dealer: 1, shuffler: deterministicShuffle(cards)})
  it("has as many players as set in the properties", () => {
    expect(round.playerCount).toBe(4)
  })
  it("has the players set in the properties", () => {
    expect(round.players).toEqual(['a', 'b', 'c', 'd'])
  })
  it("requires at least 2 players", () => {
    expect(() => createRound({players: ['a'], dealer: 1})).toThrow()
  })
  it("allows at most 10 players", () => {
    expect(() => createRound({players: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'], dealer: 1})).toThrow()
  })
  it("selects dealer set in the properties", () => {
    expect(round.dealer).toBe(1)
  })
  it("shuffles the deck", () => {
    const mockShuffler = jest.fn(noShuffle)
    createRound({players: ['a', 'b', 'c', 'd'], dealer: 1, shuffler: mockShuffler})
    expect(mockShuffler).toBeCalledTimes(1)
  })
  it("deals 7 cards to each player", () => {
    round.hands.forEach(hand => expect(hand.length).toEqual(7))
  })
  it("deals 7 cards to each player from the top of the deck", () => {
    const cards = normalShuffle(initialDeck)
    const round = createRound({players: ['a', 'b', 'c', 'd'], dealer: 3, shuffler: deterministicShuffle(cards)})
    round.hands.forEach((hand, playerIndex) => expect(hand).toEqual(cards.slice(7 * playerIndex, 7 * (playerIndex + 1))))
  })
  it("creates a discard pile with the top card", () => {
    const undealtCards = cards.slice(dealtCardsCount)  
    expect(round.discardPile).toEqual(undealtCards.slice(0, 1))
  })
  it("keeps the undealt cards in the draw pile", () => {
    const undealtCards = cards.slice(dealtCardsCount)    
    expect(round.drawPile).toEqual(undealtCards.slice(1))
  })
  it("reshuffles if the top of the discard pile is a wild card", () => {
    const wildOnDiscardTop = shuffleBuilder().discard().is({type: 'WILD'}).build()
    const wildNotOnTop = shuffleBuilder().top().isnt({type: ['WILD', 'WILD DRAW']}).build()
    const mockShuffler = jest.fn(wildNotOnTop)
    const shuffler = successiveShufflers(wildOnDiscardTop, mockShuffler)
    createRound({players: ['a', 'b', 'c', 'd'], dealer: 1, shuffler})
    expect(mockShuffler).toBeCalledTimes(1)
  })
  it("keeps shuffling as long as the top of the discard pile is a wild card", () => {
    const wildOnDiscardTop = shuffleBuilder().discard().is({type: 'WILD'}).build()
    const wildOnTop = shuffleBuilder().top().is({type: 'WILD'}).build()
    const wildNotOnTop = shuffleBuilder().top().isnt({type: ['WILD', 'WILD DRAW']}).build()
    const mockShuffler = jest.fn(wildNotOnTop)
    const shuffler = successiveShufflers(wildOnDiscardTop, wildOnTop, mockShuffler)
    createRound({players: ['a', 'b', 'c', 'd'], dealer: 1, shuffler})
    expect(mockShuffler).toBeCalledTimes(1)
  })
  it("reshuffles if the top of the discard pile is a wild draw 4 card", () => {
    const wildDrawOnDiscardTop = shuffleBuilder().discard().is({type: 'WILD DRAW'}).build()
    const wildNotOnTop = shuffleBuilder().top().isnt({type: ['WILD', 'WILD DRAW']}).build()
    const mockShuffler = jest.fn(wildNotOnTop)
    const shuffler = successiveShufflers(wildDrawOnDiscardTop, mockShuffler)
    createRound({players: ['a', 'b', 'c', 'd'], dealer: 1, shuffler})
    expect(mockShuffler).toBeCalledTimes(1)
  })
})

describe("Before first action in round", () => {
  it("begins with the player to the left of the dealer unless the top card is draw, reverse or skip", () => {
    const round: Round = createRound({players: ['a', 'b', 'c', 'd'], dealer: 1, shuffler: normalShuffle})
    expect(round.playerInTurn).toBe(2)
  })
  it("rolls over if the dealer is the last player", () => {
    const round: Round = createRound({players: ['a', 'b', 'c', 'd'], dealer: 3, shuffler: normalShuffle})
    expect(round.playerInTurn).toBe(0)
  })
  it("begins with the player to the right of the dealer if the top card is reverse", () => {
    const shuffler = shuffleBuilder().discard().is({type: 'REVERSE'}).build()
    const round: Round = createRound({players: ['a', 'b', 'c', 'd'], dealer: 1, shuffler})
    expect(round.playerInTurn).toBe(0)
  })
  it("rolls over if dealer is the first player and the top card is reverse", () => {
    const shuffler = shuffleBuilder().discard().is({type: 'REVERSE'}).build()
    const round: Round = createRound({players: ['a', 'b', 'c', 'd'], dealer: 0, shuffler})
    expect(round.playerInTurn).toBe(3)
  })
  it("begins with the player two places to the left of the dealer if the top card is skip", () => {
    const shuffler = shuffleBuilder().discard().is({type: 'SKIP'}).build()
    const round: Round = createRound({players: ['a', 'b', 'c', 'd'], dealer: 1, shuffler})
    expect(round.playerInTurn).toBe(3)
  })
  it("adds 2 cards to the hand of the first player if the top card is draw", () => {
    const shuffler = shuffleBuilder().discard().is({type: 'DRAW'}).build()
    const round: Round = createRound({players: ['a', 'b', 'c', 'd'], dealer: 1, shuffler})
    expect(round.hands[2].length).toBe(9)
  })
})
