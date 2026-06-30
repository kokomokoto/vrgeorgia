import express from 'express';
import { User } from '../models/User.js';
import { Property } from '../models/Property.js';
import Agent from '../models/Agent.js';
import Message from '../models/Message.js';
import { PageView } from '../models/PageView.js';
import { AdminAuditLog } from '../models/AdminAuditLog.js';
import { requireAuth } from '../middleware/auth.js';
import { normalizeTourLink } from '../utils/tourLink.js';
import { syncAgentProfileForUser, backfillMissingAgentProfiles } from '../services/agentProfile.js';
import { applyPropertyQueryFilters, parsePropertySortOption } from '../utils/propertyQueryFilters.js';
import { getSearchAnalyticsStats } from '../utils/searchAnalyticsAgg.js';
import { getAgentPortfolioStats } from '../utils/agentPortfolioStats.js';
import { isAdminRole, isAgentRole, USER_ROLES } from '../utils/userRoles.js';

const router = express.Router();

async function writeAudit(adminId, action, targetType, targetId, meta = {}) {
  try {
    await AdminAuditLog.create({ adminId, action, targetType, targetId: String(targetId), meta });
  } catch (_err) {
    // audit logging must not block main flow
  }
}

// Admin middleware - check if user is admin
const adminMiddleware = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || !isAdminRole(user.role)) {
      return res.status(403).json({ message: 'წვდომა აკრძალულია. მხოლოდ ადმინისტრატორისთვის.' });
    }
    next();
  } catch (error) {
    res.status(500).json({ message: 'სერვერის შეცდომა' });
  }
};

// Lightweight counts for admin sidebar badges
router.get('/counts', requireAuth, adminMiddleware, async (req, res) => {
  try {
    const [pendingRegistrations, pendingProperties] = await Promise.all([
      User.countDocuments({ status: 'pending' }),
      Property.countDocuments({ status: 'pending' }),
    ]);
    res.json({ pendingRegistrations, pendingProperties });
  } catch (_error) {
    res.status(500).json({ message: 'მონაცემების მიღება ვერ მოხერხდა' });
  }
});

// Get dashboard statistics
router.get('/stats', requireAuth, adminMiddleware, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const pendingRegistrations = await User.countDocuments({ status: 'pending' });
    const totalAgents = await Agent.countDocuments();
    const unverifiedAgents = await Agent.countDocuments({ verified: false });
    const totalProperties = await Property.countDocuments();
    const pendingProperties = await Property.countDocuments({ status: 'pending' });
    const activeProperties = await Property.countDocuments({ status: 'active' });
    const totalMessages = await Message.countDocuments();
    
    // Get registrations by date (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentUsers = await User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });
    const recentProperties = await Property.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });
    
    // Get properties by type
    const propertiesByType = await Property.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);
    
    // Get properties by deal type
    const propertiesByDealType = await Property.aggregate([
      { $group: { _id: '$dealType', count: { $sum: 1 } } }
    ]);
    
    // Get users by role
    const usersByRole = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);
    
    // Daily registrations for chart (last 7 days)
    const dailyStats = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      
      const usersCount = await User.countDocuments({
        createdAt: { $gte: date, $lt: nextDate }
      });
      const propertiesCount = await Property.countDocuments({
        createdAt: { $gte: date, $lt: nextDate }
      });
      
      dailyStats.push({
        date: date.toISOString().split('T')[0],
        users: usersCount,
        properties: propertiesCount
      });
    }
    
    res.json({
      totalUsers,
      pendingRegistrations,
      totalAgents,
      unverifiedAgents,
      totalProperties,
      pendingProperties,
      activeProperties,
      totalMessages,
      recentUsers,
      recentProperties,
      propertiesByType,
      propertiesByDealType,
      usersByRole,
      dailyStats
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ message: 'სტატისტიკის მიღება ვერ მოხერხდა' });
  }
});

// Get all users with pagination
router.get('/users', requireAuth, adminMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const role = req.query.role || '';
    const status = req.query.status || '';
    
    const query = {};
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } }
      ];
    }
    if (role) {
      query.role = role;
    }
    if (status) {
      query.status = status;
    }
    
    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    
    res.json({
      users,
      total,
      page,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ message: 'მომხმარებლების მიღება ვერ მოხერხდა' });
  }
});

