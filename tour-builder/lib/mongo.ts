import mongoose from "mongoose";

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/vrgeorgia";

if (process.env.NODE_ENV === "production" && !process.env.MONGODB_URI) {
  // production-ში აუცილებელია რეალური Atlas/Mongo connection string
  console.warn(
    "[tour-builder] MONGODB_URI არ არის მითითებული — გამოიყენება localhost (არ იმუშავებს Render-ზე)."
  );
}

type MongoCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

// hot-reload-ზე კავშირი არ დუბლირდეს — ვინახავთ global-ში
const globalForMongo = globalThis as unknown as { _tbMongo?: MongoCache };
const cached: MongoCache =
  globalForMongo._tbMongo ?? { conn: null, promise: null };
globalForMongo._tbMongo = cached;

export async function connectMongo(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}
