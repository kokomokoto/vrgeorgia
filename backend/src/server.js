import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

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

const app = express();

const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vrgeorgia';
const NODE_ENV = process.env.NODE_ENV || 'development';

// ──── Security ────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// Trust proxy on Render.com (required for rate-limit behind reverse proxy)
app.set('trust proxy', 1);

// CORS: production-ზე მხოლოდ ჩვენი დომენი, dev-ზე ყველა
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000', 'http://localhost:3003', 'http://192.168.1.206:3003'];

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

app.get('/api/health', (_req, res) => res.json({ ok: true, env: NODE_ENV }));

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

// Global error handler
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    message: NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

async function start() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');
  console.log(`Environment: ${NODE_ENV}`);
  app.listen(PORT, HOST, () => console.log(`API listening on http://${HOST}:${PORT}`));
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
