import mongoose from 'mongoose';

/**
 * აგენტის მოთხოვნები / ბოტის პასუხები — ცალკე DB იმავე Atlas კლასტერზე,
 * რომ მთავარი საიტის კოლექციები არ გადაიტვირთოს.
 */
let botConn = null;
let connecting = null;

export function resolveBotMongoUri(mainUri) {
  if (process.env.BOT_MONGODB_URI) return process.env.BOT_MONGODB_URI;
  const raw = String(mainUri || '').trim();
  if (!raw) return 'mongodb://127.0.0.1:27017/vrgeorgia_bot';
  const m = raw.match(/^(mongodb(?:\+srv)?:\/\/[^/]+)\/?([^?]*)(.*)$/i);
  if (!m) return raw;
  return `${m[1]}/vrgeorgia_bot${m[3] || ''}`;
}

export async function getBotConnection() {
  if (botConn?.readyState === 1) return botConn;
  if (connecting) return connecting;

  connecting = (async () => {
    const mainUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vrgeorgia';
    const uri = resolveBotMongoUri(mainUri);
    const conn = mongoose.createConnection(uri, {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 15_000,
    });
    await conn.asPromise();
    botConn = conn;
    console.log(`[bot-db] connected → ${conn.name}`);
    return conn;
  })();

  try {
    return await connecting;
  } finally {
    connecting = null;
  }
}
