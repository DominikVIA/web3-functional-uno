import { describe, it, test, expect, beforeEach, jest } from '@jest/globals'
import { createRound, createInitialDeck} from '../utils/test_adapter'
import { canPlayAny, draw, Round, play, topOfDiscard } from '../../src/model/round'
import { deterministicShuffle as deterministicShuffler, noShuffle, shuffleBuilder, successiveShufflers } from '../utils/shuffling'
import { is } from '../utils/predicates'
import { standardShuffler } from '../../src/utils/random_utils'

describe("Playing a card", () => {
  it("throws on illegal plays", () => {
    const shuffler = shuffleBuilder()
      .discard()
        .is({type: 'NUMBERED', color: 'BLUE', number: 6})
      .hand(0)
        .is({type: 'NUMBERED', color: 'RED', number: 3})
      .build()
    const round: Round = createRound({players: ['a', 'b', 'c', 'd'], dealer: 3, shuffler})
    expect(() => play(0, undefined, round)).toThrow()
  })

  describe("Playing a numbered card", () => {
    const builder = shuffleBuilder()
      .discard()
        .is({type: 'NUMBERED', color: 'BLUE', number: 6})
      .hand(0)
        .is({type: 'NUMBERED', color: 'BLUE', number: 3})
    let round = createRound({players: ['a', 'b', 'c', 'd'], dealer: 3, shuffler: builder.build()})
    beforeEach(() => {
      round = createRound({players: ['a', 'b', 'c', 'd'], dealer: 3, shuffler: builder.build()})
    })
    it("removes the card from the players hand", () => {
      round = play(0, undefined, round)
      expect(round.hands[0].length).toEqual(6)
    })
    it("places the card on the discard pile", () => {
      const card = round.hands[round.playerInTurn!][0]
      round = play(0, undefined, round)
      expect(topOfDiscard(round)).toEqual(card)
    })
    it("moves the action to the next hand", () => {
      expect(round.playerInTurn).toEqual(0)
      round = play(0, undefined, round)
      expect(round.playerInTurn).toEqual(1)
    })
    it("changes color to the played color", () => {
      const shuffler = shuffleBuilder()
        .discard()
          .is({ type: 'NUMBERED', color: 'BLUE', number: 6 })
        .hand(0)
          .is({ type: 'NUMBERED', color: 'RED', number: 6 })
        .build()
      let round: Round = createRound({players: ['a', 'b', 'c', 'd'], dealer: 3, shuffler})
      round = play(0, undefined, round)
      expect(round.currentColor).toEqual('RED')
    })
  })

  describe("Playing a skip card", () => {
    it("skips the next player", () => {
      const shuffler = shuffleBuilder()
        .discard()
          .is({type: 'NUMBERED', color: 'BLUE', number: 6})
        .hand(0)
          .is({type: 'SKIP', color: 'BLUE'})
        .build()
      let round: Round = createRound({players: ['a', 'b', 'c', 'd'], dealer: 3, shuffler})
      expect(round.playerInTurn).toEqual(0)
      round = play(0, undefined, round)
      expect(round.playerInTurn).toEqual(2)
    })
  })

  describe("Playing a reverse card", () => {
    let builder = shuffleBuilder()
    beforeEach(() => {
      builder = shuffleBuilder()
        .discard()
          .is({type: 'NUMBERED', color: 'BLUE', number: 6})
        .hand(0)
          .is({type: 'REVERSE', color: 'BLUE'})
    })
    it("reverses the direction of play", () => {
      let round = createRound({players: ['a', 'b', 'c', 'd'], dealer: 3, shuffler: builder.build()})
      expect(round.playerInTurn).toEqual(0)
      round = play(0, undefined, round)
      expect(round.playerInTurn).toEqual(3)
    })
    it("makes the reversing persistent", () => {
      builder.hand(3).is({type: 'NUMBERED', color: 'BLUE'})
      let round = createRound({players: ['a', 'b', 'c', 'd'], dealer: 3, shuffler: builder.build()})
      expect(round.playerInTurn).toEqual(0)
      round = play(0, undefined, round)
      round = play(0, undefined, round)
      expect(round.playerInTurn).toEqual(2)
    })
    it("reverses the reversing", () => {
      builder
        .hand(3)
          .is({type: 'NUMBERED', color: 'BLUE'})
        .hand(2)
          .is({type: 'REVERSE', color: 'BLUE'})
      let round = createRound({players: ['a', 'b', 'c', 'd'], dealer: 3, shuffler: builder.build()})
      expect(round.playerInTurn).toEqual(0)
      round = play(0, undefined, round)
      round = play(0, undefined, round)
      round = play(0, undefined, round)
      expect(round.playerInTurn).toEqual(3)
    })
  })

  describe("Playing a draw card", () => {
    const builder = shuffleBuilder()
      .discard()
        .is({type: 'NUMBERED', color: 'BLUE', number: 6})
      .hand(0)
        .is({type: 'DRAW', color: 'BLUE'})
    let round = createRound({players: ['a', 'b', 'c', 'd'], dealer: 3, shuffler: builder.build()})
    beforeEach(() => {
      round = createRound({players: ['a', 'b', 'c', 'd'], dealer: 3, shuffler: builder.build()})
    })
    it("skips the next player", () => {
      expect(round.playerInTurn).toEqual(0)
      round = play(0, undefined, round)
      expect(round.playerInTurn).toEqual(2)
    })
    it("gives the next player 2 cards", () => {
      round = play(0, undefined, round)
      expect(round.hands[1].length).toEqual(9)
    })
    it("takes the 2 cards from the draw pile", () => {
      const pileSize = round.drawPile.length
      round = play(0, undefined, round)
      expect(round.drawPile.length).toEqual(pileSize - 2)
    })
  })

  describe("Playing a wild card", () => {
    let builder = shuffleBuilder()
    beforeEach(() => {
      builder = shuffleBuilder()
        .discard()
          .is({type: 'NUMBERED', color: 'BLUE', number: 6})
        .hand(0)
          .is({type: 'WILD'})
    })
    it("moves the action to the next hand", () => {
      let round: Round = createRound({players: ['a', 'b', 'c', 'd'], dealer: 3, shuffler: builder.build()})
      expect(round.playerInTurn).toEqual(0)
      round = play(0, 'RED', round)
      expect(round.playerInTurn).toEqual(1)
    })
    it("changes color to the chosen color", () => {
      builder.hand(1).is({color: 'RED'})
      let round: Round = createRound({players: ['a', 'b', 'c', 'd'], dealer: 3, shuffler: builder.build()})
      round = play(0, 'RED', round)
      expect(round.currentColor).toEqual('RED')
    })
  })

  describe("Playing a wild draw card", () => {
    let builder = shuffleBuilder()
    beforeEach(() => {
      builder = shuffleBuilder()
        .discard()
          .is({type: 'NUMBERED', color: 'BLUE', number: 6})
        .hand(0)
          .is({type: 'WILD DRAW'})
        .repeat(6).isnt({color: 'BLUE'})
    })
    it("skips the next player", () => {
      let round: Round = createRound({players: ['a', 'b', 'c', 'd'], dealer: 3, shuffler: builder.build()})
      expect(round.playerInTurn).toEqual(0)
      round = play(0, 'RED', round)
      expect(round.playerInTurn).toEqual(2)
    })
    it("gives the next player 4 cards", () => {
      const shuffler = builder.build()
      let round: Round = createRound({players: ['a', 'b', 'c', 'd'], dealer: 3, shuffler})
      round = play(0, 'RED', round)
      expect(round.hands[1].length).toEqual(11)
    })
    it("takes the 4 cards from the draw pile", () => {
      const shuffler = builder.build()
      let round: Round = createRound({players: ['a', 'b', 'c', 'd'], dealer: 3, shuffler})
      const pileSize = round.drawPile.length
      round = play(0, 'RED', round)
      expect(round.drawPile.length).toEqual(pileSize - 4)
    })
    it("changes color to the chosen color", () => {
      builder.hand(2).is({color: 'RED'})
      const shuffler = builder.build()
      let round: Round = createRound({players: ['a', 'b', 'c', 'd'], dealer: 3, shuffler})
      round = play(0, 'RED', round)
      expect(round.currentColor).toEqual('RED')
    })
  })

  describe("Boundaries", () => {
    it("is illegal to play a non-existant card", () => {
      const round = createRound({players: ['a', 'b', 'c', 'd'], dealer: 3}) 
      expect(() => play(-1, undefined, round)).toThrow()
      expect(() => play(7, undefined, round)).toThrow()
    })
    it("is illegal to name a color on a colored card", () => {
      const shuffler = shuffleBuilder()
        .discard()
          .is({type: 'NUMBERED', color: 'BLUE'})
        .hand(0)
          .is({color: 'BLUE'})
        .build()
      const round: Round = createRound({players: ['a', 'b', 'c', 'd'], dealer: 3, shuffler})
      expect(() => play(0, "YELLOW", round)).toThrow()
    })
    it("is illegal _not_ to name a color on a wild card", () => {
      const shuffler = shuffleBuilder()
        .discard()
          .is({type: 'NUMBERED', color: 'BLUE'})
        .hand(0)
          .is({type: 'WILD'})
        .build()
      const round: Round = createRound({players: ['a', 'b', 'c', 'd'], dealer: 3, shuffler})
      expect(() => play(0, undefined, round)).toThrow()
    })
    it("is illegal _not_ to name a color on a wild draw card", () => {
      const shuffler = shuffleBuilder()
        .discard()
          .is({type: 'NUMBERED', color: 'BLUE'})
        .hand(0)
          .is({type: 'WILD DRAW'})
          .repeat(6).isnt({color: 'BLUE'})
        .build()
      const round: Round = createRound({players: ['a', 'b', 'c', 'd'], dealer: 3, shuffler})
      expect(() => play(0, undefined, round)).toThrow()
    })
  })
})

