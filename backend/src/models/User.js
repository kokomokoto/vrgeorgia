import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    phone: { type: String, default: '' },
    personalId: { type: String, default: '' },
    avatar: { type: String, default: '' },
    name: { type: String, default: '' },
    role: { type: String, enum: ['user', 'agent', 'admin', 'agent_admin'], default: 'user' },
    // რეგისტრაციის სტატუსი — ახალი მომხმარებლები იქმნება 'pending'-ით და ვერ
    // შედიან სანამ ადმინი არ დაამტკიცებს. ძველი მომხმარებლები (ველი არ აქვთ)
    // ითვლებიან დამტკიცებულად (default 'approved').
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved' },
    favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Property' }]
  },
  { timestamps: true }
);

export const User = mongoose.model('User', userSchema);
