import mongoose from 'mongoose';

const pageViewSchema = new mongoose.Schema({
  // რომელი გვერდი
  path: { type: String, required: true, index: true },
  
  // თუ ობიექტის გვერდია — propertyId
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', default: null, index: true },
  
  // თუ აგენტის გვერდია — agentId  
  agentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent', default: null, index: true },
  
  // მომხმარებლის ინფორმაცია
  sessionId: { type: String, default: '' }, // ანონიმური session ID
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  
  // მოწყობილობა
  device: { type: String, enum: ['desktop', 'mobile', 'tablet', 'unknown'], default: 'unknown' },
  browser: { type: String, default: '' },
  os: { type: String, default: '' },
  
  // გეო
  ip: { type: String, default: '' },
  country: { type: String, default: '' },
  
  // რეფერერი (საიდან მოვიდა)
  referrer: { type: String, default: '' },
  
  // დრო
  createdAt: { type: Date, default: Date.now }
});

// TTL index — ძველი მონაცემების ავტომატური წაშლა (90 დღის შემდეგ)
// Note: TTL index already handles the createdAt field
pageViewSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

// Compound indexes for common queries
pageViewSchema.index({ device: 1 });
pageViewSchema.index({ path: 1 });

export const PageView = mongoose.model('PageView', pageViewSchema);
