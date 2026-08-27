import express from 'express';
import jwt from 'jsonwebtoken';
import Agent from '../models/Agent.js';
import { Property } from '../models/Property.js';
import { User } from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';
import { getJWTSecret } from '../config/jwt.js';
import { uploadAgentPhoto } from '../services/cloudinary.js';
import { backfillMissingAgentProfiles } from '../services/agentProfile.js';
import {
  applyPropertyQueryFilters,
  applyListingVisibilityFilter,
  queryPropertiesSorted,
  PUBLIC_LISTING_OR,
  PUBLIC_STATUS_OR,
} from '../utils/propertyQueryFilters.js';
import { PROPERTY_NOT_DELETED, withNotDeleted } from '../utils/propertySoftDelete.js';
import { isAdminRole } from '../utils/userRoles.js';
import {
  applyTranslation,
  fillMissingTranslationsForResponse,
  pickLanguage,
  scheduleListTranslations,
  stripHiddenCadastral,
} from '../utils/propertyTranslations.js';

const router = express.Router();

const upload = uploadAgentPhoto;

async function isRequestAdmin(req) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return false;
  try {
    const decoded = jwt.verify(token, getJWTSecret());
    const me = await User.findById(decoded.sub).select('role').lean();
    return isAdminRole(me?.role);
  } catch {
    return false;
  }
}

// Get all agents (public)
router.get('/', async (req, res) => {
  try {
    await backfillMissingAgentProfiles();

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
    const agent = await Agent.findById(req.params.id).populate('user', 'name avatar phone email');
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    const doc = agent.toObject();
    const u = doc.user;
    if (u && typeof u === 'object') {
      if (!doc.photo && u.avatar) doc.photo = u.avatar;
      const userName = String(u.name || '').trim();
      if (userName && (!doc.name || doc.name === String(u.email || '').split('@')[0])) {
        doc.name = userName;
      }
      doc.user = u._id;
    }
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get agent's properties (public; admins can request non-public via adminView=1)
router.get('/:id/properties', async (req, res) => {
  try {
    const agent = await Agent.findById(req.params.id).select('user').lean();
    if (!agent?.user) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const { page = 1, limit = 200 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(5000, Math.max(1, parseInt(limit, 10) || 200));
    const skip = (pageNum - 1) * limitNum;

    const adminView =
      (req.query.adminView === '1' || req.query.adminView === 'true') &&
      (await isRequestAdmin(req));

    let agentFilter;
    if (adminView) {
      agentFilter = withNotDeleted({ userId: agent.user });
      applyListingVisibilityFilter(
        agentFilter,
        req.query.listingVisibility || req.query.brokerListingMode || ''
      );
    } else {
      agentFilter = {
        userId: agent.user,
        $and: [{ ...PUBLIC_STATUS_OR }, { ...PUBLIC_LISTING_OR }, PROPERTY_NOT_DELETED],
      };
    }

    await applyPropertyQueryFilters(agentFilter, req.query);

    const lang = pickLanguage(req);
    const selectFields = adminView ? '-privateNotes' : '-privateNotes -shareToken';

    const countPromises = [
      queryPropertiesSorted(Property, agentFilter, req.query.sort, {
        skip,
        limit: limitNum,
        select: selectFields,
      }),
      Property.countDocuments(agentFilter),
    ];

    if (adminView) {
      const base = withNotDeleted({ userId: agent.user });
      const publicF = withNotDeleted({ userId: agent.user });
      applyListingVisibilityFilter(publicF, 'public');
      const unlistedF = withNotDeleted({ userId: agent.user });
      applyListingVisibilityFilter(unlistedF, 'unlisted');
      const privateF = withNotDeleted({ userId: agent.user });
      applyListingVisibilityFilter(privateF, 'private');
      const soldF = withNotDeleted({ userId: agent.user });
      applyListingVisibilityFilter(soldF, 'sold');
      countPromises.push(
        Property.countDocuments(base),
        Property.countDocuments(publicF),
        Property.countDocuments(unlistedF),
        Property.countDocuments(privateF),
        Property.countDocuments(soldF)
      );
    }

    const results = await Promise.all(countPromises);
    const properties = results[0];
    const total = results[1];

    await fillMissingTranslationsForResponse(properties, lang);
    scheduleListTranslations(properties, lang);

    const translated = properties.map((p) => stripHiddenCadastral(applyTranslation(p, lang)));

    const payload = {
      properties: translated,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    };

    if (adminView) {
      payload.visibilityCounts = {
        all: results[2] || 0,
        public: results[3] || 0,
        unlisted: results[4] || 0,
        private: results[5] || 0,
        sold: results[6] || 0,
      };
      payload.adminView = true;
    }

    res.json(payload);
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
      updateData.photo = req.file.path;
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
