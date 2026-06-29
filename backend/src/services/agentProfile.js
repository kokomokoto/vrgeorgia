import Agent from '../models/Agent.js';
import { User } from '../models/User.js';

/** User.role === 'agent' ↔ Agent პროფილის სინქრონიზაცია. */
export async function syncAgentProfileForUser(user, { forceActive } = {}) {
  if (!user) return null;

  if (user.role !== 'agent') {
    await Agent.findOneAndUpdate({ user: user._id }, { active: false });
    return null;
  }

  const isApproved = user.status === 'approved' || user.status == null;
  const active = forceActive !== undefined ? forceActive : isApproved;

  const displayName = String(user.name || '').trim() || String(user.email || '').split('@')[0] || 'აგენტი';

  const profileUpdate = {
    name: displayName,
    phone: user.phone || '',
    email: user.email,
    personalId: user.personalId || '',
    active,
  };
  if (user.avatar) {
    profileUpdate.photo = user.avatar;
  }

  return Agent.findOneAndUpdate(
    { user: user._id },
    {
      $set: profileUpdate,
      $setOnInsert: {
        user: user._id,
        verified: false,
      },
    },
    { upsert: true, new: true, runValidators: true }
  );
}

/** agent-role მომხმარებლები Agent ჩანაწერის გარეშე + User→Agent სინქრონიზაცია. */
export async function backfillMissingAgentProfiles() {
  const linkedUserIds = await Agent.distinct('user');
  const missing = await User.find({ role: 'agent', _id: { $nin: linkedUserIds } });
  for (const user of missing) {
    await syncAgentProfileForUser(user);
  }

  const agentUsers = await User.find({ role: 'agent' });
  for (const user of agentUsers) {
    await syncAgentProfileForUser(user);
  }

  const approvedAgents = await User.find({
    role: 'agent',
    $or: [{ status: 'approved' }, { status: { $exists: false } }],
  }).select('_id');
  const approvedIds = approvedAgents.map((u) => u._id);
  if (approvedIds.length > 0) {
    await Agent.updateMany(
      { user: { $in: approvedIds }, active: false },
      { $set: { active: true } }
    );
  }
}
