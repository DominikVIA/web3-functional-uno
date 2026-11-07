import { describe, it, test, expect } from '@jest/globals'
import { createGame } from '../utils/test_adapter'
import { shuffleBuilder, successiveShufflers } from '../utils/shuffling'
import { Game, play } from '../../src/model/uno'
import * as Round from '../../src/model/round'
import * as _ from 'lodash'

describe("Game set up", () => {
  const game: Game = createGame({players: ['a', 'b', 'c', 'd'], targetScore: 200})
  it("has as many players as set in the properties", () => {
    expect(game.playerCount).toEqual(4)
  })
  it("has the players set in the properties", () => {
    expect(game.players).toEqual(['a', 'b', 'c', 'd'])
  })
  it("has 'A' and 'B' as the default players", () => {
    const game: Game = createGame({})
    expect(game.playerCount).toEqual(2)
    expect(game.players).toEqual(['A', 'B'])
  })
  it("has the target score set in the properties", () => {
    expect(game.targetScore).toEqual(200)
  })
  it("has 500 as the default target score", () => {
    const game: Game = createGame({players: ['a', 'b', 'c', 'd']})
    expect(game.targetScore).toEqual(500)
  })
  it("starts with all players at 0 score", () => {
    expect(game.scores).toEqual([0, 0, 0, 0])
  })
  it("has no winner", () => {
    expect(game.winner).toBeUndefined();
  })
  it("requires at least 2 players", () => {
    expect(() => createGame({players: ['a']})).toThrow()
  })
  it("requires a target score of more than 0", () => {
    expect(() => createGame({players: ['a', 'b', 'c', 'd'], targetScore: 0})).toThrow()
  })
  it("starts a round", () => {
    expect(game.currentRound).toBeDefined()
  })
  it("selects a random player as dealer", () => {
    const game: Game = createGame({players: ['a', 'b', 'c', 'd'], randomizer: () => 1})
    expect(game.currentRound?.dealer).toEqual(1)
  })
})

const firstShuffle = shuffleBuilder({ players: 4, cardsPerPlayer: 1 })
  .discard().is({ type: 'NUMBERED', color: 'BLUE', number: 8 })
  .hand(0).is({ color: 'GREEN', type: 'DRAW' })
  .hand(1).is({ number: 8 })
  .hand(2).is({ type: 'WILD DRAW' })
  .hand(3).is({ number: 3 })
  .drawPile().is({ color: 'GREEN', number: 5 })
  .build()

describe("Playing a round", () => {
  const props = {
    players: ['a', 'b', 'c', 'd'],
    targetScore: 200,
    randomizer: () => 3,
    shuffler: firstShuffle,
    cardsPerPlayer: 1
  }
  const startGame = createGame(props)
  describe("while the round is still running", () => {
    const startingRound = startGame.currentRound!
    const game = play(Round.draw, startGame)
    test("no winner has been found", () => {
      expect(game.winner).toBeUndefined()
    })
    test("the score is unchanged", () => {
      expect(game.scores).toEqual([0, 0, 0, 0])
    })
    test("the round is the same", () => {
      expect(game.currentRound).toEqual(Round.draw(startingRound))
    })
  })
  describe("when the round is over", () => {
    const game = play(_.flow([Round.draw, _.partial(Round.play, 0, undefined)]), startGame)
    test("the game still has no winner", () => {
      expect(game.winner).toBeUndefined()
    })
    test("the score is updated", () => {
      expect(game.scores).toEqual([0, 78, 0, 0])
    })
    test("a new round is started", () => {
      expect(Round.hasEnded(game.currentRound!)).toBeFalsy
    })
  })
})

const secondShuffle = shuffleBuilder({ players: 4, cardsPerPlayer: 1 })
  .discard().is({ type: 'NUMBERED', color: 'BLUE', number: 8 })
  .hand(0).is({ color: 'YELLOW', number: 3 })
  .hand(1).is({ number: 8 })
  .hand(2).is({ color: 'GREEN', type: 'DRAW' })
  .hand(3).is({ type: 'WILD DRAW' })
  .drawPile().is({ type: 'NUMBERED', color: 'RED', number: 0})
  .build()

describe("ending the second round", () => {
  const props = {
    players: ['a', 'b', 'c', 'd'],
    targetScore: 200,
    randomizer: () => 3,
    shuffler: successiveShufflers(firstShuffle, secondShuffle),
    cardsPerPlayer: 1
  }
  const startGame = createGame(props)
  const game1 = play(_.flow([Round.draw, _.partial(Round.play, 0, undefined)]), startGame)
  const game2 = play(_.flow([Round.draw, _.partial(Round.play, 0, undefined)]), game1)

  test("the game still has no winner", () => {
    expect(game2.winner).toBeUndefined()
  })
  test("the score is updated", () => {
    expect(game2.scores).toEqual([ 0, 78, 73, 0 ])
  })
  test("a new round is started", () => {
    expect(Round.hasEnded(game2.currentRound!)).toBeFalsy
  })
})

const thirdShuffle = shuffleBuilder({ players: 4, cardsPerPlayer: 1 })
  .discard().is({ type: 'NUMBERED', color: 'BLUE', number: 8 })
  .hand(0).is({ color: 'BLUE', type: 'DRAW' })
  .hand(1).is({ type: 'WILD DRAW' })
  .hand(2).is({ type: 'SKIP', color: 'GREEN' })
  .hand(3).is({ number: 3 })
  .drawPile().is({ type: 'WILD' }, { type: 'REVERSE' })
  .build()

describe("ending the third round", () => {
  const props = {
    players: ['a', 'b', 'c', 'd'],
    targetScore: 200,
    randomizer: () => 3,
    shuffler: successiveShufflers(firstShuffle, secondShuffle, thirdShuffle),
    cardsPerPlayer: 1
  }
  const startGame = createGame(props)
  const game1 = play(_.flow([Round.draw, _.partial(Round.play, 0, undefined)]), startGame)
  const game2 = play(_.flow([Round.draw, _.partial(Round.play, 0, undefined)]), game1)
  const game3 = play(_.partial(Round.play, 0, undefined), game2)

  test("player 0 won", () => {
    expect(game3.winner).toEqual(2)
  })
  test("the score is updated", () => {
    expect(game3.scores).toEqual([ 0, 78, 216, 0 ])
  })
  test("a new round is not started", () => {
    expect(game3.currentRound).toBeUndefined()
  })
})  