describe("Drawing a card", () => {
  describe("can play any", () => {
    it("returns true if the player has a playable card", () => {
      const shuffler = shuffleBuilder()
        .discard()
          .is({type: 'NUMBERED', color: 'BLUE'})
        .hand(0)
          .is({color: 'BLUE'})
        .build()
      const round: Round = createRound({players: ['a', 'b', 'c', 'd'], dealer: 3, shuffler})
      expect(canPlayAny(round)).toBeTruthy()
    })
    it("returns false if the player has a playable card", () => {
      const shuffler = shuffleBuilder()
        .discard()
          .is({type: 'NUMBERED', color: 'BLUE', number: 0})
        .hand(0)
          .is({type: 'NUMBERED', color: 'RED', number: 1})
          .is({type: 'NUMBERED', color: 'YELLOW', number: 2})
          .is({type: 'NUMBERED', color: 'RED', number: 3})
          .is({type: 'NUMBERED', color: 'GREEN', number: 4})
          .is({type: 'SKIP', color: 'RED'})
          .is({type: 'REVERSE', color: 'GREEN'})
          .is({type: 'DRAW', color: 'YELLOW'})
        .build()
      const round: Round = createRound({players: ['a', 'b', 'c', 'd'], dealer: 3, shuffler})
      expect(canPlayAny(round)).toBeFalsy()
    })
  })

  describe("draw", () => {
    let builder = shuffleBuilder()
    beforeEach(() => {
      builder = shuffleBuilder()
      .discard()
        .is({type: 'NUMBERED', color: 'BLUE', number: 0})
      .hand(0)
        .is({type: 'NUMBERED', color: 'RED', number: 1})
        .is({type: 'NUMBERED', color: 'YELLOW', number: 2})
        .is({type: 'NUMBERED', color: 'RED', number: 3})
        .is({type: 'NUMBERED', color: 'GREEN', number: 4})
        .is({type: 'SKIP', color: 'RED'})
        .is({type: 'REVERSE', color: 'GREEN'})
        .is({type: 'DRAW', color: 'YELLOW'})    
    })
    it("adds the drawn card to the hand", () => {
      const shuffler = builder.build()
      let round = createRound({players: ['a', 'b', 'c', 'd'], dealer: 3, shuffler})
      round = draw(round)
      expect(round.hands[0].length).toEqual(8)
    })
    it("adds the top of the draw pile to the end of the hand", () => {
      const shuffler = builder
        .drawPile().is({type: 'DRAW', color: 'GREEN'})
        .build()
      let round = createRound({players: ['a', 'b', 'c', 'd'], dealer: 3, shuffler})
      round = draw(round)
      expect(
        is({type: 'DRAW', color: 'GREEN'})(round.hands[0][7])
      ).toBeTruthy()
    })
    it("moves to the next player if the card is unplayable", () => {
      const shuffler = builder
        .drawPile().is({type: 'DRAW', color: 'GREEN'})
        .build()
      let round = createRound({players: ['a', 'b', 'c', 'd'], dealer: 3, shuffler})
      round = draw(round)
      expect(round.playerInTurn).toBe(1)
    })
    it("doesn't move to the next player if the card is unplayable", () => {
      const shuffler = builder
        .drawPile().is({type: 'DRAW', color: 'BLUE'})
        .build()
      let round = createRound({players: ['a', 'b', 'c', 'd'], dealer: 3, shuffler})
      round = draw(round)
      expect(round.playerInTurn).toBe(0)
    })
  })

  describe("drawing the last card", () => {
    describe("succesive play", () => {
      const firstShuffler = shuffleBuilder({players: 4, cardsPerPlayer: 1})
        .discard()
        . is({type: 'NUMBERED', color: 'BLUE', number: 8})
        .drawPile()
          .is({type: 'SKIP', color: 'BLUE'})
          .is({type: 'NUMBERED', color: 'YELLOW', number: 3})
        .hand(0)
          .is({type: 'NUMBERED', color: 'GREEN', number: 4})
        .hand(1)
          .is({type: 'WILD'})
        .hand(2)
          .is({type: 'NUMBERED', color: 'GREEN', number: 8})
        .hand(3)
          .is({type: 'NUMBERED', color: 'GREEN', number: 0}).build()
      const cards = firstShuffler(createInitialDeck()).slice(0, 7)
      let round: Round = undefined as any
      beforeEach(() => {
        const shuffler = successiveShufflers(deterministicShuffler(cards), standardShuffler)
        round = createRound({players: ['a', 'b', 'c', 'd'], dealer: 3, shuffler, cardsPerPlayer: 1})
      })
      it("begins with player 0 drawing a playable card", () => {
        round = draw(round)
        expect(round.hands[0].length).toEqual(2)
        expect(round.playerInTurn).toEqual(0)
      })
      it("proceeds with player 0 playing the drawn card, skipping player 1", () => {
        round = draw(round)
        round = play(1, undefined, round)
        expect(round.hands[0].length).toEqual(1)
        expect(round.playerInTurn).toEqual(2)
      })
      it("proceeds with player drawing an unplayable card", () => {
        round = draw(round)
        round = play(1, undefined, round)
        round = draw(round)
        expect(round.hands[2].length).toEqual(2)
        expect(round.playerInTurn).toEqual(3)
      })
      it("proceeds with shuffling to create a new draw pile", () => {
        const mockShuffler = jest.fn(noShuffle)
        const shuffler = successiveShufflers(deterministicShuffler(cards), mockShuffler)
        let round = createRound({players: ['a', 'b', 'c', 'd'], dealer: 3, shuffler, cardsPerPlayer: 1})
        round = draw(round)
        round = play(1, undefined, round)
        round = draw(round)
        expect(mockShuffler).toHaveBeenCalledTimes(1)
      })
      it("retains the top card of the discard pile", () => {
        round = draw(round)
        round = play(1, undefined, round)
        const top = topOfDiscard(round)
        round = draw(round)
        expect(topOfDiscard(round)).toEqual(top)
      })
      it("leaves only the top card in the discard pile", () => {
        round = draw(round)
        round = play(1, undefined, round)
        round = draw(round)
        expect(round.discardPile.length).toEqual(1)
      })
      it("adds cards in the draw pile", () => {
        round = draw(round)
        round = play(1, undefined, round)
        round = draw(round)
        expect(round.drawPile.length).toEqual(1)
      })
      it("leaves the cards removed from the discard pile in the draw pile", () => {
        const card = topOfDiscard(round)
        round = draw(round)
        round = play(1, undefined, round)
        round = draw(round)
        round = draw(round)
        expect(round.hands[3][1]).toEqual(card)
      })
    })
  })

  describe("when drawing because of a card", () => {
    const shuffler1 = shuffleBuilder({players: 4, cardsPerPlayer: 1})
      .discard()
        .is({type: 'NUMBERED', color: 'BLUE', number: 8})
      .drawPile()
        .is({type: 'NUMBERED', color: 'BLUE'})
        .is({type: 'DRAW', color: 'BLUE'})
      .hand(0)
        .is({type: 'SKIP', color: 'GREEN'})
      .hand(1)
        .is({type: 'REVERSE', color: 'YELLOW'})
      .build()
    const cards = shuffler1(createInitialDeck()).slice(0, 8)
    const shuffler = successiveShufflers(deterministicShuffler(cards), standardShuffler)
    let round = createRound({players: ['a', 'b', 'c', 'd'], dealer: 3, shuffler, cardsPerPlayer: 1})
    test("playing", () => {
      round = draw(round)
      round = play(1, undefined, round)
      round = draw(round)
      expect(round.playerInTurn).toBe(1)
      expect(round.hands[1][1].type).toEqual('DRAW')
      expect(round.drawPile.length).toEqual(1)
      round = play(1, undefined, round)
      expect(round.hands[2].length).toEqual(3)
      expect(round.discardPile.length).toEqual(1)
      expect(round.drawPile.length).toEqual(1)
    })
  })
})

describe("special 2-player rules", () => {
  test("playing a reverse card works as a skip card", () => {
    const shuffler = shuffleBuilder({players: 2, cardsPerPlayer: 7})
      .discard().is({type:'NUMBERED', color: 'BLUE'})
      .hand(0).is({type: 'REVERSE', color: 'BLUE'})
      .build()
    let round = createRound({players: ['a', 'b'], dealer: 1, shuffler})
    expect(round.playerInTurn).toEqual(0)
    round = play(0, undefined, round)
    expect(round.playerInTurn).toEqual(0)
  })
})
