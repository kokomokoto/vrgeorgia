import mongoose from 'mongoose';

const agentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  personalId: {
    type: String,
    default: ''
  },
  photo: {
    type: String,
    default: ''
  },
  bio: {
    ka: { type: String, default: '' },
    en: { type: String, default: '' },
    ru: { type: String, default: '' },
    tr: { type: String, default: '' },
    az: { type: String, default: '' }
  },
  company: {
    type: String,
    default: ''
  },
  license: {
    type: String,
    default: ''
  },
  experience: {
    type: Number, // years
    default: 0
  },
  specializations: [{
    type: String,
    enum: ['apartment', 'house', 'land', 'commercial', 'hotel']
  }],
  areas: [{
    type: String // cities/regions they work in
  }],
  languages: [{
    type: String,
    enum: ['ka', 'en', 'ru', 'tr', 'az', 'de', 'fr']
  }],
  ratings: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    score: { type: Number, min: 1, max: 5, required: true },
    review: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now }
  }],
  avgRating: {
    type: Number,
    default: 0
  },
  totalReviews: {
    type: Number,
    default: 0
  },
  verified: {
    type: Boolean,
    default: false
  },
  active: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// Calculate average rating before save
agentSchema.methods.calculateRating = function() {
  if (this.ratings.length === 0) {
    this.avgRating = 0;
    this.totalReviews = 0;
  } else {
    const sum = this.ratings.reduce((acc, r) => acc + r.score, 0);
    this.avgRating = Math.round((sum / this.ratings.length) * 10) / 10;
    this.totalReviews = this.ratings.length;
  }
};

export default mongoose.model('Agent', agentSchema);
