import type { NavigateFunction } from "react-router";
import * as auth from "../model/auth";
import { player_slice } from "../slices/player_slice";
import command from "./command";

// Ask the server for a token, and only then say "logged in". A refusal ("Unknown user.",
// "That name is taken.") becomes a toast through `command`. `authenticate` is what differs
// between logging in and registering (see RegisterThunk).
export default (player: string, query: URLSearchParams, navigate: NavigateFunction, authenticate = auth.login) =>
    command(async dispatch => {
      await authenticate(player)
      dispatch(player_slice.actions.logged_in(player))
      if (query.has('game'))
        navigate(`/game/${query.get('game')}`)
      else if (query.has('pending'))
        navigate(`/pending/${query.get('pending')}`)
      else
        navigate("/")
    })