// Update user
router.put('/users/:id', requireAuth, adminMiddleware, async (req, res) => {
  try {
    const { role, name, email, phone } = req.body;
    if (role && !USER_ROLES.includes(role)) {
      return res.status(400).json({ message: 'არასწორი როლი' });
    }
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role, name, email, phone },
      { new: true }
    ).select('-passwordHash');
    
    if (!user) {
      return res.status(404).json({ message: 'მომხმარებელი ვერ მოიძებნა' });
    }

    await syncAgentProfileForUser(user);
    
    await writeAudit(req.user.id, 'user.updated', 'user', req.params.id, { role, email, phone, name });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'განახლება ვერ მოხერხდა' });
  }
});

// Approve a pending registration
router.put('/users/:id/approve', requireAuth, adminMiddleware, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status: 'approved' },
      { new: true }
    ).select('-passwordHash');
    if (!user) return res.status(404).json({ message: 'მომხმარებელი ვერ მოიძებნა' });

    if (isAgentRole(user.role)) {
      await syncAgentProfileForUser(user, { forceActive: true });
    }

    await writeAudit(req.user.id, 'user.approved', 'user', req.params.id);
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'დამტკიცება ვერ მოხერხდა' });
  }
});

// Reject a pending registration
router.put('/users/:id/reject', requireAuth, adminMiddleware, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status: 'rejected' },
      { new: true }
    ).select('-passwordHash');
    if (!user) return res.status(404).json({ message: 'მომხმარებელი ვერ მოიძებნა' });

    if (isAgentRole(user.role)) {
      await Agent.findOneAndUpdate({ user: user._id }, { active: false });
    }

    await writeAudit(req.user.id, 'user.rejected', 'user', req.params.id);
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'უარყოფა ვერ მოხერხდა' });
  }
});

// Delete user — optionally keep their properties (?keepProperties=true)
router.delete('/users/:id', requireAuth, adminMiddleware, async (req, res) => {
  try {
    const keepProperties = req.query.keepProperties === 'true';
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'მომხმარებელი ვერ მოიძებნა' });
    }

    // დაკავშირებული აგენტის პროფილიც წაიშალოს
    await Agent.deleteOne({ user: req.params.id });

    let deletedProperties = 0;
    if (!keepProperties) {
      const result = await Property.deleteMany({ userId: req.params.id });
      deletedProperties = result.deletedCount || 0;
    }

    await writeAudit(req.user.id, 'user.deleted', 'user', req.params.id, { keepProperties, deletedProperties });
    res.json({ message: 'მომხმარებელი წაიშალა', deletedProperties });
  } catch (error) {
    res.status(500).json({ message: 'წაშლა ვერ მოხერხდა' });
  }
});

// Get all agents with pagination
router.get('/agents', requireAuth, adminMiddleware, async (req, res) => {
  try {
    await backfillMissingAgentProfiles();

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const verified = req.query.verified;
    
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } }
      ];
    }
    if (verified !== undefined) {
      query.verified = verified === 'true';
    }
    
    const total = await Agent.countDocuments(query);
    const agents = await Agent.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const userIds = agents.map((a) => a.user).filter(Boolean);
    const countRows = userIds.length
      ? await Property.aggregate([
          { $match: { userId: { $in: userIds } } },
          { $group: { _id: '$userId', propertyCount: { $sum: 1 } } },
        ])
      : [];
    const countByUser = new Map(
      countRows.map((r) => [String(r._id), r.propertyCount])
    );

    const agentsWithCounts = agents.map((a) => ({
      ...a,
      propertyCount: a.user ? countByUser.get(String(a.user)) ?? 0 : 0,
    }));

    res.json({
      agents: agentsWithCounts,
      total,
      page,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ message: 'აგენტების მიღება ვერ მოხერხდა' });
  }
});

