import mongoose from 'mongoose';

const pageViewSchema = new mongoose.Schema({
  // რომელი გვერდი
  path: { type: String, required: true, index: true },
  
  // თუ ობიექტის გვერდია — propertyId
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', default: null, index: true },
  
  // თუ აგენტის გვერდია — agentId  
  agentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent', default: null, index: true },
  
  // მომხმარებლის ინფორმაცია
  sessionId: { type: String, default: '' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  
  // მოწყობილობა
  device: { type: String, enum: ['desktop', 'mobile', 'tablet', 'unknown'], default: 'unknown' },
  browser: { type: String, default: '' },
  browserVersion: { type: String, default: '' },
  os: { type: String, default: '' },
  
  // ეკრანი
  screenWidth: { type: Number, default: 0 },
  screenHeight: { type: Number, default: 0 },
  viewportWidth: { type: Number, default: 0 },
  viewportHeight: { type: Number, default: 0 },
  pixelRatio: { type: Number, default: 1 },
  
  // ბატარეა (მობილურისთვის)
  batteryLevel: { type: Number, default: null },
  batteryCharging: { type: Boolean, default: null },
  
  // კავშირი
  connectionType: { type: String, default: '' },
  connectionDownlink: { type: Number, default: null },
  
  // ენა და ზონა
  language: { type: String, default: '' },
  timezone: { type: String, default: '' },
  
  // პლატფორმა
  platform: { type: String, default: '' },
  vendor: { type: String, default: '' },
  cookiesEnabled: { type: Boolean, default: true },
  doNotTrack: { type: Boolean, default: false },
  touchSupport: { type: Boolean, default: false },
  maxTouchPoints: { type: Number, default: 0 },
  
  // მეხსიერება
  deviceMemory: { type: Number, default: null },
  hardwareConcurrency: { type: Number, default: null },
  
  // გეო (IP-დან)
  ip: { type: String, default: '' },
  country: { type: String, default: '' },
  countryCode: { type: String, default: '' },
  city: { type: String, default: '' },
  region: { type: String, default: '' },
  lat: { type: Number, default: null },
  lon: { type: Number, default: null },
  isp: { type: String, default: '' },
  
  // რეფერერი
  referrer: { type: String, default: '' },
  
  // გვერდზე დაყოვნების დრო (წამები)
  duration: { type: Number, default: 0 },
  
  // დრო
  createdAt: { type: Date, default: Date.now }
});

// TTL index — 90 დღის შემდეგ ავტომატური წაშლა
pageViewSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

pageViewSchema.index({ device: 1 });
pageViewSchema.index({ country: 1 });
pageViewSchema.index({ city: 1 });
pageViewSchema.index({ browser: 1 });
pageViewSchema.index({ sessionId: 1 });

export const PageView = mongoose.model('PageView', pageViewSchema);
