import * as backend from '../model/api'
import command from "./command";

export default (game_id: string, player: string) =>
  command(() => backend.join(game_id, player))
