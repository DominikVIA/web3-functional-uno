import * as backend from '../model/api'
import { ongoing_games_slice } from "../slices/ongoing_games_slice";
import { pending_games_slice } from "../slices/pending_games_slice";
import command from "./command";

// The first load, before the live updates take over
export default (player: string) =>
  command(async dispatch => {
    const [games, pending_games] = await Promise.all([backend.games(player), backend.pending_games()])
    dispatch(ongoing_games_slice.actions.reset(games))
    dispatch(pending_games_slice.actions.reset(pending_games))
  })
