import { MongoClient, type Db } from "mongodb"

const options = {}

let clientPromise: Promise<MongoClient> | null = null

function getClientPromise(): Promise<MongoClient> {
  if (!process.env.MONGODB_URI) {
    throw new Error("Please add your MongoDB URI to .env.local")
  }

  const uri = process.env.MONGODB_URI

  if (process.env.NODE_ENV === "development") {
    // In development mode, use a global variable so that the value
    // is preserved across module reloads caused by HMR (Hot Module Replacement).
    const globalWithMongo = global as typeof globalThis & {
      _mongoClientPromise?: Promise<MongoClient>
    }

    if (!globalWithMongo._mongoClientPromise) {
      const client = new MongoClient(uri, options)
      globalWithMongo._mongoClientPromise = client.connect()
    }
    return globalWithMongo._mongoClientPromise!
  }

  // In production mode, avoid using a global. Lazily create a single promise.
  if (!clientPromise) {
    const client = new MongoClient(uri, options)
    clientPromise = client.connect()
  }
  return clientPromise
}

export default getClientPromise

export async function getDatabase(): Promise<Db> {
  const client = await getClientPromise()
  return client.db("timetracker")
}

export async function connectToDatabase(): Promise<{ db: Db; client: MongoClient }> {
  const client = await getClientPromise()
  const db = client.db("timetracker")
  return { db, client }
}
