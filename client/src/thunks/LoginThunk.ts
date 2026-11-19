import type { Dispatch } from "@reduxjs/toolkit";
import type { NavigateFunction } from "react-router";
import { player_slice } from "../slices/player_slice";

export default (player: string, query: URLSearchParams, navigate: NavigateFunction) => {
  return async (dispatch: Dispatch) => {
    dispatch(player_slice.actions.logged_in(player))
    if (query.has('game'))
      navigate(`/game/${query.get('game')}`)
    else if (query.has('pending'))
      navigate(`/pending/${query.get('pending')}`)
    else
      navigate("/")
  }
}
