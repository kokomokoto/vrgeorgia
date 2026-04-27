import mongoose from 'mongoose';

const adminAuditLogSchema = new mongoose.Schema(
  {
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true, trim: true },
    targetType: { type: String, required: true, trim: true },
    targetId: { type: String, required: true, trim: true },
    meta: { type: Object, default: {} }
  },
  { timestamps: true }
);

export const AdminAuditLog = mongoose.model('AdminAuditLog', adminAuditLogSchema);
