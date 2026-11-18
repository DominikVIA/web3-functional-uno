import type {Card, Color} from "../model/deck";

export type GameState = {
    discardPileTop: Card;
    playerHandCount: number[];
    playerHand: Card[];
    scores: number[];
    unoState: boolean[];
    targetScore: number;
    handEnded: boolean;
    wildPlayCard?: number;
    wildColor?: Color;
};