// აგენტების ანალიტიკა (განცხადებები, კატეგორიები, ნახვები)
router.get('/agents/stats', requireAuth, adminMiddleware, async (req, res) => {
  try {
    await backfillMissingAgentProfiles();
    const { period = '30d' } = req.query;
    const periodDays = period === '90d' ? 90 : period === '7d' ? 7 : 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);
    startDate.setHours(0, 0, 0, 0);
    const matchStage = { createdAt: { $gte: startDate } };
    const stats = await getAgentPortfolioStats(matchStage);
    res.json({ ...stats, period: periodDays });
  } catch (error) {
    res.status(500).json({ message: 'აგენტების სტატისტიკის მიღება ვერ მოხერხდა' });
  }
});

// Single agent (admin) + listing count
router.get('/agents/:id', requireAuth, adminMiddleware, async (req, res) => {
  try {
    await backfillMissingAgentProfiles();

    const agent = await Agent.findById(req.params.id).populate('user', 'name email role avatar phone');
    if (!agent) {
      return res.status(404).json({ message: 'აგენტი ვერ მოიძებნა' });
    }

    const doc = agent.toObject();
    const u = doc.user;
    if (u && typeof u === 'object') {
      if (!doc.photo && u.avatar) doc.photo = u.avatar;
      const userName = String(u.name || '').trim();
      if (userName) doc.name = userName;
      doc.user = u._id;
    }

    const userId = u?._id || doc.user;
    const propertyCount = userId ? await Property.countDocuments({ userId }) : 0;
    res.json({ agent: doc, propertyCount, userId: userId || null });
  } catch (error) {
    res.status(500).json({ message: 'აგენტის მიღება ვერ მოხერხდა' });
  }
});

// Verify/Unverify agent
router.put('/agents/:id/verify', requireAuth, adminMiddleware, async (req, res) => {
  try {
    const { verified } = req.body;
    const agent = await Agent.findByIdAndUpdate(
      req.params.id,
      { verified },
      { new: true }
    );
    
    if (!agent) {
      return res.status(404).json({ message: 'აგენტი ვერ მოიძებნა' });
    }
    
    await writeAudit(req.user.id, verified ? 'agent.verified' : 'agent.unverified', 'agent', req.params.id);
    res.json(agent);
  } catch (error) {
    res.status(500).json({ message: 'განახლება ვერ მოხერხდა' });
  }
});

// Delete agent — optionally also delete their listings (?deleteProperties=true)
// and optionally delete the linked user account (?deleteUser=true)
router.delete('/agents/:id', requireAuth, adminMiddleware, async (req, res) => {
  try {
    const deleteProperties = req.query.deleteProperties === 'true';
    const deleteUser = req.query.deleteUser === 'true';
    const agent = await Agent.findByIdAndDelete(req.params.id);
    if (!agent) {
      return res.status(404).json({ message: 'აგენტი ვერ მოიძებნა' });
    }

    let deletedProperties = 0;
    if (agent.user) {
      if (deleteProperties) {
        const result = await Property.deleteMany({ userId: agent.user });
        deletedProperties = result.deletedCount || 0;
      }
      if (deleteUser) {
        await User.findByIdAndDelete(agent.user);
      } else {
        // ანგარიში რჩება, მაგრამ აღარ არის აგენტი
        await User.findByIdAndUpdate(agent.user, { role: 'user' });
      }
    }

    await writeAudit(req.user.id, 'agent.deleted', 'agent', req.params.id, { deleteProperties, deleteUser, deletedProperties });
    res.json({ message: 'აგენტი წაიშალა', deletedProperties });
  } catch (error) {
    res.status(500).json({ message: 'წაშლა ვერ მოხერხდა' });
  }
});

// Get all properties with pagination (admin view)
router.get('/properties', requireAuth, adminMiddleware, async (req, res) => {
  try {
    const pageNum = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 20));

    const filter = {};
    if (req.query.status) {
      filter.status = req.query.status;
    }
    if (req.query.userId) {
      filter.userId = req.query.userId;
    }

    const filterQuery = {
      ...req.query,
      q: req.query.q || req.query.search || undefined,
    };
    await applyPropertyQueryFilters(filter, filterQuery);

    const finalSort = parsePropertySortOption(req.query.sort);

    const total = await Property.countDocuments(filter);
    const properties = await Property.find(filter)
      .populate('userId', 'name email')
      .sort(finalSort)
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    res.json({
      properties,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum) || 1,
    });
  } catch (error) {
    res.status(500).json({ message: 'განცხადებების მიღება ვერ მოხერხდა' });
  }
});

