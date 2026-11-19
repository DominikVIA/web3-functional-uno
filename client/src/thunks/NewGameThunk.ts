import type { NavigateFunction } from "react-router"
import { backend } from "../model/backend"
import type { NewGameSettings } from "../model/game"
import command from "./command"

export default (settings: NewGameSettings, player: string, navigate: NavigateFunction) =>
  command(async () => {
    const game = await backend.new_game(player, settings)
    navigate(`/pending/${game.id}`)   // only reached when the server accepted the game
  })
