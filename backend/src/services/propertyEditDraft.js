import { deleteCloudinaryImage } from './cloudinary.js';

export function normalizePhotoUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const u = new URL(trimmed);
      return `${u.origin}${u.pathname}`.toLowerCase();
    } catch {
      return trimmed.toLowerCase();
    }
  }
  return trimmed.toLowerCase();
}

const EDIT_DRAFT_FIELDS = [
  'title',
  'desc',
  'price',
  'priceCurrency',
  'priceType',
  'city',
  'street',
  'region',
  'tbilisiDistrict',
  'tbilisiSubdistricts',
  'sqm',
  'houseSqm',
  'rooms',
  'bedrooms',
  'roomCount',
  'floor',
  'totalFloors',
  'balcony',
  'loggia',
  'bathroom',
  'constructionYear',
  'renovationYear',
  'buildingProject',
  'renovationStatus',
  'cadastralCode',
  'cadastralHidden',
  'location',
  'type',
  'dealType',
  'photos',
  'panoramaPhotos',
  'mainPhoto',
  'threeDLink',
  'exteriorLink',
  'interiorLink',
  'tourLink',
  'amenities',
  'privateNotes',
];

function cloneValue(value) {
  if (value === undefined || value === null) return value;
  if (value instanceof Date) return new Date(value);
  return JSON.parse(JSON.stringify(value));
}

/** ცოცხალი განცხადების ასლი რედაქტირების draft-ისთვის */
export function snapshotLiveProperty(property) {
  const snap = {
    contact: {
      phone: property.contact?.phone ?? '',
      email: property.contact?.email ?? '',
    },
  };
  for (const key of EDIT_DRAFT_FIELDS) {
    if (property[key] !== undefined) {
      snap[key] = cloneValue(property[key]);
    }
  }
  return snap;
}

export function ensureEditDraft(doc) {
  if (!doc.editDraft || typeof doc.editDraft !== 'object') {
    doc.editDraft = snapshotLiveProperty(doc);
    doc.markModified('editDraft');
  }
  return doc.editDraft;
}

export function mergePatchIntoDraft(doc, patch) {
  const draft = ensureEditDraft(doc);
  for (const [key, value] of Object.entries(patch)) {
    if (key === 'contact') {
      draft.contact = { ...draft.contact, ...value };
    } else {
      draft[key] = cloneValue(value);
    }
  }
  doc.markModified('editDraft');
  return draft;
}

/** რედაქტირების ფორმისთვის — draft ფერი live-ზე */
export function propertyForEdit(property) {
  const base = typeof property.toObject === 'function' ? property.toObject() : { ...property };
  if (!base.editDraft || typeof base.editDraft !== 'object') {
    return { ...base, hasEditDraft: false };
  }
  const draft = base.editDraft;
  const merged = { ...base, ...draft, hasEditDraft: true };
  if (draft.contact) merged.contact = draft.contact;
  delete merged.editDraft;
  return merged;
}

export function applyDraftToLive(doc) {
  const draft = doc.editDraft;
  if (!draft || typeof draft !== 'object') return false;
  for (const key of EDIT_DRAFT_FIELDS) {
    if (draft[key] !== undefined) {
      doc[key] = cloneValue(draft[key]);
    }
  }
  if (draft.contact) {
    doc.contact = cloneValue(draft.contact);
  }
  doc.editDraft = undefined;
  doc.markModified('editDraft');
  return true;
}

export async function cleanupRemovedPhotos(oldPhotos, newPhotos) {
  const nextSet = new Set((newPhotos || []).map(normalizePhotoUrl));
  for (const url of oldPhotos || []) {
    if (!nextSet.has(normalizePhotoUrl(url))) {
      await deleteCloudinaryImage(url);
    }
  }
}

/** draft-ში ახალი ფოტოები, რომლებიც live-ში არ იყო — გაუქმებისას წაშლა */
export async function discardEditDraft(doc) {
  const live = snapshotLiveProperty(doc);
  const draft = doc.editDraft;
  if (!draft) return;

  const livePhotoKeys = new Set((live.photos || []).map(normalizePhotoUrl));
  const stagedOnly = (draft.photos || []).filter((url) => !livePhotoKeys.has(normalizePhotoUrl(url)));
  for (const url of stagedOnly) {
    await deleteCloudinaryImage(url);
  }

  doc.editDraft = undefined;
  doc.markModified('editDraft');
}
