import mongoose from 'mongoose';

const appInstallSchema = new mongoose.Schema({
  sessionId: { type: String, default: '', index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  ip: { type: String, default: '' },
  country: { type: String, default: '' },
  countryCode: { type: String, default: '' },
  city: { type: String, default: '' },
  region: { type: String, default: '' },
  device: { type: String, default: '' },
  browser: { type: String, default: '' },
  os: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

appInstallSchema.index({ createdAt: -1 });

export const AppInstall = mongoose.model('AppInstall', appInstallSchema);
