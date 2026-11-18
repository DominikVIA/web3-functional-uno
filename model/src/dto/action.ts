import type {Color} from "../model/deck";

export type GameAction =
    | PlayAction
    | DrawAction
    | SayUnoAction
    | CatchUnoAction;

export type PlayAction = {
    type: "play";
    cardPos: number;
    color?: Color;
};

export type CatchUnoAction = {
    type: "catch-uno";
    accusedPosition: number;
};

export type SayUnoAction = {
    type: "say-uno";
};

export type DrawAction = {
    type: "draw";
};
