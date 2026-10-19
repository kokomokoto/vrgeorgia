import Agent from '../models/Agent.js';

/**
 * აგენტს „მოთხოვნა“ აქვს მხოლოდ თუ ადმინმა მონიშნა Agent.requestFeatureEnabled.
 * სუფთა ადმინს (role=admin) ტესტისთვის ყოველთვის აქვს წვდომა.
 */
export async function userCanUseAgentRequests(userId, role) {
  if (role === 'admin') return true;
  if (role !== 'agent' && role !== 'agent_admin') return false;
  if (!userId) return false;
  const agent = await Agent.findOne({ user: userId })
    .select('requestFeatureEnabled')
    .lean();
  return Boolean(agent?.requestFeatureEnabled);
}
