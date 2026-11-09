import { describe, it, expect } from '@jest/globals'
import { createInitialDeck } from '../utils/test_adapter'
import * as deck from '../../src/model/deck'
import * as _ from 'lodash'

describe("Initial deck", () => {
  const initialDeck = createInitialDeck()
  it("contains 19 numbered blue cards", () => {
    expect(deck.filter(_.matches({type: 'NUMBERED', color: 'BLUE'}), initialDeck).length).toEqual(19)
  })
  it("contains 19 numbered green cards", () => {
    expect(deck.filter(_.matches({type: 'NUMBERED', color: 'GREEN'}), initialDeck).length).toEqual(19)
  })
  it("contains 19 numbered red cards", () => {
    expect(deck.filter(_.matches({type: 'NUMBERED', color: 'RED'}), initialDeck).length).toEqual(19)
  })
  it("contains 19 numbered yellow cards", () => {
    expect(deck.filter(_.matches({type: 'NUMBERED', color: 'YELLOW'}), initialDeck).length).toEqual(19)
  })
  it("only contains numbered card with numbers between 0 and 9", () => {
    const numberedDeck = deck.filter(card => card.type === 'NUMBERED', initialDeck)
    const numbers = numberedDeck.cards.map(card => card.number)
    expect(numbers.every(n => 0 <= n && n <= 9)).toBeTruthy()
  })
  it("contains numbered cards of every legal number and color", () => {
    const numberedDeck = deck.filter(card => card.type === 'NUMBERED', initialDeck).cards
    const numberedCardsByColor = _.groupBy(numberedDeck, card => card.color)
    _.forEach(numberedCardsByColor, cards => {
      const cardsByNumber = _.groupBy(cards, card => card.number)
      _.forEach(cardsByNumber, (cards, number) => {
          if (number === '0')
            expect(cards.length).toEqual(1)
          else
            expect(cards.length).toEqual(2)
         })
      })
  })
  it("contains 8 skip cards", () => {
    expect(deck.filter(_.matches({type: 'SKIP'}), initialDeck).length).toEqual(8)
  })
  it("contains 2 skip cards of each color", () => {
    const skipCards = deck.filter(card => card.type === 'SKIP', initialDeck).cards
    const skipCardsByColor = _.groupBy(skipCards, card => card.color)
    _.forEach(skipCardsByColor, cards => expect(cards.length).toEqual(2))
  })
  it("contains 8 reverse cards", () => {
    expect(deck.filter(_.matches({type: 'REVERSE'}), initialDeck).length).toEqual(8)
  })
  it("contains 2 reverse cards of each color", () => {
    const reverseCards = deck.filter(card => card.type === 'REVERSE', initialDeck).cards
    const reverseCardsByColor = _.groupBy(reverseCards, card => card.color)
    _.forEach(reverseCardsByColor, cards => expect(cards.length).toEqual(2))
  })
  it("contains 8 draw cards", () => {
    expect(deck.filter(_.matches({type: 'DRAW TWO'}), initialDeck).length).toEqual(8)
  })
  it("contains 2 draw cards of each color", () => {
    const drawCards = deck.filter(card => card.type === 'DRAW TWO', initialDeck).cards
    const drawCardsByColor = _.groupBy(drawCards, card => card.color)
    _.forEach(drawCardsByColor, cards => expect(cards.length).toEqual(2))
  })
  it("contains 4 wild cards", () => {
    expect(deck.filter(_.matches({type: 'WILD'}), initialDeck).length).toEqual(4)
  })
  it("contains 4 wild draw cards", () => {
    expect(deck.filter(_.matches({type: 'WILD DRAW FOUR'}), initialDeck).length).toEqual(4)
  })
  // Blank cards skipped, since they have no gameplay
  it("contains 108 cards", () => {
    expect(initialDeck.length).toEqual(108)
  })
})
