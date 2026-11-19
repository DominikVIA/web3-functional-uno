import * as apollo from './api'
import * as dummy from './api.dummy'

// The one switch that decides where data comes from. Thunks import `backend`, never api.ts.
//
// `typeof apollo` makes TypeScript check that the dummy has every function of the real
// backend with the same signature, so the two cannot drift apart.
//
// Dummy until the server exists. Later run with VITE_BACKEND=apollo.
// (`import.meta.env` is Vite's; use whatever your bundler offers.)
export const backend: typeof apollo = import.meta.env.VITE_BACKEND === 'apollo' ? apollo : dummy
