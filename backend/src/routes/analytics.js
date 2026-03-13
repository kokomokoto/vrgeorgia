import express from 'express';
import { PageView } from '../models/PageView.js';

const router = express.Router();

// ──── User-Agent Parser ────
function parseUserAgent(ua = '') {
  const lowerUA = ua.toLowerCase();
  
  // Device
  let device = 'desktop';
  if (/mobile|android|iphone|ipod|blackberry|opera mini|iemobile/i.test(ua)) {
    device = 'mobile';
  } else if (/tablet|ipad|playbook|silk/i.test(ua)) {
    device = 'tablet';
  }
  
  // Browser
  let browser = 'other';
  if (lowerUA.includes('edg/')) browser = 'Edge';
  else if (lowerUA.includes('opr/') || lowerUA.includes('opera')) browser = 'Opera';
  else if (lowerUA.includes('chrome') && !lowerUA.includes('edg')) browser = 'Chrome';
  else if (lowerUA.includes('firefox')) browser = 'Firefox';
  else if (lowerUA.includes('safari') && !lowerUA.includes('chrome')) browser = 'Safari';
  
  // OS
  let os = 'other';
  if (lowerUA.includes('windows')) os = 'Windows';
  else if (lowerUA.includes('mac os')) os = 'macOS';
  else if (lowerUA.includes('android')) os = 'Android';
  else if (lowerUA.includes('iphone') || lowerUA.includes('ipad')) os = 'iOS';
  else if (lowerUA.includes('linux')) os = 'Linux';
  
  return { device, browser, os };
}

// ──── Track Page View (public) ────
router.post('/pageview', async (req, res) => {
  try {
    const { path, propertyId, agentId, sessionId, referrer } = req.body;
    
    if (!path) return res.status(400).json({ message: 'path is required' });
    
    const ua = req.headers['user-agent'] || '';
    const { device, browser, os } = parseUserAgent(ua);
    
    // IP (supports proxy)
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
               req.socket?.remoteAddress || '';
    
    await PageView.create({
      path,
      propertyId: propertyId || null,
      agentId: agentId || null,
      sessionId: sessionId || '',
      device,
      browser,
      os,
      ip,
      referrer: referrer || ''
    });
    
    res.json({ ok: true });
  } catch (err) {
    // არ გავჩერდეთ — ანალიტიკის შეცდომა კრიტიკული არ არის
    console.error('Analytics error:', err.message);
    res.json({ ok: true });
  }
});

export default router;
