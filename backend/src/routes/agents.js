import express from 'express';
import Agent from '../models/Agent.js';
import { Property } from '../models/Property.js';
import { requireAuth } from '../middleware/auth.js';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';

const router = express.Router();

// Multer config for agent photos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(process.cwd(), 'uploads/agents');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `agent-${Date.now()}${ext}`);
  }
});
const upload = multer({ storage });

// Get all agents (public)
router.get('/', async (req, res) => {
  try {
    const { city, specialization, minRating, page = 1, limit = 20 } = req.query;
    
    const filter = { active: true };
    
    if (city) {
      filter.areas = city;
    }
    if (specialization) {
      filter.specializations = specialization;
    }
    if (minRating) {
      filter.avgRating = { $gte: parseFloat(minRating) };
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [agents, total] = await Promise.all([
      Agent.find(filter)
        .select('-ratings')
        .sort({ avgRating: -1, totalReviews: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Agent.countDocuments(filter)
    ]);
    
    res.json({ agents, total, page: parseInt(page), totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single agent by ID (public)
router.get('/:id', async (req, res) => {
  try {
    const agent = await Agent.findById(req.params.id);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    res.json(agent);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get agent's properties (public)
router.get('/:id/properties', async (req, res) => {
  try {
    const { page = 1, limit = 12 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [properties, total] = await Promise.all([
      Property.find({ agentId: req.params.id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Property.countDocuments({ agentId: req.params.id })
    ]);
    
    res.json({ properties, total, page: parseInt(page), totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get agent's reviews (public)
router.get('/:id/reviews', async (req, res) => {
  try {
    const agent = await Agent.findById(req.params.id)
      .populate('ratings.user', 'username');
    
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    // Sort reviews by date (newest first)
    const reviews = agent.ratings.sort((a, b) => b.createdAt - a.createdAt);
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create or update own agent profile (authenticated)
router.post('/profile', requireAuth, upload.single('photo'), async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      name, phone, email, company, license, experience,
      specializations, areas, languages,
      bio_ka, bio_en, bio_ru, bio_tr, bio_az
    } = req.body;
    
    let agent = await Agent.findOne({ user: userId });
    
    const updateData = {
      name,
      phone,
      email,
      company: company || '',
      license: license || '',
      experience: parseInt(experience) || 0,
      specializations: specializations ? JSON.parse(specializations) : [],
      areas: areas ? JSON.parse(areas) : [],
      languages: languages ? JSON.parse(languages) : [],
      bio: {
        ka: bio_ka || '',
        en: bio_en || '',
        ru: bio_ru || '',
        tr: bio_tr || '',
        az: bio_az || ''
      }
    };
    
    if (req.file) {
      updateData.photo = `/uploads/agents/${req.file.filename}`;
    }
    
    if (agent) {
      // Update existing
      Object.assign(agent, updateData);
      await agent.save();
    } else {
      // Create new
      agent = new Agent({
        user: userId,
        ...updateData
      });
      await agent.save();
    }
    
    res.json(agent);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get own agent profile (authenticated)
router.get('/me/profile', requireAuth, async (req, res) => {
  try {
    const agent = await Agent.findOne({ user: req.user.id });
    if (!agent) {
      return res.status(404).json({ error: 'Agent profile not found' });
    }
    res.json(agent);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a review to an agent (authenticated)
router.post('/:id/review', requireAuth, async (req, res) => {
  try {
    const { score, review } = req.body;
    const userId = req.user.id;
    
    if (!score || score < 1 || score > 5) {
      return res.status(400).json({ error: 'Score must be between 1 and 5' });
    }
    
    const agent = await Agent.findById(req.params.id);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    // Can't review yourself
    if (agent.user.toString() === userId) {
      return res.status(400).json({ error: 'Cannot review yourself' });
    }
    
    // Check if user already reviewed
    const existingReview = agent.ratings.find(r => r.user.toString() === userId);
    if (existingReview) {
      // Update existing review
      existingReview.score = score;
      existingReview.review = review || '';
      existingReview.createdAt = new Date();
    } else {
      // Add new review
      agent.ratings.push({
        user: userId,
        score,
        review: review || ''
      });
    }
    
    // Recalculate rating
    agent.calculateRating();
    await agent.save();
    
    res.json({ avgRating: agent.avgRating, totalReviews: agent.totalReviews });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete own review (authenticated)
router.delete('/:id/review', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const agent = await Agent.findById(req.params.id);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    const reviewIndex = agent.ratings.findIndex(r => r.user.toString() === userId);
    if (reviewIndex === -1) {
      return res.status(404).json({ error: 'Review not found' });
    }
    
    agent.ratings.splice(reviewIndex, 1);
    agent.calculateRating();
    await agent.save();
    
    res.json({ message: 'Review deleted', avgRating: agent.avgRating, totalReviews: agent.totalReviews });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
