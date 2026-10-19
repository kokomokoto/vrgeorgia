import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { User } from '../models/User.js';
import Agent from '../models/Agent.js';
import { getAgentRequestModel } from '../models/AgentRequest.js';
import {
  getAgentRequestPrefsModel,
  serializePrefs,
} from '../models/AgentRequestPrefs.js';
import { isSearcherRole } from '../utils/userRoles.js';

/** აგენტმა შეავსო შეტყობინების დროები ან საკონტაქტო არხი */
function prefsAreFilled(prefs) {
  if (!prefs) return false;
  const hasTime = Boolean(prefs.notifyTime1 || prefs.notifyTime2);
  const c = prefs.contacts || {};
  const hasContact = Boolean(
    c.whatsapp || c.facebook || c.viber || c.telegram || c.other
  );
  return hasTime || hasContact;
}

function serializeSearcherAgent(agent, agentUserId, prefs, counts = {}) {
  const p = serializePrefs(prefs);
  return {
    agentId: String(agent._id),
    userId: String(agentUserId),
    name: agent.name || agent.user?.name || '',
    email: agent.email || agent.user?.email || '',
    phone: agent.phone || agent.user?.phone || '',
    photo: agent.photo || agent.user?.avatar || '',
    company: agent.company || '',
    pendingCount: counts.pendingCount || 0,
    totalCount: counts.totalCount || 0,
    notifyTime1: p.notifyTime1,
    notifyTime2: p.notifyTime2,
    contacts: p.contacts,
    prefsFilled: prefsAreFilled(prefs),
  };
}

const router = express.Router();

async function requireSearcher(req, res, next) {
  try {
    const user = await User.findById(req.user.id).select('role name email').lean();
    if (!user || !isSearcherRole(user.role)) {
      return res.status(403).json({ message: 'მხოლოდ მაძებარს აქვს წვდომა' });
    }
    req.searcherUser = user;
    next();
  } catch (err) {
    console.error('requireSearcher:', err);
    return res.status(500).json({ message: 'ავტორიზაციის შეცდომა' });
  }
}

function serializeComment(c) {
  return {
    id: String(c._id || c.id || ''),
    authorUserId: c.authorUserId || '',
    authorName: c.authorName || '',
    authorRole: c.authorRole || '',
    body: c.body || '',
    sold: Boolean(c.sold),
    soldAt: c.soldAt || null,
    createdAt: c.createdAt || null,
    updatedAt: c.updatedAt || null,
  };
}

