import express from 'express';
import Message from '../models/Message.js';
import { Property } from '../models/Property.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Get conversations list (unique users the current user has messaged with)
router.get('/conversations', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Find all unique conversations
    const messages = await Message.aggregate([
      {
        $match: {
          $or: [{ sender: userId }, { receiver: userId }]
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$sender', userId] },
              '$receiver',
              '$sender'
            ]
          },
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: [
                { $and: [
                  { $eq: ['$receiver', userId] },
                  { $eq: ['$read', false] }
                ]},
                1,
                0
              ]
            }
          }
        }
      }
    ]);
    
    // Populate user info
    const populatedMessages = await Message.populate(messages, [
      { path: '_id', model: 'User', select: 'email phone username avatar' },
      { path: 'lastMessage.property', model: 'Property', select: 'title photos' }
    ]);
    
    const conversations = populatedMessages.map(m => ({
      user: m._id,
      lastMessage: {
        content: m.lastMessage.content,
        createdAt: m.lastMessage.createdAt,
        isFromMe: m.lastMessage.sender.toString() === userId,
        property: m.lastMessage.property
      },
      unreadCount: m.unreadCount
    }));
    
    res.json(conversations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get messages with a specific user
router.get('/with/:userId', requireAuth, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const otherUserId = req.params.userId;
    const { page = 1, limit = 50 } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const messages = await Message.find({
      $or: [
        { sender: currentUserId, receiver: otherUserId },
        { sender: otherUserId, receiver: currentUserId }
      ]
    })
      .populate('property', 'title photos')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    // Mark messages as read
    await Message.updateMany(
      { sender: otherUserId, receiver: currentUserId, read: false },
      { read: true, readAt: new Date() }
    );
    
    res.json(messages.reverse()); // Oldest first for display
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Send a message
router.post('/send', requireAuth, async (req, res) => {
  try {
    const senderId = req.user.id;
    const { receiverId, content, propertyId } = req.body;
    
    if (!receiverId || !content) {
      return res.status(400).json({ error: 'Receiver and content are required' });
    }
    
    if (senderId === receiverId) {
      return res.status(400).json({ error: 'Cannot send message to yourself' });
    }
    
    const messageData = {
      sender: senderId,
      receiver: receiverId,
      content: content.trim()
    };
    
    if (propertyId) {
      // Verify property exists
      const property = await Property.findById(propertyId);
      if (property) {
        messageData.property = propertyId;
      }
    }
    
    const message = new Message(messageData);
    await message.save();
    
    // Populate and return
    await message.populate([
      { path: 'sender', select: 'email username avatar' },
      { path: 'property', select: 'title photos' }
    ]);
    
    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get unread count
router.get('/unread-count', requireAuth, async (req, res) => {
  try {
    const count = await Message.countDocuments({
      receiver: req.user.id,
      read: false
    });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark conversation as read
router.put('/read/:userId', requireAuth, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const otherUserId = req.params.userId;
    
    await Message.updateMany(
      { sender: otherUserId, receiver: currentUserId, read: false },
      { read: true, readAt: new Date() }
    );
    
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Contact property owner
router.post('/contact-owner/:propertyId', requireAuth, async (req, res) => {
  try {
    const senderId = req.user.id;
    const { propertyId } = req.params;
    const { content } = req.body;
    
    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }
    
    const receiverId = property.userId.toString();
    
    if (senderId === receiverId) {
      return res.status(400).json({ error: 'Cannot message yourself' });
    }
    
    const message = new Message({
      sender: senderId,
      receiver: receiverId,
      content: content.trim(),
      property: propertyId
    });
    
    await message.save();
    
    res.status(201).json({ ok: true, message });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
