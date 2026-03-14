import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const analystSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  passwordHash: { type: String, required: true },
  name: { type: String, default: '' },
  active: { type: Boolean, default: true },
}, { timestamps: true });

analystSchema.methods.comparePassword = async function(password) {
  return bcrypt.compare(password, this.passwordHash);
};

analystSchema.statics.hashPassword = async function(password) {
  return bcrypt.hash(password, 12);
};

export const Analyst = mongoose.model('Analyst', analystSchema);
