import express from 'express';
import jwt from 'jsonwebtoken';
import { PageView } from '../models/PageView.js';
import { Analyst } from '../models/Analyst.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_in_production';

// ──── User-Agent Parser ────
function parseUserAgent(ua = '') {
  const lowerUA = ua.toLowerCase();
  
  let device = 'desktop';
  if (/mobile|android|iphone|ipod|blackberry|opera mini|iemobile/i.test(ua)) device = 'mobile';
  else if (/tablet|ipad|playbook|silk/i.test(ua)) device = 'tablet';
  
  let browser = 'other';
  let browserVersion = '';
  if (lowerUA.includes('edg/')) { browser = 'Edge'; browserVersion = (ua.match(/Edg\/(\d+[\d.]*)/i) || [])[1] || ''; }
  else if (lowerUA.includes('opr/') || lowerUA.includes('opera')) { browser = 'Opera'; browserVersion = (ua.match(/OPR\/(\d+[\d.]*)/i) || [])[1] || ''; }
  else if (lowerUA.includes('chrome') && !lowerUA.includes('edg')) { browser = 'Chrome'; browserVersion = (ua.match(/Chrome\/(\d+[\d.]*)/i) || [])[1] || ''; }
  else if (lowerUA.includes('firefox')) { browser = 'Firefox'; browserVersion = (ua.match(/Firefox\/(\d+[\d.]*)/i) || [])[1] || ''; }
  else if (lowerUA.includes('safari') && !lowerUA.includes('chrome')) { browser = 'Safari'; browserVersion = (ua.match(/Version\/(\d+[\d.]*)/i) || [])[1] || ''; }
  
  let os = 'other';
  if (lowerUA.includes('windows')) os = 'Windows';
  else if (lowerUA.includes('mac os')) os = 'macOS';
  else if (lowerUA.includes('android')) os = 'Android';
  else if (lowerUA.includes('iphone') || lowerUA.includes('ipad')) os = 'iOS';
  else if (lowerUA.includes('linux')) os = 'Linux';
  
  return { device, browser, browserVersion, os };
}

