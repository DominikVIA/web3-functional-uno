import express, { type NextFunction, type Request, type Response, type Router } from 'express'
import jwt, { type JwtPayload } from 'jsonwebtoken'
import db from './db.mts'

// Same idea as before: Mongo knows the users, a JWT proves who is talking.
// What changed: the token is now checked in ONE place and its username becomes the GraphQL
// context, so the resolvers never trust a player name sent by the client.

const SECRET = process.env.JWT_SECRET ?? 'secret-key-here'   // set JWT_SECRET outside of development

interface UsernamePayload extends JwtPayload { username: string }

declare global {
  namespace Express {
    interface Request { user?: UsernamePayload }
  }
}

const generateToken = (username: string): string => jwt.sign({ username }, SECRET, { expiresIn: '1h' })

// undefined when the token is missing, forged or expired. Used by HTTP and by the WebSocket.
export const username_of_token = (token: unknown): string | undefined => {
  if (typeof token !== 'string') return undefined
  try {
    const payload = jwt.verify(token, SECRET) as UsernamePayload
    return typeof payload.username === 'string' ? payload.username : undefined
  } catch {
    return undefined
  }
}

// Express middleware for /graphql: "Authorization: Bearer <token>"
export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const token = req.headers['authorization']?.split(' ')[1]
  if (token === undefined) {
    res.status(401).json({ message: 'Access denied. No token provided.' })
    return
  }
  const username = username_of_token(token)
  if (username === undefined) {
    res.status(403).json({ message: 'Invalid token.' })
    return
  }
  req.user = { username }
  next()
}

const valid_name = (name: unknown): name is string =>
  typeof name === 'string' && name.trim().length > 0 && name.length <= 30

export function auth_router(): Router {
  const router = express.Router()
  router.use(express.json())
  const users = db.collection('users')

  router.post('/register', async (req: Request, res: Response) => {
    try {
      const username = req.body?.username
      if (!valid_name(username)) {
        res.status(400).json({ message: 'Choose a name of 1 to 30 characters.' })
        return
      }
      if (await users.findOne({ username }) !== null) {
        res.status(409).json({ message: 'That name is taken.' })
        return
      }
      await users.insertOne({ username })
      res.json({ token: generateToken(username) })
    } catch (error) {
      console.error(error)
      res.status(400).json({ message: 'Error registering user.' })
    }
  })

  router.post('/login', async (req: Request, res: Response) => {
    try {
      const username = req.body?.username
      if (!valid_name(username) || await users.findOne({ username }) === null) {
        res.status(404).json({ message: 'Unknown user.' })
        return
      }
      res.json({ token: generateToken(username) })
    } catch (error) {
      console.error(error)
      res.status(400).json({ message: 'Error logging in.' })
    }
  })

  return router
}
