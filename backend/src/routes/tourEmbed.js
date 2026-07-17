import express from 'express';
import { setEmbedPending, peekEmbedPending } from '../services/tour/embedPending.js';

const router = express.Router();

/** Tour builder embed publish → VR Georgia upload/edit form. */
router.post('/tour-embed/published', (req, res) => {
  const sessionId =
    typeof req.body?.sessionId === 'string' ? req.body.sessionId.trim() : '';
  const url = typeof req.body?.url === 'string' ? req.body.url.trim() : '';
  const tourId = typeof req.body?.tourId === 'string' ? req.body.tourId.trim() : '';
  if (!sessionId || !url) {
    return res.status(400).json({ error: 'sessionId and url required' });
  }
  setEmbedPending(sessionId, { url, tourId });
  res.json({ ok: true });
});

router.get('/tour-embed/pending', (req, res) => {
  const sessionId =
    typeof req.query.sessionId === 'string' ? req.query.sessionId.trim() : '';
  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId required' });
  }
  const pending = peekEmbedPending(sessionId);
  if (!pending) {
    return res.status(404).json({ error: 'No pending tour link' });
  }
  res.json(pending);
});

export default router;
