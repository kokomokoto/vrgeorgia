import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { User } from '../models/User.js';
import { getAgentRequestModel } from '../models/AgentRequest.js';
import {
  getAgentRequestPrefsModel,
  normalizeTimeInput,
  serializePrefs,
} from '../models/AgentRequestPrefs.js';
import { userCanUseAgentRequests } from '../utils/agentRequestAccess.js';

const router = express.Router();

async function requireAgent(req, res, next) {
  try {
    const user = await User.findById(req.user.id).select('role name email').lean();
    if (!user) {
      return res.status(403).json({ message: 'მხოლოდ აგენტს შეუძლია მოთხოვნების გამოყენება' });
    }
    const allowed = await userCanUseAgentRequests(req.user.id, user.role);
    if (!allowed) {
      return res.status(403).json({
        message: 'მოთხოვნის ფუნქცია ამ აგენტისთვის გამორთულია. დაუკავშირდით ადმინისტრატორს.',
      });
    }
    req.agentUser = user;
    next();
  } catch (err) {
    console.error('requireAgent:', err);
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

function serialize(doc, { viewerUserId } = {}) {
  const o = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  const paused = Boolean(o.paused);
  const sold = Boolean(o.sold) || o.status === 'sold';
  const isPublic = Boolean(o.isPublic);
  const agentUserId = o.agentUserId || '';
  const isOwner = viewerUserId != null && String(viewerUserId) === String(agentUserId);
  return {
    id: String(o._id),
    agentUserId,
    agentName: o.agentName || '',
    // ელფოსტა მხოლოდ მფლობელს უბრუნდება — საჯარო ლენტაში სხვა აგენტებს არ ეჩვენება
    agentEmail: isOwner ? o.agentEmail || '' : '',
    prompt: o.prompt,
    requestNumber: o.requestNumber ?? null,
    status: sold ? 'sold' : o.status,
    paused,
    isPublic,
    isOwner,
    sold,
    soldAt: o.soldAt || null,
    parsedFilters: o.parsedFilters || {},
    results: o.results || [],
    resultCount: o.resultCount || 0,
    comments: Array.isArray(o.comments) ? o.comments.map(serializeComment) : [],
    botMessage: o.botMessage || '',
    errorMessage: o.errorMessage || '',
    agentNotifiedAt: o.agentNotifiedAt || null,
    agentReadAt: o.agentReadAt || null,
    processedAt: o.processedAt || null,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    unread: Boolean(
      isOwner &&
        !paused &&
        !sold &&
        o.agentNotifiedAt &&
        !o.agentReadAt &&
        o.status === 'done'
    ),
  };
}

async function findRequestForViewer(AgentRequest, id, viewerUserId) {
  const doc = await AgentRequest.findById(id);
  if (!doc) return { error: { status: 404, message: 'მოთხოვნა ვერ მოიძებნა' } };
  const isOwner = String(doc.agentUserId) === String(viewerUserId);
  if (!isOwner && !doc.isPublic) {
    return { error: { status: 403, message: 'ამ მოთხოვნაზე წვდომა არ გაქვთ' } };
  }
  return { doc, isOwner };
}

async function nextRequestNumberForAgent(agentUserId) {
  const Prefs = await getAgentRequestPrefsModel();
  const updated = await Prefs.findOneAndUpdate(
    { agentUserId: String(agentUserId) },
    { $inc: { nextRequestNumber: 1 }, $setOnInsert: { agentUserId: String(agentUserId) } },
    { upsert: true, new: true }
  );
  const n = Number(updated.nextRequestNumber || 2);
  return Math.max(1, n - 1);
}

router.get('/prefs', requireAuth, requireAgent, async (req, res) => {
  try {
    const Prefs = await getAgentRequestPrefsModel();
    const doc = await Prefs.findOne({ agentUserId: String(req.user.id) }).lean();
    res.json({ prefs: serializePrefs(doc) });
  } catch (err) {
    console.error('GET /api/agent-requests/prefs:', err);
    res.status(500).json({ message: err.message || 'ვერ მოხერხდა' });
  }
});

router.put('/prefs', requireAuth, requireAgent, async (req, res) => {
  try {
    const t1 = normalizeTimeInput(req.body?.notifyTime1);
    const t2 = normalizeTimeInput(req.body?.notifyTime2);
    if (t1 === null || t2 === null) {
      return res.status(400).json({ message: 'დრო უნდა იყოს HH:mm ფორმატში' });
    }

    const contactsIn = req.body?.contacts && typeof req.body.contacts === 'object'
      ? req.body.contacts
      : {};
    const contacts = {
      whatsapp: String(contactsIn.whatsapp || '').trim().slice(0, 200),
      facebook: String(contactsIn.facebook || '').trim().slice(0, 500),
      viber: String(contactsIn.viber || '').trim().slice(0, 200),
      telegram: String(contactsIn.telegram || '').trim().slice(0, 200),
      other: String(contactsIn.other || '').trim().slice(0, 500),
    };

    const Prefs = await getAgentRequestPrefsModel();
    const doc = await Prefs.findOneAndUpdate(
      { agentUserId: String(req.user.id) },
      {
        $set: {
          notifyTime1: t1,
          notifyTime2: t2,
          contacts,
        },
        $setOnInsert: { agentUserId: String(req.user.id) },
      },
      { upsert: true, new: true }
    );
    res.json({ prefs: serializePrefs(doc) });
  } catch (err) {
    console.error('PUT /api/agent-requests/prefs:', err);
    res.status(500).json({ message: err.message || 'შენახვა ვერ მოხერხდა' });
  }
});

router.get('/', requireAuth, requireAgent, async (req, res) => {
  try {
    const AgentRequest = await getAgentRequestModel();
    const rows = await AgentRequest.find({ agentUserId: String(req.user.id) })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    res.json({
      requests: rows.map((row) => serialize(row, { viewerUserId: req.user.id })),
    });
  } catch (err) {
    console.error('GET /api/agent-requests:', err);
    res.status(500).json({ message: err.message || 'მოთხოვნების ჩატვირთვა ვერ მოხერხდა' });
  }
});

/** საყოველთაო საჯარო მოთხოვნები (საკუთარის ჩათვლით — ყველასთვის ჩანს) */
router.get('/public', requireAuth, requireAgent, async (req, res) => {
  try {
    const AgentRequest = await getAgentRequestModel();
    const rows = await AgentRequest.find({ isPublic: true })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    res.json({
      requests: rows.map((row) => serialize(row, { viewerUserId: req.user.id })),
    });
  } catch (err) {
    console.error('GET /api/agent-requests/public:', err);
    res.status(500).json({ message: err.message || 'საჯარო მოთხოვნების ჩატვირთვა ვერ მოხერხდა' });
  }
});

router.get('/unread-count', requireAuth, requireAgent, async (req, res) => {
  try {
    const AgentRequest = await getAgentRequestModel();
    const count = await AgentRequest.countDocuments({
      agentUserId: String(req.user.id),
      status: 'done',
      agentNotifiedAt: { $ne: null },
      agentReadAt: null,
      paused: { $ne: true },
    });
    res.json({ count });
  } catch (err) {
    console.error('GET /api/agent-requests/unread-count:', err);
    res.status(500).json({ message: err.message || 'ვერ მოხერხდა' });
  }
});

router.get('/:id', requireAuth, requireAgent, async (req, res) => {
  try {
    const AgentRequest = await getAgentRequestModel();
    const loaded = await findRequestForViewer(AgentRequest, req.params.id, req.user.id);
    if (loaded.error) {
      return res.status(loaded.error.status).json({ message: loaded.error.message });
    }
    res.json({ request: serialize(loaded.doc, { viewerUserId: req.user.id }) });
  } catch (err) {
    console.error('GET /api/agent-requests/:id:', err);
    res.status(500).json({ message: err.message || 'ვერ მოხერხდა' });
  }
});

router.post('/', requireAuth, requireAgent, async (req, res) => {
  try {
    const promptsRaw = Array.isArray(req.body?.prompts)
      ? req.body.prompts
      : [req.body?.prompt];
    const prompts = promptsRaw
      .map((p) => String(p || '').trim())
      .filter((p) => p.length >= 5);

    if (!prompts.length) {
      return res.status(400).json({ message: 'მოთხოვნა მინიმუმ 5 სიმბოლო უნდა იყოს' });
    }
    if (prompts.some((p) => p.length > 4000)) {
      return res.status(400).json({ message: 'მოთხოვნა ძალიან გრძელია (მაქს. 4000)' });
    }
    if (prompts.length > 20) {
      return res.status(400).json({ message: 'ერთდროულად მაქსიმუმ 20 მოთხოვნა' });
    }

    const AgentRequest = await getAgentRequestModel();
    const created = [];
    for (const prompt of prompts) {
      const requestNumber = await nextRequestNumberForAgent(req.user.id);
      const doc = await AgentRequest.create({
        agentUserId: String(req.user.id),
        agentName: req.agentUser.name || '',
        agentEmail: req.agentUser.email || '',
        prompt,
        requestNumber,
        status: 'pending',
        isPublic: false,
        results: [],
        resultCount: 0,
        botMessage: '',
        comments: [],
      });
      created.push(serialize(doc, { viewerUserId: req.user.id }));
    }

    res.status(201).json({
      requests: created,
      request: created[0],
    });
  } catch (err) {
    console.error('POST /api/agent-requests:', err);
    res.status(500).json({ message: err.message || 'მოთხოვნის შენახვა ვერ მოხერხდა' });
  }
});

router.post('/:id/comments', requireAuth, requireAgent, async (req, res) => {
  try {
    const body = String(req.body?.body || '').trim();
    if (!body || body.length < 1) {
      return res.status(400).json({ message: 'კომენტარი ცარიელია' });
    }
    if (body.length > 2000) {
      return res.status(400).json({ message: 'კომენტარი ძალიან გრძელია' });
    }

    const AgentRequest = await getAgentRequestModel();
    const doc = await AgentRequest.findOne({
      _id: req.params.id,
      agentUserId: String(req.user.id),
    });
    if (!doc) return res.status(404).json({ message: 'მოთხოვნა ვერ მოიძებნა' });

    doc.comments.push({
      authorUserId: String(req.user.id),
      authorName: req.agentUser.name || req.agentUser.email || '',
      authorRole: req.agentUser.role || '',
      body,
      createdAt: new Date(),
    });
    await doc.save();
    res.status(201).json({ request: serialize(doc, { viewerUserId: req.user.id }) });
  } catch (err) {
    console.error('POST /api/agent-requests/:id/comments:', err);
    res.status(500).json({ message: err.message || 'კომენტარის შენახვა ვერ მოხერხდა' });
  }
});

router.post('/:id/visibility', requireAuth, requireAgent, async (req, res) => {
  try {
    const isPublic = Boolean(req.body?.isPublic);
    const AgentRequest = await getAgentRequestModel();
    const doc = await AgentRequest.findOne({
      _id: req.params.id,
      agentUserId: String(req.user.id),
    });
    if (!doc) return res.status(404).json({ message: 'მოთხოვნა ვერ მოიძებნა' });
    doc.isPublic = isPublic;
    await doc.save();
    res.json({ request: serialize(doc, { viewerUserId: req.user.id }) });
  } catch (err) {
    console.error('POST /api/agent-requests/:id/visibility:', err);
    res.status(500).json({ message: err.message || 'ხილვადობის შეცვლა ვერ მოხერხდა' });
  }
});

router.post('/:id/read', requireAuth, requireAgent, async (req, res) => {
  try {
    const AgentRequest = await getAgentRequestModel();
    const doc = await AgentRequest.findOne({
      _id: req.params.id,
      agentUserId: String(req.user.id),
    });
    if (!doc) return res.status(404).json({ message: 'მოთხოვნა ვერ მოიძებნა' });
    if (!doc.agentReadAt) {
      doc.agentReadAt = new Date();
      await doc.save();
    }
    res.json({ request: serialize(doc, { viewerUserId: req.user.id }) });
  } catch (err) {
    console.error('POST /api/agent-requests/:id/read:', err);
    res.status(500).json({ message: err.message || 'ვერ მოხერხდა' });
  }
});

router.post('/:id/pause', requireAuth, requireAgent, async (req, res) => {
  try {
    const AgentRequest = await getAgentRequestModel();
    const doc = await AgentRequest.findOne({
      _id: req.params.id,
      agentUserId: String(req.user.id),
    });
    if (!doc) return res.status(404).json({ message: 'მოთხოვნა ვერ მოიძებნა' });
    doc.paused = true;
    await doc.save();
    res.json({ request: serialize(doc, { viewerUserId: req.user.id }) });
  } catch (err) {
    console.error('POST /api/agent-requests/:id/pause:', err);
    res.status(500).json({ message: err.message || 'დაპაუზება ვერ მოხერხდა' });
  }
});

router.post('/:id/resume', requireAuth, requireAgent, async (req, res) => {
  try {
    const AgentRequest = await getAgentRequestModel();
    const doc = await AgentRequest.findOne({
      _id: req.params.id,
      agentUserId: String(req.user.id),
    });
    if (!doc) return res.status(404).json({ message: 'მოთხოვნა ვერ მოიძებნა' });
    doc.paused = false;
    await doc.save();
    res.json({ request: serialize(doc, { viewerUserId: req.user.id }) });
  } catch (err) {
    console.error('POST /api/agent-requests/:id/resume:', err);
    res.status(500).json({ message: err.message || 'განახლება ვერ მოხერხდა' });
  }
});

router.delete('/:id', requireAuth, requireAgent, async (req, res) => {
  try {
    const AgentRequest = await getAgentRequestModel();
    const doc = await AgentRequest.findOneAndDelete({
      _id: req.params.id,
      agentUserId: String(req.user.id),
    });
    if (!doc) return res.status(404).json({ message: 'მოთხოვნა ვერ მოიძებნა' });
    res.json({ ok: true, id: String(doc._id) });
  } catch (err) {
    console.error('DELETE /api/agent-requests/:id:', err);
    res.status(500).json({ message: err.message || 'წაშლა ვერ მოხერხდა' });
  }
});

export default router;