// Approve/Reject property
router.put('/properties/:id/status', requireAuth, adminMiddleware, async (req, res) => {
  try {
    const { status, reason = '' } = req.body;
    const property = await Property.findById(req.params.id).populate('userId', 'name email');
    
    if (!property) {
      return res.status(404).json({ message: 'განცხადება ვერ მოიძებნა' });
    }
    property.status = status;
    property.moderationHistory = property.moderationHistory || [];
    property.moderationHistory.push({ status, reason, adminId: req.user.id });
    await property.save();
    
    await writeAudit(req.user.id, 'property.status_changed', 'property', req.params.id, { status, reason });
    res.json(property);
  } catch (error) {
    res.status(500).json({ message: 'განახლება ვერ მოხერხდა' });
  }
});

router.put('/properties/bulk-status', requireAuth, adminMiddleware, async (req, res) => {
  try {
    const { ids = [], status, reason = '' } = req.body;
    if (!Array.isArray(ids) || ids.length === 0 || !status) {
      return res.status(400).json({ message: 'მიუთითეთ ids და status' });
    }

    const properties = await Property.find({ _id: { $in: ids } });
    for (const property of properties) {
      property.status = status;
      property.moderationHistory = property.moderationHistory || [];
      property.moderationHistory.push({ status, reason, adminId: req.user.id });
      await property.save();
      await writeAudit(req.user.id, 'property.bulk_status_changed', 'property', property._id, { status, reason });
    }

    res.json({ ok: true, updated: properties.length });
  } catch (error) {
    res.status(500).json({ message: 'მასიური განახლება ვერ მოხერხდა' });
  }
});

// Delete property
router.delete('/properties/:id', requireAuth, adminMiddleware, async (req, res) => {
  try {
    const property = await Property.findByIdAndDelete(req.params.id);
    if (!property) {
      return res.status(404).json({ message: 'განცხადება ვერ მოიძებნა' });
    }
    
    await writeAudit(req.user.id, 'property.deleted', 'property', req.params.id);
    res.json({ message: 'განცხადება წაიშალა' });
  } catch (error) {
    res.status(500).json({ message: 'წაშლა ვერ მოხერხდა' });
  }
});

// Pin/Unpin property — აპინული ობიექტები მთავარ გვერდზე პირველ რიგში ჩანს
router.put('/properties/:id/pin', requireAuth, adminMiddleware, async (req, res) => {
  try {
    const pinned = req.body.pinned !== false; // default true
    const property = await Property.findByIdAndUpdate(
      req.params.id,
      { pinned, pinnedAt: pinned ? new Date() : null },
      { new: true }
    );
    if (!property) return res.status(404).json({ message: 'განცხადება ვერ მოიძებნა' });

    await writeAudit(req.user.id, pinned ? 'property.pinned' : 'property.unpinned', 'property', req.params.id);
    res.json(property);
  } catch (error) {
    res.status(500).json({ message: 'განახლება ვერ მოხერხდა' });
  }
});

// ═══════════════════════════════════════
// 3D ტურები — სრული სია, რედაქტირება, წაშლა
// ═══════════════════════════════════════

// Get all properties that have a 3D tour attached
router.get('/tours', requireAuth, adminMiddleware, async (req, res) => {
  try {
    const pageNum = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));

    const filter = { tourLink: { $exists: true, $ne: '' } };
    const filterQuery = {
      ...req.query,
      q: req.query.q || req.query.search || undefined,
    };
    await applyPropertyQueryFilters(filter, filterQuery);

    const finalSort = req.query.sort
      ? parsePropertySortOption(req.query.sort)
      : { updatedAt: -1 };

    const total = await Property.countDocuments(filter);
    const properties = await Property.find(filter)
      .select('title city tbilisiDistrict type dealType price priceCurrency photos status tourLink exteriorLink interiorLink userId createdAt updatedAt')
      .populate('userId', 'name email')
      .sort(finalSort)
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean();

    // ძველი localhost ბმულების ავტომატური გასწორება MongoDB-ში
    for (const p of properties) {
      if (!p.tourLink) continue;
      const fixed = normalizeTourLink(p.tourLink);
      if (fixed !== p.tourLink) {
        await Property.updateOne({ _id: p._id }, { tourLink: fixed });
      }
      p.tourLink = fixed;
    }

    res.json({
      properties,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum) || 1,
    });
  } catch (error) {
    res.status(500).json({ message: '3D ტურების მიღება ვერ მოხერხდა' });
  }
});

