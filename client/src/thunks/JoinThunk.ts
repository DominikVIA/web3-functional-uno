import { backend } from "../model/backend";
import command from "./command";

export default (game_id: string, player: string) =>
  command(() => backend.join(game_id, player))