// ──── IP Geolocation (ip-api.com free tier — 45 req/min) ────
const geoCache = new Map();
async function getGeoFromIP(ip) {
  if (!ip || ip === '::1' || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    return { country: 'Local', countryCode: 'LO', city: 'Localhost', region: '', lat: null, lon: null, isp: '' };
  }
  if (geoCache.has(ip)) return geoCache.get(ip);
  try {
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=country,countryCode,city,regionName,lat,lon,isp`, { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      const data = await res.json();
      const geo = {
        country: data.country || '',
        countryCode: data.countryCode || '',
        city: data.city || '',
        region: data.regionName || '',
        lat: data.lat || null,
        lon: data.lon || null,
        isp: data.isp || ''
      };
      geoCache.set(ip, geo);
      // გავასუფთავოთ კეში 1 საათის შემდეგ
      setTimeout(() => geoCache.delete(ip), 60 * 60 * 1000);
      return geo;
    }
  } catch { /* ignore */ }
  return { country: '', countryCode: '', city: '', region: '', lat: null, lon: null, isp: '' };
}

// ──── Analyst Auth Middleware ────
function requireAnalyst(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return res.status(401).json({ message: 'ავტორიზაცია საჭიროა' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.role !== 'analyst') return res.status(403).json({ message: 'მხოლოდ ანალიტიკოსებისთვის' });
    req.analyst = { id: payload.sub, username: payload.username };
    next();
  } catch {
    return res.status(401).json({ message: 'არასწორი ან ვადაგასული ტოკენი' });
  }
}

// ══════════════════════════════════════════
// PUBLIC: Track Page View
// ══════════════════════════════════════════
router.post('/pageview', async (req, res) => {
  try {
    const {
      path, propertyId, agentId, sessionId, referrer,
      screenWidth, screenHeight, viewportWidth, viewportHeight, pixelRatio,
      batteryLevel, batteryCharging,
      connectionType, connectionDownlink,
      language, timezone, platform, vendor,
      cookiesEnabled, doNotTrack, touchSupport, maxTouchPoints,
      deviceMemory, hardwareConcurrency, duration
    } = req.body;
    
    if (!path) return res.status(400).json({ message: 'path is required' });
    
    const ua = req.headers['user-agent'] || '';
    const { device, browser, browserVersion, os } = parseUserAgent(ua);
    
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
               req.socket?.remoteAddress?.replace('::ffff:', '') || '';
    
    // გეოლოკაცია ასინქრონულად
    const geo = await getGeoFromIP(ip);
    
    await PageView.create({
      path,
      propertyId: propertyId || null,
      agentId: agentId || null,
      sessionId: sessionId || '',
      device, browser, browserVersion, os,
      screenWidth: screenWidth || 0,
      screenHeight: screenHeight || 0,
      viewportWidth: viewportWidth || 0,
      viewportHeight: viewportHeight || 0,
      pixelRatio: pixelRatio || 1,
      batteryLevel: batteryLevel ?? null,
      batteryCharging: batteryCharging ?? null,
      connectionType: connectionType || '',
      connectionDownlink: connectionDownlink ?? null,
      language: language || '',
      timezone: timezone || '',
      platform: platform || '',
      vendor: vendor || '',
      cookiesEnabled: cookiesEnabled !== false,
      doNotTrack: doNotTrack || false,
      touchSupport: touchSupport || false,
      maxTouchPoints: maxTouchPoints || 0,
      deviceMemory: deviceMemory ?? null,
      hardwareConcurrency: hardwareConcurrency ?? null,
      ip,
      ...geo,
      referrer: referrer || '',
      duration: duration || 0
    });
    
    res.json({ ok: true });
  } catch (err) {
    console.error('Analytics error:', err.message);
    res.json({ ok: true });
  }
});

// PUBLIC: Update duration (when user leaves page)
router.post('/duration', async (req, res) => {
  try {
    const { sessionId, path, duration } = req.body;
    if (sessionId && path && duration > 0) {
      await PageView.findOneAndUpdate(
        { sessionId, path, duration: 0 },
        { $set: { duration } },
        { sort: { createdAt: -1 } }
      );
    }
    res.json({ ok: true });
  } catch {
    res.json({ ok: true });
  }
});

// ══════════════════════════════════════════
// ANALYST AUTH
// ══════════════════════════════════════════
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: 'შეავსეთ ორივე ველი' });
    
    const analyst = await Analyst.findOne({ username, active: true });
    if (!analyst) return res.status(401).json({ message: 'არასწორი მონაცემები' });
    
    const valid = await analyst.comparePassword(password);
    if (!valid) return res.status(401).json({ message: 'არასწორი მონაცემები' });
    
    const token = jwt.sign(
      { sub: analyst._id, username: analyst.username, role: 'analyst' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({ token, username: analyst.username, name: analyst.name });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ══════════════════════════════════════════
// PROTECTED: Dashboard Data
// ══════════════════════════════════════════

// მთავარი სტატისტიკა
router.get('/dashboard', requireAnalyst, async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    
    const periodMap = { '1d': 1, '7d': 7, '30d': 30, '90d': 90 };
    const days = periodMap[period] || 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    const match = { createdAt: { $gte: since } };
    
    const [
      totalViews,
      uniqueSessions,
      deviceStats,
      browserStats,
      osStats,
      countryStats,
      cityStats,
      pageStats,
      hourlyStats,
      dailyStats,
      screenStats,
      connectionStats,
      languageStats,
      referrerStats
    ] = await Promise.all([
      PageView.countDocuments(match),
      PageView.distinct('sessionId', match).then(s => s.filter(Boolean).length),
      PageView.aggregate([
        { $match: match },
        { $group: { _id: '$device', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      PageView.aggregate([
        { $match: match },
        { $group: { _id: '$browser', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      PageView.aggregate([
        { $match: match },
        { $group: { _id: '$os', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      PageView.aggregate([
        { $match: { ...match, country: { $ne: '' } } },
        { $group: { _id: '$country', code: { $first: '$countryCode' }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 }
      ]),
      PageView.aggregate([
        { $match: { ...match, city: { $ne: '' } } },
        { $group: { _id: '$city', country: { $first: '$country' }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 }
      ]),
      PageView.aggregate([
        { $match: match },
        { $group: { _id: '$path', count: { $sum: 1 }, avgDuration: { $avg: '$duration' } } },
        { $sort: { count: -1 } },
        { $limit: 30 }
      ]),
      PageView.aggregate([
        { $match: match },
        { $group: { _id: { $hour: '$createdAt' }, count: { $sum: 1 } } },
        { $sort: { '_id': 1 } }
      ]),
      PageView.aggregate([
        { $match: match },
        { $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
          uniqueSessions: { $addToSet: '$sessionId' }
        }},
        { $project: { _id: 1, count: 1, uniqueSessions: { $size: '$uniqueSessions' } } },
        { $sort: { '_id': 1 } }
      ]),
      PageView.aggregate([
        { $match: { ...match, screenWidth: { $gt: 0 } } },
        { $group: {
          _id: { w: '$screenWidth', h: '$screenHeight' },
          count: { $sum: 1 }
        }},
        { $sort: { count: -1 } },
        { $limit: 15 }
      ]),
      PageView.aggregate([
        { $match: { ...match, connectionType: { $ne: '' } } },
        { $group: { _id: '$connectionType', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      PageView.aggregate([
        { $match: { ...match, language: { $ne: '' } } },
        { $group: { _id: '$language', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      PageView.aggregate([
        { $match: { ...match, referrer: { $ne: '' } } },
        { $group: { _id: '$referrer', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 15 }
      ])
    ]);
    
    res.json({
      totalViews,
      uniqueSessions,
      deviceStats,
      browserStats,
      osStats,
      countryStats,
      cityStats,
      pageStats,
      hourlyStats,
      dailyStats,
      screenStats,
      connectionStats,
      languageStats,
      referrerStats
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ცალკეული ვიზიტების სია (დეტალური)
router.get('/visits', requireAnalyst, async (req, res) => {
  try {
    const { page = 1, limit = 50, device, country, browser } = req.query;
    const filter = {};
    if (device) filter.device = device;
    if (country) filter.country = country;
    if (browser) filter.browser = browser;
    
    const skip = (Number(page) - 1) * Number(limit);
    
    const [visits, total] = await Promise.all([
      PageView.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      PageView.countDocuments(filter)
    ]);
    
    res.json({ visits, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// რეალ-ტაიმ (ბოლო 5 წუთი)
router.get('/realtime', requireAnalyst, async (req, res) => {
  try {
    const since = new Date(Date.now() - 5 * 60 * 1000);
    const active = await PageView.find({ createdAt: { $gte: since } })
      .sort({ createdAt: -1 }).limit(100).lean();
    const uniqueNow = new Set(active.map(v => v.sessionId).filter(Boolean)).size;
    res.json({ activeUsers: uniqueNow, recentVisits: active });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