// Remove a 3D tour link from a property (does not delete the property)
router.delete('/tours/:id', requireAuth, adminMiddleware, async (req, res) => {
  try {
    const property = await Property.findByIdAndUpdate(
      req.params.id,
      { tourLink: '' },
      { new: true }
    );
    if (!property) return res.status(404).json({ message: 'განცხადება ვერ მოიძებნა' });

    await writeAudit(req.user.id, 'tour.removed', 'property', req.params.id);
    res.json({ message: '3D ტური წაიშალა განცხადებიდან' });
  } catch (error) {
    res.status(500).json({ message: 'წაშლა ვერ მოხერხდა' });
  }
});

// Get messages/reports
router.get('/messages', requireAuth, adminMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    
    const total = await Message.countDocuments();
    const messages = await Message.find()
      .populate('sender', 'name email')
      .populate('receiver', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    
    res.json({
      messages,
      total,
      page,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ message: 'შეტყობინებების მიღება ვერ მოხერხდა' });
  }
});

router.get('/audit-logs', requireAuth, adminMiddleware, async (req, res) => {
  try {
    const pageNum = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const action = (req.query.action || '').trim();
    const targetType = (req.query.targetType || '').trim();

    const filter = {};
    if (action) filter.action = action;
    if (targetType) filter.targetType = targetType;

    const [total, logs] = await Promise.all([
      AdminAuditLog.countDocuments(filter),
      AdminAuditLog.find(filter)
        .populate('adminId', 'name email')
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
    ]);

    res.json({
      logs,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum) || 1,
    });
  } catch (_error) {
    res.status(500).json({ message: 'ლოგების მიღება ვერ მოხერხდა' });
  }
});

// ═══════════════════════════════════════
// ანალიტიკა — მონიტორინგის ენდპოინტები
// ═══════════════════════════════════════

