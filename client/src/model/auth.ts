// Logging in = asking the server for a token. The token lives in memory only (a page reload
// means logging in again, and RequireLogin remembers where you were going).
// api.ts reads it for every GraphQL call.

export const HOST = import.meta.env.VITE_SERVER_HOST ?? 'localhost:4000'

let token: string | undefined

export const get_token = (): string | undefined => token
export const forget_token = (): void => { token = undefined }

const authenticate = (path: 'login' | 'register') => async (username: string): Promise<void> => {
    const response = await fetch(`http://${HOST}/auth/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
    })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) throw Error(body.message ?? 'Could not sign in')
    token = body.token
}

export const login = authenticate('login')
export const register = authenticate('register')
