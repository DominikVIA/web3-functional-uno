import * as backend from '../model/api'
import command from "./command";

export default (game_id: string, player: string) =>
  command(() => backend.say_uno(game_id, player))
