import { MongoClient, type Db } from "mongodb"

// Default client options — keep minimal. We add a small, opt-in
// development-only set of TLS options below to help diagnose or
// temporarily work around local TLS handshake problems when
// connecting to MongoDB Atlas from environments with OpenSSL
// incompatibilities.
const baseOptions: Record<string, any> = {
  // short server selection timeout for fast failures in dev
  serverSelectionTimeoutMS: 10000,
  connectTimeoutMS: 10000,
}

let clientPromise: Promise<MongoClient> | null = null

function getClientPromise(): Promise<MongoClient> {
  if (!process.env.MONGODB_URI) {
    throw new Error("Please add your MongoDB URI to .env.local")
  }

  const uri = process.env.MONGODB_URI

  // Allow opting in to relaxed TLS verification for local development only.
  // This should NOT be used in production. Set MONGODB_ALLOW_INVALID_CERT=true
  // in your .env.local to enable when you need to bypass certificate issues.
  const allowInvalid = process.env.MONGODB_ALLOW_INVALID_CERT === "true"

  const options: Record<string, any> = { ...baseOptions }
  if (allowInvalid) {
    // Use the TLS aliases recognized by the driver. These options
    // relax certificate verification and are intended only for
    // short-term local debugging.
    options.tls = true
    options.tlsAllowInvalidCertificates = true
    // Note: `tlsInsecure` is not compatible with `tlsAllowInvalidCertificates`
    // in newer driver versions; avoid setting it to prevent API errors.
    console.warn(
      "[mongodb] Warning: TLS certificate validation is disabled (MONGODB_ALLOW_INVALID_CERT=true). This is for local debugging only."
    )
  }

  if (process.env.NODE_ENV === "development") {
    // Preserve across HMR reloads
    const globalWithMongo = global as typeof globalThis & {
      _mongoClientPromise?: Promise<MongoClient>
    }

    if (!globalWithMongo._mongoClientPromise) {
      const client = new MongoClient(uri, options)
      // attach a catch to log connection errors early
      globalWithMongo._mongoClientPromise = client.connect().catch((err) => {
        console.error("[mongodb] connect error:", err)
        throw err
      })
    }
    return globalWithMongo._mongoClientPromise!
  }

  if (!clientPromise) {
    const client = new MongoClient(uri, options)
    clientPromise = client.connect().catch((err) => {
      console.error("[mongodb] connect error:", err)
      throw err
    })
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
