/**
 * Public API output sanitiser for Property documents.
 *
 * The public endpoints (`GET /api/properties`, `GET /api/properties/:id`,
 * agent portfolios, sitemap feeds) must never expose moderation / internal
 * bookkeeping fields. Everything listed in INTERNAL_FIELDS is stripped for
 * non-owners; list views additionally drop per-listing contact data and the
 * raw owner id, which only the detail page needs.
 */

/** Never leaves the server on public endpoints (owner/admin get them via dedicated routes). */
const INTERNAL_FIELDS = Object.freeze([
  '__v',
  'moderationHistory',
  'editDraft',
  'deletedAt',
  'deletedBy',
  'clientRequestId',
  'photoBatchKeys',
  'translations',
  'agentId',
  'privateNotes',
  'shareToken',
]);

/** Extra fields that list/collection responses do not need. */
const LIST_ONLY_STRIP = Object.freeze(['contact', 'userId', 'cadastralCode', 'cadastralHidden']);

/** Fields of the populated owner that may be public on the detail page. */
const OWNER_PUBLIC_FIELDS = Object.freeze(['_id', 'name', 'phone', 'email', 'avatar', 'role']);

function pickOwner(owner) {
  if (!owner || typeof owner !== 'object') return undefined;
  const out = {};
  for (const key of OWNER_PUBLIC_FIELDS) {
    if (owner[key] !== undefined && owner[key] !== null) out[key] = owner[key];
  }
  return out;
}

/**
 * @param {object} property lean property (already translated / urlKey'd)
 * @param {{ view?: 'list'|'detail', isOwner?: boolean }} [opts]
 */
export function toPublicProperty(property, opts = {}) {
  if (!property || typeof property !== 'object') return property;
  const view = opts.view === 'list' ? 'list' : 'detail';
  const isOwner = Boolean(opts.isOwner);
  const out = { ...property };

  for (const key of INTERNAL_FIELDS) {
    // owners keep privateNotes/shareToken (detail only); everything else is internal
    if (isOwner && view === 'detail' && (key === 'privateNotes' || key === 'shareToken')) continue;
    delete out[key];
  }

  if (out.cadastralHidden && !isOwner) {
    delete out.cadastralCode;
    delete out.cadastralHidden;
  }

  if (view === 'list') {
    for (const key of LIST_ONLY_STRIP) delete out[key];
  } else if (out.userId && typeof out.userId === 'object') {
    out.userId = pickOwner(out.userId);
  }

  return out;
}

export function toPublicPropertyList(properties, opts = {}) {
  return (properties || []).map((p) => toPublicProperty(p, { ...opts, view: 'list' }));
}

export { INTERNAL_FIELDS as PUBLIC_PROPERTY_INTERNAL_FIELDS };
