import './env-bootstrap.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import mongoose from 'mongoose';
import helmet from 'helmet';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

import authRoutes from './routes/auth.js';
import propertyRoutes from './routes/properties.js';
import agentRoutes from './routes/agents.js';
import messageRoutes from './routes/messages.js';
import adminRoutes from './routes/admin.js';
import contentRoutes from './routes/content.js';
import analyticsRoutes from './routes/analytics.js';
import tourApiRoutes from './routes/tourApi.js';
import tourEmbedRoutes from './routes/tourEmbed.js';
import { attachTourUi } from './tourUiServer.js';
import {
  attachProductionTourProxy,
  shouldUseProductionTourProxy,
} from './tourProductionProxy.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vrgeorgia';
const NODE_ENV = process.env.NODE_ENV || 'development';

if (NODE_ENV === 'production' && !process.env.MONGODB_URI) {
  console.error(
    'FATAL: MONGODB_URI is required in production (e.g. MongoDB Atlas connection string).'
  );
  process.exit(1);
}

// ──── Security (მხოლოდ API — Next.js tour UI-ს სჭირდება inline scripts, iframe /v/) ────
const apiHelmet = helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
});
app.use('/api', apiHelmet);
app.use('/uploads', apiHelmet);

// Trust proxy on Render.com (required for rate-limit behind reverse proxy)
app.set('trust proxy', 1);

// CORS: production-ზე მხოლოდ ჩვენი დომენი, dev-ზე ყველა
const defaultDevOrigins = [
  'http://localhost:3000',
  'http://localhost:3002',
  'http://localhost:3003',
  'http://localhost:3007',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3002',
];
const defaultProdOrigins = [
  'https://vrgeorgia.ge',
  'https://www.vrgeorgia.ge',
  'https://staging.vrgeorgia.ge',
  'https://vhome.ge',
  'https://www.vhome.ge',
  'https://vrgeorgia.onrender.com',
  'https://vrgeorgia-frontend.onrender.com',
  'https://vrgeorgia-tour-builder.onrender.com',
  // ლოკალური frontend → production API (Design Mode სინქი)
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];
const allowedOriginsRaw = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
  : NODE_ENV === 'production'
    ? defaultProdOrigins
    : defaultDevOrigins;

/** ლოკალური Design Mode / frontend ყოველთვის უნდა ელაპარაკოს production API-ს CORS-ით */
const LOCAL_DEV_FRONTENDS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];
const allowedOrigins = [...allowedOriginsRaw];
for (const o of LOCAL_DEV_FRONTENDS) {
  if (!allowedOrigins.includes(o)) allowedOrigins.push(o);
}

app.use(cors({
  origin: NODE_ENV === 'production'
    ? (origin, cb) => {
        if (!origin || allowedOrigins.includes(origin)) cb(null, true);
        else cb(new Error('CORS not allowed'));
      }
    : true,
  credentials: true
}));

/**
 * ლიმიტის გასაღები: ავტორიზებულ მომხმარებელს — მისივე id, სხვას — IP.
 *
 * მხოლოდ IP-ზე დაყრდნობა ერთ ოფისში მჯდომ აგენტებს (ერთი NAT მისამართი) აიძულებდა
 * საერთო ლიმიტის გაზიარებას, რაც ატვირთვის შუაში 429-ს იწვევდა.
 */
function rateLimitKey(req) {
  const auth = req.headers.authorization || '';
  if (auth.startsWith('Bearer ')) {
    const token = auth.slice(7);
    const payload = token.split('.')[1];
    if (payload) {
      try {
        const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
        if (decoded?.sub) return `u:${decoded.sub}`;
      } catch {
        /* არავალიდური ტოკენი — IP-ზე გადავდივართ */
      }
    }
  }
  // ipKeyGenerator — IPv6 ქვექსელის ნორმალიზაცია, თორემ ლიმიტი ადვილად შემოვლადია
  return `ip:${ipKeyGenerator(req.ip)}`;
}

/** ატვირთვა ერთ ობიექტზე ათეულობით მოთხოვნაა — ეს გზები ცალკე, ფართო ლიმიტზეა */
const UPLOAD_PATH_RE = /^\/properties(\/[^/]+)?(\/photos)?\/?$/;

// Rate limiting (ლოკალურ dev-ში გამორთული — HMR/Strict Mode არ აჯერებს 429-ს)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: NODE_ENV === 'production' ? 1200 : 10_000,
  keyGenerator: rateLimitKey,
  skip: (req) =>
    NODE_ENV !== 'production' ||
    // ფოტოების ატვირთვა/შენახვა საკუთარ, უფრო ფართო ლიმიტზეა
    (req.method === 'POST' && UPLOAD_PATH_RE.test(req.path)),
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' }
});

