import { MongoClient } from "mongodb"
const connectionString = process.env.ATLAS_URI ?? "mongodb://localhost:27017"
const client = new MongoClient(connectionString)
let conn
try {
  conn = await client.connect()
} catch (e) {
  console.error(e)
}
if (conn === undefined) {
  throw new Error("Could not connect to MongoDB")
}
// Only the `users` collection lives here: games are kept in memory (game-service.ts)
const db = conn.db(process.env.DB_NAME ?? "uno")
export default db
