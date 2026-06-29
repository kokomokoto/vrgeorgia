import mongoose from 'mongoose';

const searchEventSchema = new mongoose.Schema({
  source: {
    type: String,
    enum: ['home', 'map', 'agent', 'admin_tours', 'admin_properties'],
    default: 'home',
    index: true,
  },
  agentId: { type: String, default: '' },
  sessionId: { type: String, default: '', index: true },
  q: { type: String, default: '' },
  dealTypes: [{ type: String }],
  types: [{ type: String }],
  city: { type: String, default: '', index: true },
  region: { type: String, default: '' },
  tbilisiDistrict: { type: String, default: '' },
  tbilisiSubdistricts: [{ type: String }],
  has3d: { type: Boolean, default: false },
  hasPhotos: { type: Boolean, default: false },
  minPrice: { type: String, default: '' },
  maxPrice: { type: String, default: '' },
  priceCurrency: { type: String, default: '' },
  priceType: { type: String, default: '' },
  minSqm: { type: String, default: '' },
  maxSqm: { type: String, default: '' },
  rooms: [{ type: String }],
  bedrooms: [{ type: String }],
  balconies: [{ type: String }],
  amenities: [{ type: String }],
  buildingProject: [{ type: String }],
  renovationStatus: [{ type: String }],
  minConstructionYear: { type: String, default: '' },
  maxConstructionYear: { type: String, default: '' },
  minRenovationYear: { type: String, default: '' },
  maxRenovationYear: { type: String, default: '' },
  propertyId: { type: String, default: '' },
  sort: { type: String, default: '' },
  resultCount: { type: Number, default: null },
  createdAt: { type: Date, default: Date.now },
});

searchEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });
searchEventSchema.index({ dealTypes: 1 });
searchEventSchema.index({ types: 1 });

export const SearchEvent = mongoose.model('SearchEvent', searchEventSchema);