// ატვირთვის გზები: ერთი ობიექტი = 1 create + 8-მდე ფოტო-პაკეტი, ამიტომ ლიმიტი მაღალია
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: NODE_ENV === 'production' ? 600 : 10_000,
  keyGenerator: rateLimitKey,
  skip: () => NODE_ENV !== 'production',
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'ატვირთვის ლიმიტი ამოიწურა. სცადეთ 15 წუთში.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // ავტორიზაცია: 20 ცდა 15 წუთში
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts, please try again later.' }
});

app.use(morgan(NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '2mb' }));

// Serve uploaded images with cache headers
const uploadsDir = path.resolve(__dirname, '..', 'uploads');
app.use('/uploads', express.static(uploadsDir, {
  maxAge: NODE_ENV === 'production' ? '7d' : 0,
  etag: true
}));

app.get('/api/health', (_req, res) => {
  const dbReady = mongoose.connection.readyState === 1;
  res.status(dbReady ? 200 : 503).json({
    ok: dbReady,
    env: NODE_ENV,
    db: dbReady ? 'connected' : 'disconnected',
  });
});

/** ერთი კურსი სორტისთვის და UI კონვერტაციისთვის */
app.get('/api/currency/rate', async (_req, res) => {
  try {
    const { getUsdToGelRate } = await import('./utils/currency.js');
    const usdToGel = await getUsdToGelRate();
    res.json({ usdToGel });
  } catch (err) {
    console.error('currency rate error:', err);
    res.status(500).json({ usdToGel: 2.75 });
  }
});

// Rate limit on auth routes (login/register brute-force protection)
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.post('/api/properties', uploadLimiter);
app.post('/api/properties/:id/photos', uploadLimiter);
app.use('/api', apiLimiter);

// Embed tour link handoff — always local (not proxied to production in dev)
app.use('/api', tourEmbedRoutes);

// Dev: მხოლოდ /v/ + published GET → production (ნახვა). ტურის შექმნა/რედაქტირება ლოკალურია.
if (shouldUseProductionTourProxy()) {
  attachProductionTourProxy(app);
}

app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/analytics', analyticsRoutes);
// ყოველთვის ლოკალური tour API — create/edit არ უნდა იყოს დამოკიდებული Render-ზე
app.use('/api', tourApiRoutes);
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

/**
 * ატვირთვის იდემპოტენტობა DB დონეზე unique ინდექსზეა დამოკიდებული. autoIndex
 * ავტომატურად აშენებს, მაგრამ ჩავარდნა უხმოდ ხდება — მაშინ პარალელური ორმაგი
 * დაჭერა ისევ დუბლიკატს შექმნიდა. ამიტომ სტარტზე ცხადად ვამოწმებთ და ვლოგავთ.
 */
async function verifyIdempotencyIndex() {
  try {
    const { Property } = await import('./models/Property.js');
    await Property.init();
    const indexes = await Property.collection.indexes();
    const found = indexes.find(
      (i) => i.key?.userId === 1 && i.key?.clientRequestId === 1 && i.unique
    );
    if (found) {
      console.log('Upload idempotency index: ok');
    } else {
      console.error(
        'WARNING: upload idempotency index (userId + clientRequestId) is missing — ' +
          'concurrent double-submits may create duplicate properties.'
      );
    }
  } catch (err) {
    console.error('Upload idempotency index check failed:', err.message);
  }
}

async function start() {
  mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
  });
  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected');
  });
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');
  console.log(`Environment: ${NODE_ENV}`);

  await verifyIdempotencyIndex();

  await attachTourUi(app);

  app.use((err, _req, res, _next) => {
    console.error('Unhandled error:', err);
    res.status(err.status || 500).json({
      message: NODE_ENV === 'production' ? 'Internal server error' : err.message
    });
  });

  const server = app.listen(PORT, HOST, () =>
    console.log(`Server listening on http://${HOST}:${PORT} (API + tour UI)`)
  );

  // Render-ის reverse proxy keep-alive კავშირს ჩვენზე დიდხანს ინახავს. Node-ის
  // ნაგულისხმევი keepAliveTimeout (5 წმ) ფოტო-პაკეტებს შორის პაუზაზე სოკეტს კეტავს,
  // proxy კი იმავე სოკეტზე აგზავნის შემდეგ POST-ს → კავშირი წყდება პასუხის გარეშე
  // და ბრაუზერი ხედავს "სერვერთან კავშირი ვერ მოხერხდა"-ს. headersTimeout ყოველთვის
  // keepAliveTimeout-ზე მეტი უნდა იყოს.
  server.keepAliveTimeout = 120_000;
  server.headersTimeout = 125_000;
  // ერთი ფოტო-პაკეტის დამუშავება (sharp + Cloudinary) ნელ ინსტანსზე წუთებს იღებს
  server.requestTimeout = 300_000;
  // სოკეტის უმოქმედობის ტაიმერი გამორთული — მოთხოვნის ლიმიტს requestTimeout წყვეტს
  server.setTimeout(0);
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
