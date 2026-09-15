import { MongoClient } from "mongodb"

if (!process.env.MONGODB_URI) {
  throw new Error("Please add your MONGODB_URI to .env.local")
}

const uri = process.env.MONGODB_URI
const options = {}

let client: MongoClient
let clientPromise: Promise<MongoClient>

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined
}

if (process.env.NODE_ENV === "development") {
  // In development, use a global variable so the MongoClient
  // is not re-created on every hot-reload
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options)
    global._mongoClientPromise = client.connect()
  }
  clientPromise = global._mongoClientPromise
} else {
  // In production, create a new MongoClient for each request
  client = new MongoClient(uri, options)
  clientPromise = client.connect()
}

export default clientPromise
