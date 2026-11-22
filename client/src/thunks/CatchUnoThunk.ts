import * as backend from '../model/api'
import command from "./command";

// `accused` is the seat of the player who forgot to say UNO (see `opponents` in model/game.ts)
export default (game_id: string, accused: number, player: string) =>
    command(() => backend.catch_uno(game_id, player, accused))
