import mongoose from "mongoose"

const MONGODB_URI = process.env.MONGODB_URI!

if (!MONGODB_URI) {
  throw new Error("Please add MONGODB_URI to .env.local")
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseConn: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null }
}

let cached = global.mongooseConn

if (!cached) {
  cached = global.mongooseConn = { conn: null, promise: null }
}

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    })
  }

  cached.conn = await cached.promise
  return cached.conn
}
