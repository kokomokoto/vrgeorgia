import jwt from 'jsonwebtoken';
import { getJWTSecret } from '../config/jwt.js';

export function requireAuth(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';

  if (!token) return res.status(401).json({ message: 'Missing token' });

  try {
    const payload = jwt.verify(token, getJWTSecret());
    req.user = { id: payload.sub };
    next();
  } catch (err) {
    if (process.env.NODE_ENV !== 'production' && err && typeof err === 'object') {
      console.error('[requireAuth]', err.name, err.message);
    }
    if (err && typeof err === 'object' && err.name === 'TokenExpiredError') {
      return res.status(401).json({
        message: 'სესიის ვადა გასულია. გთხოვთ ხელახლა შეხვიდეთ სისტემაში.'
      });
    }
    return res.status(401).json({
      message:
        'სესიის ტოკენი არასწორია ან ძველია (მაგ. სერვერი გადაიტვირთა სხვა საიდუმლოთი). გამოდით სისტემიდან და ხელახლა შედით ანგარიშში.'
    });
  }
}
