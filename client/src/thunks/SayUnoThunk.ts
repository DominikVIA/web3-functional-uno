import { backend } from "../model/backend";
import command from "./command";

export default (game_id: string, player: string) =>
  command(() => backend.say_uno(game_id, player))
