import Agent from '../models/Agent.js';
import { Property } from '../models/Property.js';
import { PageView } from '../models/PageView.js';

/** აგენტების პორტფოლიო — განცხადებები, კატეგორიები, ნახვები */
export async function getAgentPortfolioStats(pageViewMatchStage) {
  const agents = await Agent.find({})
    .select('name email photo verified avgRating totalReviews user active')
    .sort({ name: 1 })
    .lean();

  const userIds = agents.map((a) => a.user).filter(Boolean);
  if (!userIds.length) {
    return { agents: [], typeTotals: [] };
  }

  const [propStats, typeBreakdownRows, periodViewsRows, typeTotals] = await Promise.all([
    Property.aggregate([
      { $match: { userId: { $in: userIds } } },
      {
        $group: {
          _id: '$userId',
          propertyCount: { $sum: 1 },
          totalViews: { $sum: { $ifNull: ['$views', 0] } },
        },
      },
    ]),
    Property.aggregate([
      { $match: { userId: { $in: userIds } } },
      { $group: { _id: { userId: '$userId', type: '$type' }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    PageView.aggregate([
      { $match: { ...pageViewMatchStage, propertyId: { $ne: null } } },
      {
        $lookup: {
          from: 'properties',
          localField: 'propertyId',
          foreignField: '_id',
          as: 'property',
        },
      },
      { $unwind: '$property' },
      { $match: { 'property.userId': { $in: userIds } } },
      { $group: { _id: '$property.userId', periodViews: { $sum: 1 } } },
    ]),
    Property.aggregate([
      { $match: { userId: { $in: userIds } } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
  ]);

  const propByUser = new Map(propStats.map((r) => [String(r._id), r]));
  const periodViewsByUser = new Map(
    periodViewsRows.map((r) => [String(r._id), r.periodViews])
  );

  const typesByUser = new Map();
  for (const row of typeBreakdownRows) {
    const uid = String(row._id.userId);
    if (!typesByUser.has(uid)) typesByUser.set(uid, []);
    typesByUser.get(uid).push({
      type: row._id.type || 'unknown',
      count: row.count,
    });
  }

  const agentRows = agents
    .map((agent) => {
      const uid = String(agent.user);
      const ps = propByUser.get(uid);
      return {
        agentId: String(agent._id),
        name: agent.name,
        email: agent.email,
        photo: agent.photo || '',
        verified: agent.verified,
        active: agent.active !== false,
        avgRating: agent.avgRating,
        totalReviews: agent.totalReviews,
        propertyCount: ps?.propertyCount ?? 0,
        totalViews: ps?.totalViews ?? 0,
        periodViews: periodViewsByUser.get(uid) ?? 0,
        typeBreakdown: typesByUser.get(uid) ?? [],
      };
    })
    .sort((a, b) => b.propertyCount - a.propertyCount || b.totalViews - a.totalViews);

  return { agents: agentRows, typeTotals };
}
