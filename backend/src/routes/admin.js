import express from 'express';
import { User } from '../models/User.js';
import { Property } from '../models/Property.js';
import Agent from '../models/Agent.js';
import Message from '../models/Message.js';
import { PageView } from '../models/PageView.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Admin middleware - check if user is admin
const adminMiddleware = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'წვდომა აკრძალულია. მხოლოდ ადმინისტრატორისთვის.' });
    }
    next();
  } catch (error) {
    res.status(500).json({ message: 'სერვერის შეცდომა' });
  }
};

// Get dashboard statistics
router.get('/stats', requireAuth, adminMiddleware, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: 'user' });
    const totalAgents = await Agent.countDocuments();
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
      { $group: { _id: '$propertyType', count: { $sum: 1 } } }
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
      totalAgents,
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
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role, name, email, phone },
      { new: true }
    ).select('-passwordHash');
    
    if (!user) {
      return res.status(404).json({ message: 'მომხმარებელი ვერ მოიძებნა' });
    }
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'განახლება ვერ მოხერხდა' });
  }
});

// Delete user
router.delete('/users/:id', requireAuth, adminMiddleware, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'მომხმარებელი ვერ მოიძებნა' });
    }
    
    // Also delete user's properties
    await Property.deleteMany({ owner: req.params.id });
    
    res.json({ message: 'მომხმარებელი წაიშალა' });
  } catch (error) {
    res.status(500).json({ message: 'წაშლა ვერ მოხერხდა' });
  }
});

// Get all agents with pagination
router.get('/agents', requireAuth, adminMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const verified = req.query.verified;
    
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { agency: { $regex: search, $options: 'i' } }
      ];
    }
    if (verified !== undefined) {
      query.verified = verified === 'true';
    }
    
    const total = await Agent.countDocuments(query);
    const agents = await Agent.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    
    res.json({
      agents,
      total,
      page,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ message: 'აგენტების მიღება ვერ მოხერხდა' });
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
    
    res.json(agent);
  } catch (error) {
    res.status(500).json({ message: 'განახლება ვერ მოხერხდა' });
  }
});

// Delete agent
router.delete('/agents/:id', requireAuth, adminMiddleware, async (req, res) => {
  try {
    const agent = await Agent.findByIdAndDelete(req.params.id);
    if (!agent) {
      return res.status(404).json({ message: 'აგენტი ვერ მოიძებნა' });
    }
    
    // Also update user role if linked
    if (agent.userId) {
      await User.findByIdAndUpdate(agent.userId, { role: 'user' });
    }
    
    res.json({ message: 'აგენტი წაიშალა' });
  } catch (error) {
    res.status(500).json({ message: 'წაშლა ვერ მოხერხდა' });
  }
});

// Get all properties with pagination (admin view)
router.get('/properties', requireAuth, adminMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status || '';
    const propertyType = req.query.propertyType || '';
    
    const query = {};
    if (status) {
      query.status = status;
    }
    if (propertyType) {
      query.propertyType = propertyType;
    }
    
    const total = await Property.countDocuments(query);
    const properties = await Property.find(query)
      .populate('owner', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    
    res.json({
      properties,
      total,
      page,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ message: 'განცხადებების მიღება ვერ მოხერხდა' });
  }
});

// Approve/Reject property
router.put('/properties/:id/status', requireAuth, adminMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const property = await Property.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('owner', 'name email');
    
    if (!property) {
      return res.status(404).json({ message: 'განცხადება ვერ მოიძებნა' });
    }
    
    res.json(property);
  } catch (error) {
    res.status(500).json({ message: 'განახლება ვერ მოხერხდა' });
  }
});

// Delete property
router.delete('/properties/:id', requireAuth, adminMiddleware, async (req, res) => {
  try {
    const property = await Property.findByIdAndDelete(req.params.id);
    if (!property) {
      return res.status(404).json({ message: 'განცხადება ვერ მოიძებნა' });
    }
    
    res.json({ message: 'განცხადება წაიშალა' });
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
      referrerStats
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ message: 'ანალიტიკის მიღება ვერ მოხერხდა' });
  }
});

export default router;
