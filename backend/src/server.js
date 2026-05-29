import './env-bootstrap.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import mongoose from 'mongoose';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/auth.js';
import propertyRoutes from './routes/properties.js';
import agentRoutes from './routes/agents.js';
import messageRoutes from './routes/messages.js';
import adminRoutes from './routes/admin.js';
import analyticsRoutes from './routes/analytics.js';
import tourApiRoutes from './routes/tourApi.js';
import { attachTourUi } from './tourUiServer.js';

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

// ──── Security ────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

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
  'https://vrgeorgia.onrender.com',
  'https://vrgeorgia-frontend.onrender.com',
  'https://vrgeorgia-tour-builder.onrender.com',
];
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
  : NODE_ENV === 'production'
    ? defaultProdOrigins
    : defaultDevOrigins;

app.use(cors({
  origin: NODE_ENV === 'production'
    ? (origin, cb) => {
        if (!origin || allowedOrigins.includes(origin)) cb(null, true);
        else cb(new Error('CORS not allowed'));
      }
    : true,
  credentials: true
}));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 წუთი
  max: 200, // 200 მოთხოვნა 15 წუთში
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' }
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

// Rate limit on auth routes (login/register brute-force protection)
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api', apiLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api', tourApiRoutes);
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

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

  await attachTourUi(app);

  app.use((err, _req, res, _next) => {
    console.error('Unhandled error:', err);
    res.status(err.status || 500).json({
      message: NODE_ENV === 'production' ? 'Internal server error' : err.message
    });
  });

  app.listen(PORT, HOST, () =>
    console.log(`Server listening on http://${HOST}:${PORT} (API + tour UI)`)
  );
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