function serializeRequest(doc) {
  const o = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  const paused = Boolean(o.paused);
  const sold = Boolean(o.sold) || o.status === 'sold';
  return {
    id: String(o._id),
    agentUserId: o.agentUserId || '',
    agentName: o.agentName || '',
    agentEmail: o.agentEmail || '',
    prompt: o.prompt,
    requestNumber: o.requestNumber ?? null,
    status: sold ? 'sold' : o.status,
    paused,
    sold,
    soldAt: o.soldAt || null,
    comments: Array.isArray(o.comments) ? o.comments.map(serializeComment) : [],
    botMessage: o.botMessage || '',
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
}

async function loadRequestForSearcher(requestId) {
  const AgentRequest = await getAgentRequestModel();
  const doc = await AgentRequest.findById(requestId);
  if (!doc) return { error: { status: 404, message: 'მოთხოვნა ვერ მოიძებნა' } };
  const agentOk = await Agent.findOne({
    user: doc.agentUserId,
    requestFeatureEnabled: true,
  })
    .select('_id')
    .lean();
  if (!agentOk) {
    return { error: { status: 403, message: 'ამ აგენტის მოთხოვნებზე წვდომა არ გაქვთ' } };
  }
  return { doc };
}

/**
 * აგენტები: ძებნის ფუნქცია ჩართული + აქვთ მინიმუმ ერთი მოთხოვნა.
 * (მხოლოდ prefs-ით აღარ ჩანს — ცარიელი აგენტები არ გამოჩნდებიან)
 */
router.get('/agents', requireAuth, requireSearcher, async (req, res) => {
  try {
    const AgentRequest = await getAgentRequestModel();
    const Prefs = await getAgentRequestPrefsModel();

    const byAgent = await AgentRequest.aggregate([
      {
        $group: {
          _id: '$agentUserId',
          totalCount: { $sum: 1 },
          pendingCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ['$paused', true] },
                    { $ne: ['$sold', true] },
                    { $ne: ['$status', 'sold'] },
                    { $in: ['$status', ['pending', 'processing']] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    const list = [];
    for (const row of byAgent) {
      const uid = String(row._id || '');
      if (!uid || row.totalCount < 1) continue;

      const agent = await Agent.findOne({
        user: uid,
        requestFeatureEnabled: true,
      })
        .populate('user', 'name email phone avatar role status')
        .lean();
      if (!agent) continue;

      const prefs = await Prefs.findOne({ agentUserId: uid }).lean();

      list.push(
        serializeSearcherAgent(agent, uid, prefs, {
          pendingCount: row.pendingCount || 0,
          totalCount: row.totalCount || 0,
        })
      );
    }

    list.sort((a, b) => a.name.localeCompare(b.name, 'ka'));
    res.json({ agents: list });
  } catch (err) {
    console.error('GET /api/searcher/agents:', err);
    res.status(500).json({ message: err.message || 'ვერ მოხერხდა' });
  }
});

router.get('/agents/:userId/requests', requireAuth, requireSearcher, async (req, res) => {
  try {
    const agentUserId = String(req.params.userId || '');
    const agent = await Agent.findOne({
      user: agentUserId,
      requestFeatureEnabled: true,
    })
      .populate('user', 'name email phone avatar')
      .lean();
    if (!agent) {
      return res.status(404).json({ message: 'აგენტი ვერ მოიძებნა ან მოთხოვნები გამორთულია' });
    }

    const AgentRequest = await getAgentRequestModel();
    const Prefs = await getAgentRequestPrefsModel();
    const [rows, prefs] = await Promise.all([
      AgentRequest.find({ agentUserId }).sort({ createdAt: -1 }).limit(200).lean(),
      Prefs.findOne({ agentUserId }).lean(),
    ]);

    const pendingCount = rows.filter(
      (r) =>
        !r.paused &&
        !r.sold &&
        r.status !== 'sold' &&
        (r.status === 'pending' || r.status === 'processing')
    ).length;

    res.json({
      agent: serializeSearcherAgent(agent, agentUserId, prefs, {
        pendingCount,
        totalCount: rows.length,
      }),
      requests: rows.map(serializeRequest),
    });
  } catch (err) {
    console.error('GET /api/searcher/agents/:userId/requests:', err);
    res.status(500).json({ message: err.message || 'ვერ მოხერხდა' });
  }
});

router.post('/requests/:id/comments', requireAuth, requireSearcher, async (req, res) => {
  try {
    const body = String(req.body?.body || '').trim();
    if (!body) {
      return res.status(400).json({ message: 'პასუხი ცარიელია' });
    }
    if (body.length > 2000) {
      return res.status(400).json({ message: 'პასუხი ძალიან გრძელია' });
    }

    const AgentRequest = await getAgentRequestModel();
    const doc = await AgentRequest.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'მოთხოვნა ვერ მოიძებნა' });

    const agentOk = await Agent.findOne({
      user: doc.agentUserId,
      requestFeatureEnabled: true,
    })
      .select('_id')
      .lean();
    if (!agentOk) {
      return res.status(403).json({ message: 'ამ აგენტის მოთხოვნებზე წვდომა არ გაქვთ' });
    }

    doc.comments.push({
      authorUserId: String(req.user.id),
      authorName: req.searcherUser.name || req.searcherUser.email || '',
      authorRole: 'searcher',
      body,
      sold: false,
      soldAt: null,
      createdAt: new Date(),
      updatedAt: null,
    });
    if (
      !doc.sold &&
      (doc.status === 'pending' || doc.status === 'processing' || doc.status === 'failed')
    ) {
      doc.status = 'done';
    }
    doc.botMessage = '';
    doc.agentNotifiedAt = new Date();
    doc.agentReadAt = null;
    doc.processedAt = new Date();
    await doc.save();

    res.status(201).json({ request: serializeRequest(doc) });
  } catch (err) {
    console.error('POST /api/searcher/requests/:id/comments:', err);
    res.status(500).json({ message: err.message || 'პასუხის შენახვა ვერ მოხერხდა' });
  }
});

router.patch('/requests/:id/comments/:commentId', requireAuth, requireSearcher, async (req, res) => {
  try {
    const body = String(req.body?.body || '').trim();
    if (!body) return res.status(400).json({ message: 'პასუხი ცარიელია' });
    if (body.length > 2000) return res.status(400).json({ message: 'პასუხი ძალიან გრძელია' });

    const loaded = await loadRequestForSearcher(req.params.id);
    if (loaded.error) return res.status(loaded.error.status).json({ message: loaded.error.message });
    const { doc } = loaded;

    const comment = doc.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'კომენტარი ვერ მოიძებნა' });
    if (String(comment.authorUserId) !== String(req.user.id)) {
      return res.status(403).json({ message: 'მხოლოდ საკუთარი კომენტარის რედაქტირება შეიძლება' });
    }

    comment.body = body;
    comment.updatedAt = new Date();
    doc.agentNotifiedAt = new Date();
    doc.agentReadAt = null;
    await doc.save();
    res.json({ request: serializeRequest(doc) });
  } catch (err) {
    console.error('PATCH /api/searcher/requests/:id/comments/:commentId:', err);
    res.status(500).json({ message: err.message || 'რედაქტირება ვერ მოხერხდა' });
  }
});

router.delete('/requests/:id/comments/:commentId', requireAuth, requireSearcher, async (req, res) => {
  try {
    const loaded = await loadRequestForSearcher(req.params.id);
    if (loaded.error) return res.status(loaded.error.status).json({ message: loaded.error.message });
    const { doc } = loaded;

    const comment = doc.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'კომენტარი ვერ მოიძებნა' });
    if (String(comment.authorUserId) !== String(req.user.id)) {
      return res.status(403).json({ message: 'მხოლოდ საკუთარი კომენტარის წაშლა შეიძლება' });
    }

    comment.deleteOne();
    await doc.save();
    res.json({ request: serializeRequest(doc) });
  } catch (err) {
    console.error('DELETE /api/searcher/requests/:id/comments/:commentId:', err);
    res.status(500).json({ message: err.message || 'წაშლა ვერ მოხერხდა' });
  }
});

/** მაძებარს აგენტის მოთხოვნის წაშლა არ შეუძლია — მხოლოდ აგენტს */
router.delete('/requests/:id', requireAuth, requireSearcher, (_req, res) => {
  return res.status(403).json({ message: 'მაძებარს აგენტის მოთხოვნის წაშლა არ შეუძლია' });
});

export default router;
