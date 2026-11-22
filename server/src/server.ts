import http from 'node:http'
import cors from 'cors'
import express, { type Request } from 'express'
import { useServer } from 'graphql-ws/use/ws'
import { createHandler } from 'graphql-http/lib/use/express'
import { WebSocketServer } from 'ws'
import { auth_router, authenticateToken, username_of_token } from './auth'
import { createGameService } from './game-service'
import { create_schema } from './schema'

// One port for everything the client talks to (client/src/model/api.ts):
//   POST /auth/register, /auth/login   REST, answers { token }
//   POST /graphql                      queries and mutations, needs "Authorization: Bearer <token>"
//   ws   /graphql                      subscriptions, token in connectionParams
//
// This replaces the old REST game routes AND the hand-made WebSocket pub/sub
// (convert-command.ts, subscribe/unsubscribe/send/close, connectedPlayers): GraphQL
// subscriptions are the pub/sub now, and players are fixed when the lobby fills up.

const PORT = Number(process.env.PORT ?? 4000)

const service = createGameService()
const schema = create_schema(service)

const app = express()
app.use(cors())
app.use('/auth', auth_router())
app.use('/graphql', authenticateToken)
app.all('/graphql', createHandler({
  schema,
  context: req => ({ username: (req.raw as Request).user!.username })
}))

const server = http.createServer(app)
const sockets = new WebSocketServer({ server, path: '/graphql' })
useServer({
  schema,
  // refuse the connection when the token is wrong; otherwise remember who it is
  onConnect: ctx => username_of_token(ctx.connectionParams?.token) !== undefined,
  context: ctx => ({ username: username_of_token(ctx.connectionParams?.token)! })
}, sockets)

server.listen(PORT, () => console.log(`UNO server listening on ${PORT}`))
