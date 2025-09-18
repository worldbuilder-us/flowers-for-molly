import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI!;
if (!MONGODB_URI) {
  throw new Error("Missing MONGODB_URI in environment");
}

// Ensure we reuse the connection in dev (Next hot reload)
let cached = (global as any)._mongoose as { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
if (!cached) cached = (global as any)._mongoose = { conn: null, promise: null };

export async function dbConnect(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI).then((m) => m);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}
