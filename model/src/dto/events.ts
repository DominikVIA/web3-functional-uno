import type {Game} from "../model/uno";
import type {Card, Color} from "../model/deck";

export type JoinEvent = {
    username: string;
    gameId: string;
    state: "join" | "leave";
};

export type SubscribeCommand = {
    type: "subscribe" | "unsubscribe";
    username: string;
    gameId: string;
};

export type GameDtoClient = {
    game: GameType;
    id: string;
};

export type GameStatus = "in-progress" | "finished";

export type GameStateEvent = {
    type: "game-state";
    playerInTurn?: number;
    discardPileTop?: Card;
    playerHandCount?: number[];
    currentColor?: Color,
    playerHand?: Card[];
    scores: number[];
    unoState?: boolean[];
    targetScore: number;
    handEnded: boolean;
    players: string[];
    gameId: string;
    playerPos: number;
};

export type GameDto = {
    game: GameType;
    id: string;
};

export type Lobby = {
    id: string;
    players: string[];
    connected: string[];
};

export type GameType = {
    id: string;
    gameState: Game;
    connectedPlayers: string[];
    status: GameStatus;
};
