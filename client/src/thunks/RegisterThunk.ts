import type { NavigateFunction } from "react-router";
import * as auth from "../model/auth";
import LoginThunk from "./LoginThunk";

// Registering also logs you in, so it is the same thunk with a different way to get the token
export default (player: string, query: URLSearchParams, navigate: NavigateFunction) =>
    LoginThunk(player, query, navigate, auth.register)
