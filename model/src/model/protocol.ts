import type {GameAction} from '../dto/action'
import type {GameStateEvent} from '../dto/events'
import * as Round from './round'
import {play as onRound} from './uno'
import type {Game} from './uno'

// The two pure functions that define the SERVER's side of the contract:
//
//   applyAction        (game, who, GameAction)       -> next Game      (or throws a reason)
//   toGameStateEvent   (game, id, who, handEnded)    -> GameStateEvent (what `who` is allowed to see)
//
// The client's dummy transport calls them in-process. The real server module will call the
// very same functions per request, so nothing on the client changes when it arrives.

// Round.play / Round.draw act for whoever is in turn, so WHO is asking must be checked here.
const requireTurn = (game: Game, player: number): void => {
    if (game.currentRound?.playerInTurn !== player) throw Error('It is not your turn')
}

export const applyAction = (game: Game, player: number, action: GameAction): Game => {
    switch (action.type) {
        case 'play':
            requireTurn(game, player)
            return onRound(round => Round.play(action.cardPos, action.color, round), game)

        case 'draw':
            requireTurn(game, player)
            return onRound(round => {
                if (Round.canPlayAny(round)) throw Error('You have a playable card')
                return Round.draw(round)
            }, game)

        case 'say-uno':
            return onRound(round => Round.sayUno(player, round), game)

        case 'catch-uno': {
            const accusation = {accuser: player, accused: action.accusedPosition}
            return onRound(round => {
                if (!Round.checkUnoFailure(accusation, round)) throw Error('There is no missed UNO to catch')
                return Round.catchUnoFailure(accusation, round)
            }, game)
        }
    }
}

// `Game.settle` starts the next round immediately, so "a hand just ended" can only be seen
// by comparing before and after: the game is over, or the dealer has moved on.
export const handJustEnded = (before: Game, after: Game): boolean =>
    before.currentRound !== undefined &&
    (after.currentRound === undefined || after.currentRound.dealer !== before.currentRound.dealer)

// The projection: everything public, plus ONLY the viewer's own hand.
export const toGameStateEvent = (
    game: Game,
    gameId: string,
    playerPos: number,
    handEnded = false
): GameStateEvent => {
    const round = game.currentRound
    return {
        type: 'game-state',
        gameId,
        playerPos,
        players: [...game.players],
        scores: [...game.scores],
        targetScore: game.targetScore,
        handEnded,
        playerInTurn: round?.playerInTurn,
        currentColor: round?.currentColor,
        discardPileTop: round && Round.topOfDiscard(round),
        playerHandCount: round?.hands.map(hand => hand.length),
        playerHand: round && [...round.hands[playerPos]],
        // assumption: unoState[i] = "player forgot to say UNO and can still be caught"
        unoState: round && game.players.map((_name, i) => round.missed.includes(i))
    }
}
