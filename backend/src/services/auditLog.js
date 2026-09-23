import mongoose from 'mongoose';
import { AdminAuditLog } from '../models/AdminAuditLog.js';
import { User } from '../models/User.js';

export async function writeAudit(actorId, action, targetType, targetId, meta = {}) {
  try {
    const id = actorId ? String(actorId) : '';
    const adminId = mongoose.Types.ObjectId.isValid(id) ? id : '';
    const stored = { ...meta };

    if (adminId) {
      const user = await User.findById(adminId).select('name email').lean();
      if (user) {
        if (!stored.actorName) stored.actorName = user.name || '';
        if (!stored.actorEmail) stored.actorEmail = user.email || '';
      }
    } else if (stored.anonymous === undefined) {
      stored.anonymous = true;
    }

    await AdminAuditLog.create({
      ...(adminId ? { adminId } : {}),
      action,
      targetType,
      targetId: String(targetId),
      meta: stored,
    });
  } catch (err) {
    console.error('[audit]', action, err?.message || err);
  }
}
