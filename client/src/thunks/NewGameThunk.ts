import type { NavigateFunction } from "react-router"
import * as backend from '../model/api'
import type { NewGameSettings } from "../model/game"
import command from "./command"

export default (settings: NewGameSettings, player: string, navigate: NavigateFunction) =>
  command(async () => {
    const game = await backend.new_game(player, settings)
    navigate(`/pending/${game.id}`)   // only reached when the server accepted the game
  })
