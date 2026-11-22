import type { Color } from "uno-model/src/model/deck";
import { backend } from "../model/backend";
import command from "./command";

// For a wild card pass the colour the player picked; for every other card leave it out.
// (`is_wild` in model/game.ts tells the component which case it is.)
export default (game_id: string, card_pos: number, player: string, color?: Color) =>
  command(() => backend.play(game_id, player, card_pos, color))
