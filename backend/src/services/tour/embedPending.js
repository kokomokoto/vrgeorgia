/** In-memory pending tour links from embed publish → VR Georgia upload/edit form. */
const pending = new Map();
const TTL_MS = 60 * 60 * 1000; // 1 hour

function isExpired(entry) {
  return !entry || Date.now() - entry.at > TTL_MS;
}

export function setEmbedPending(sessionId, { url, tourId }) {
  const id = String(sessionId || '').trim();
  if (!id || !url) return false;
  pending.set(id, {
    url: String(url).trim(),
    tourId: tourId ? String(tourId) : '',
    at: Date.now(),
  });
  return true;
}

/** Returns pending link without removing (for polling). */
export function peekEmbedPending(sessionId) {
  const id = String(sessionId || '').trim();
  if (!id) return null;
  const entry = pending.get(id);
  if (isExpired(entry)) {
    pending.delete(id);
    return null;
  }
  return { url: entry.url, tourId: entry.tourId };
}

/** Returns and removes pending link (one-time consume). */
export function takeEmbedPending(sessionId) {
  const entry = peekEmbedPending(sessionId);
  if (!entry) return null;
  pending.delete(String(sessionId).trim());
  return entry;
}
