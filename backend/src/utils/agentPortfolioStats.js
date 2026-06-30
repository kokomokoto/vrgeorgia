import Agent from '../models/Agent.js';
import { Property } from '../models/Property.js';
import { PageView } from '../models/PageView.js';
import { AdminAuditLog } from '../models/AdminAuditLog.js';
import { PROPERTY_NOT_DELETED } from './propertySoftDelete.js';

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

  const [propStats, soldStats, typeBreakdownRows, periodViewsRows, typeTotals, deletedFromPropertyLogs, deletedFromUserLogs, deletedFromAgentLogs] =
    await Promise.all([
    Property.aggregate([
      { $match: { userId: { $in: userIds }, ...PROPERTY_NOT_DELETED } },
      {
        $group: {
          _id: '$userId',
          propertyCount: { $sum: 1 },
          totalViews: { $sum: { $ifNull: ['$views', 0] } },
          activeCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $in: ['$status', ['active', 'pending']] },
                    {
                      $in: [
                        { $ifNull: ['$listingVisibility', 'public'] },
                        ['public'],
                      ],
                    },
                  ],
                },
                1,
                0,
              ],
            },
          },
          hiddenCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ['$status', 'sold'] },
                    { $in: ['$listingVisibility', ['private', 'unlisted']] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]),
    Property.aggregate([
      { $match: { userId: { $in: userIds }, status: 'sold', ...PROPERTY_NOT_DELETED } },
      { $group: { _id: '$userId', soldCount: { $sum: 1 } } },
    ]),
    Property.aggregate([
      { $match: { userId: { $in: userIds }, ...PROPERTY_NOT_DELETED } },
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
      { $match: { userId: { $in: userIds }, ...PROPERTY_NOT_DELETED } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    AdminAuditLog.aggregate([
      {
        $match: {
          action: { $in: ['property.deleted', 'property.deleted_by_owner'] },
          'meta.ownerUserId': { $in: userIds.map(String) },
        },
      },
      { $group: { _id: '$meta.ownerUserId', count: { $sum: 1 } } },
    ]),
    AdminAuditLog.aggregate([
      {
        $match: {
          action: 'user.deleted',
          targetId: { $in: userIds.map(String) },
          'meta.deletedProperties': { $gt: 0 },
        },
      },
      { $group: { _id: '$targetId', count: { $sum: '$meta.deletedProperties' } } },
    ]),
    AdminAuditLog.aggregate([
      {
        $match: {
          action: 'agent.deleted',
          'meta.ownerUserId': { $in: userIds.map(String) },
          'meta.deletedProperties': { $gt: 0 },
        },
      },
      { $group: { _id: '$meta.ownerUserId', count: { $sum: '$meta.deletedProperties' } } },
    ]),
  ]);

  const propByUser = new Map(propStats.map((r) => [String(r._id), r]));
  const soldByUser = new Map(soldStats.map((r) => [String(r._id), r.soldCount]));
  const deletedByUser = new Map();
  for (const row of deletedFromPropertyLogs) {
    const uid = String(row._id);
    deletedByUser.set(uid, (deletedByUser.get(uid) || 0) + row.count);
  }
  for (const row of deletedFromUserLogs) {
    const uid = String(row._id);
    deletedByUser.set(uid, (deletedByUser.get(uid) || 0) + row.count);
  }
  for (const row of deletedFromAgentLogs) {
    const uid = String(row._id);
    deletedByUser.set(uid, (deletedByUser.get(uid) || 0) + row.count);
  }
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
        activeCount: ps?.activeCount ?? 0,
        hiddenCount: ps?.hiddenCount ?? 0,
        soldCount: soldByUser.get(uid) ?? 0,
        deletedCount: deletedByUser.get(uid) ?? 0,
        totalViews: ps?.totalViews ?? 0,
        periodViews: periodViewsByUser.get(uid) ?? 0,
        typeBreakdown: typesByUser.get(uid) ?? [],
      };
    })
    .sort((a, b) => b.propertyCount - a.propertyCount || b.totalViews - a.totalViews);

  return { agents: agentRows, typeTotals };
}
