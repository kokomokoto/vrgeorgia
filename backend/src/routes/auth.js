import express from 'express';
import path from 'node:path';
import multer from 'multer';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, path.resolve(process.cwd(), 'uploads')),
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `avatar_${Date.now()}_${safe}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

import Agent from '../models/Agent.js';

router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isString().isLength({ min: 6 }),
    body('phone').optional().isString().trim().isLength({ max: 50 }),
    body('name').optional().isString().trim().isLength({ max: 100 }),
    body('role').optional().isIn(['user', 'agent']),
    // Agent specific field
    body('personalId').optional().isString().trim().isLength({ max: 11 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password, phone = '', name = '', role = 'user' } = req.body;

    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ message: 'Email already in use' });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ email, passwordHash, phone, name, role });

    // If registering as agent, create agent profile
    if (role === 'agent') {
      const { personalId = '' } = req.body;
      // Update user with personalId
      user.personalId = personalId;
      await user.save();
      
      await Agent.create({
        user: user._id,
        name: name,
        phone,
        email,
        personalId,
        active: true,
        verified: false
      });
    }

    const token = jwt.sign({ sub: user._id.toString() }, process.env.JWT_SECRET || 'dev_secret_change_in_production', {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });

    res.json({ token, user: { id: user._id, email: user.email, phone: user.phone, avatar: user.avatar, name: user.name, role: user.role } });
  }
);

router.post(
  '/login',
  [body('email').isEmail().normalizeEmail(), body('password').isString()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ sub: user._id.toString() }, process.env.JWT_SECRET || 'dev_secret_change_in_production', {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });

    res.json({ token, user: { id: user._id, email: user.email, phone: user.phone, avatar: user.avatar, name: user.name, role: user.role } });
  }
);

// Get current user profile
router.get('/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json({ user: { id: user._id, email: user.email, phone: user.phone, avatar: user.avatar, name: user.name, role: user.role } });
});

// Update profile
router.put(
  '/profile',
  requireAuth,
  [
    body('phone').optional().isString().trim().isLength({ max: 50 }),
    body('name').optional().isString().trim().isLength({ max: 100 }),
    body('email').optional().isEmail().normalizeEmail()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const updates = {};
    if (req.body.phone !== undefined) updates.phone = req.body.phone;
    if (req.body.name !== undefined) updates.name = req.body.name;
    
    // Check if email is being changed and if it's already taken
    if (req.body.email !== undefined) {
      // First get the current user to check if email actually changed
      const currentUser = await User.findById(req.user.id);
      if (currentUser && currentUser.email !== req.body.email) {
        // Email is being changed, check if new email is already taken
        const existing = await User.findOne({ email: req.body.email, _id: { $ne: req.user.id } });
        if (existing) return res.status(409).json({ message: 'ეს მეილი უკვე გამოიყენება' });
        updates.email = req.body.email;
      }
      // If email is the same, don't add to updates
    }

    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({ user: { id: user._id, email: user.email, phone: user.phone, avatar: user.avatar, name: user.name } });
  }
);

// Upload avatar
router.post('/avatar', requireAuth, upload.single('avatar'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

  const avatarPath = `/uploads/${req.file.filename}`;
  const user = await User.findByIdAndUpdate(req.user.id, { avatar: avatarPath }, { new: true });
  if (!user) return res.status(404).json({ message: 'User not found' });

  res.json({ user: { id: user._id, email: user.email, phone: user.phone, avatar: user.avatar, name: user.name } });
});

// ========== FAVORITES ==========

// Get user's favorites
router.get('/favorites', requireAuth, async (req, res) => {
  const user = await User.findById(req.user.id).populate('favorites');
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json({ favorites: user.favorites || [] });
});

// Add to favorites
router.post('/favorites/:propertyId', requireAuth, async (req, res) => {
  const { propertyId } = req.params;
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  
  if (!user.favorites.includes(propertyId)) {
    user.favorites.push(propertyId);
    await user.save();
  }
  
  res.json({ favorites: user.favorites, message: 'Added to favorites' });
});

// Remove from favorites
router.delete('/favorites/:propertyId', requireAuth, async (req, res) => {
  const { propertyId } = req.params;
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  
  user.favorites = user.favorites.filter(id => id.toString() !== propertyId);
  await user.save();
  
  res.json({ favorites: user.favorites, message: 'Removed from favorites' });
});

// Check if property is in favorites
router.get('/favorites/check/:propertyId', requireAuth, async (req, res) => {
  const { propertyId } = req.params;
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  
  const isFavorite = user.favorites.some(id => id.toString() === propertyId);
  res.json({ isFavorite });
});

export default router;