// მთავარი ანალიტიკის endpoint
router.get('/analytics', requireAuth, adminMiddleware, async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    
    // პერიოდის გამოთვლა
    const periodDays = period === '30d' ? 30 : period === '90d' ? 90 : 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);
    startDate.setHours(0, 0, 0, 0);
    
    const matchStage = { createdAt: { $gte: startDate } };
    
    // 1. მთლიანი ვიზიტები
    const totalViews = await PageView.countDocuments(matchStage);
    
    // 2. უნიკალური ვიზიტორები (sessionId-ით)
    const uniqueVisitors = await PageView.distinct('sessionId', matchStage);
    const uniqueCount = uniqueVisitors.filter(s => s).length;
    
    // 3. მოწყობილობების სტატისტიკა
    const deviceStats = await PageView.aggregate([
      { $match: matchStage },
      { $group: { _id: '$device', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    // 4. ბრაუზერების სტატისტიკა
    const browserStats = await PageView.aggregate([
      { $match: matchStage },
      { $group: { _id: '$browser', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    // 5. ოპერაციული სისტემების სტატისტიკა
    const osStats = await PageView.aggregate([
      { $match: matchStage },
      { $group: { _id: '$os', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    // 6. ყველაზე პოპულარული გვერდები
    const topPages = await PageView.aggregate([
      { $match: matchStage },
      { $group: { _id: '$path', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]);
    
    // 7. ყველაზე ნახვადი ობიექტები
    const topProperties = await PageView.aggregate([
      { $match: { ...matchStage, propertyId: { $ne: null } } },
      { $group: { _id: '$propertyId', views: { $sum: 1 }, uniqueSessions: { $addToSet: '$sessionId' } } },
      { $addFields: { uniqueViews: { $size: '$uniqueSessions' } } },
      { $sort: { views: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'properties', localField: '_id', foreignField: '_id', as: 'property' } },
      { $unwind: { path: '$property', preserveNullAndEmptyArrays: true } },
      { $project: { views: 1, uniqueViews: 1, 'property.title': 1, 'property.city': 1, 'property.price': 1, 'property.photos': 1, 'property.mainPhoto': 1 } }
    ]);
    
    // 8. ყველაზე ნახვადი აგენტები
    const topAgents = await PageView.aggregate([
      { $match: { ...matchStage, agentId: { $ne: null } } },
      { $group: { _id: '$agentId', views: { $sum: 1 } } },
      { $sort: { views: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'agents', localField: '_id', foreignField: '_id', as: 'agent' } },
      { $unwind: { path: '$agent', preserveNullAndEmptyArrays: true } },
      { $project: { views: 1, 'agent.name': 1, 'agent.verified': 1, 'agent.photo': 1 } }
    ]);
    
    // 9. დღიური სტატისტიკა (გრაფიკისთვის)
    const dailyViews = await PageView.aggregate([
      { $match: matchStage },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        views: { $sum: 1 },
        uniqueSessions: { $addToSet: '$sessionId' }
      }},
      { $addFields: { uniqueVisitors: { $size: '$uniqueSessions' } } },
      { $project: { uniqueSessions: 0 } },
      { $sort: { _id: 1 } }
    ]);
    
    // 10. საათობრივი განაწილება (დღეს)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const hourlyToday = await PageView.aggregate([
      { $match: { createdAt: { $gte: today } } },
      { $group: {
        _id: { $hour: '$createdAt' },
        count: { $sum: 1 }
      }},
      { $sort: { _id: 1 } }
    ]);
    
    // 11. რეფერერების სტატისტიკა
    const referrerStats = await PageView.aggregate([
      { $match: { ...matchStage, referrer: { $ne: '' } } },
      { $group: { _id: '$referrer', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // 12. ვიზიტორების გეოგრაფია — ქვეყნები (IP-ით)
    const countryStats = await PageView.aggregate([
      { $match: { ...matchStage, country: { $nin: ['', 'Local'] } } },
      {
        $group: {
          _id: '$country',
          code: { $first: '$countryCode' },
          count: { $sum: 1 },
          uniqueSessions: { $addToSet: '$sessionId' },
        },
      },
      {
        $project: {
          _id: 1,
          code: 1,
          count: 1,
          uniqueVisitors: { $size: '$uniqueSessions' },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ]);

    // 13. ვიზიტორების გეოგრაფია — ქალაქები (IP-ით)
    const cityStats = await PageView.aggregate([
      { $match: { ...matchStage, city: { $nin: ['', 'Localhost'] } } },
      {
        $group: {
          _id: '$city',
          country: { $first: '$country' },
          countryCode: { $first: '$countryCode' },
          region: { $first: '$region' },
          count: { $sum: 1 },
          uniqueSessions: { $addToSet: '$sessionId' },
        },
      },
      {
        $project: {
          _id: 1,
          country: 1,
          countryCode: 1,
          region: 1,
          count: 1,
          uniqueVisitors: { $size: '$uniqueSessions' },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 25 },
    ]);

    const agentPortfolioStats = await getAgentPortfolioStats(matchStage);
    
    res.json({
      period: periodDays,
      totalViews,
      uniqueVisitors: uniqueCount,
      deviceStats,
      browserStats,
      osStats,
      topPages,
      topProperties,
      topAgents,
      dailyViews,
      hourlyToday,
      referrerStats,
      countryStats,
      cityStats,
      agentPortfolioStats,
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ message: 'ანალიტიკის მიღება ვერ მოხერხდა' });
  }
});

// სერჩის ანალიტიკა — ცალკე endpoint
router.get('/analytics/search', requireAuth, adminMiddleware, async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    const periodDays = period === '30d' ? 30 : period === '90d' ? 90 : 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);
    startDate.setHours(0, 0, 0, 0);

    const matchStage = { createdAt: { $gte: startDate } };
    const searchStats = await getSearchAnalyticsStats(matchStage);

    res.json({ period: periodDays, searchStats });
  } catch (error) {
    console.error('Search analytics error:', error);
    res.status(500).json({ message: 'სერჩის ანალიტიკის მიღება ვერ მოხერხდა' });
  }
});

export default router;
