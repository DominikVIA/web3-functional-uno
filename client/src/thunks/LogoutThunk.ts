import type { NavigateFunction } from "react-router";
import { forget_token } from "../model/auth";
import { player_slice } from "../slices/player_slice";
import type { Dispatch } from "../stores/store";

export default (navigate: NavigateFunction) => (dispatch: Dispatch) => {
    forget_token()
    dispatch(player_slice.actions.logged_out())   // RequireLogin stops the live updates, closing the socket
    navigate('/login')
}
