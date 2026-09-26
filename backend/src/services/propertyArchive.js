import mongoose from 'mongoose';
import { Property } from '../models/Property.js';
import { PropertyArchive } from '../models/PropertyArchive.js';
import { PROPERTY_DELETED } from '../utils/propertySoftDelete.js';
import { escapeRegex } from '../utils/propertySearch.js';
import { deleteCloudinaryImage } from './cloudinary.js';

const ARCHIVE_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
let purgeRunning = false;

function collectCloudinaryUrls(archive) {
  const found = new Set();
  const walk = (value) => {
    if (typeof value === 'string') {
      if (value.includes('cloudinary.com')) found.add(value.split('?')[0]);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    if (value && typeof value === 'object') {
      for (const nested of Object.values(value)) walk(nested);
    }
  };
  walk(archive.photos);
  walk(archive.snapshot);
  return [...found];
}

async function cloudinaryUrlStillUsed(url, archiveId) {
  const live = await Property.exists({
    $or: [{ photos: url }, { panoramaPhotos: url }],
  });
  if (live) return true;
  const kept = await PropertyArchive.exists({
    _id: { $ne: archiveId },
    $or: [
      { photos: url },
      { 'snapshot.photos': url },
      { 'snapshot.panoramaPhotos': url },
      { 'snapshot.editDraft.photos': url },
      { 'snapshot.editDraft.panoramaPhotos': url },
    ],
  });
  return Boolean(kept);
}

/**
 * არქივში გადატანიდან 30 დღის შემდეგ ჩანაწერი იშლება MongoDB-დან
 * და მისი Cloudinary ფოტოებიც, თუ სხვა განცხადება იმავე ფაილს აღარ იყენებს.
 */
export async function purgeExpiredPropertyArchives() {
  if (purgeRunning) return { skipped: true, removed: 0 };
  purgeRunning = true;
  try {
    const cutoff = new Date(Date.now() - ARCHIVE_RETENTION_MS);
    const expired = await PropertyArchive.find({ archivedAt: { $lte: cutoff } }).limit(40);
    let removed = 0;
    for (const item of expired) {
      const urls = collectCloudinaryUrls(item);
      let cloudinaryOk = true;
      for (const url of urls) {
        if (await cloudinaryUrlStillUsed(url, item._id)) continue;
        const ok = await deleteCloudinaryImage(url);
        if (!ok) cloudinaryOk = false;
      }
      if (!cloudinaryOk) {
        console.error(`Archive purge kept ${item.propertyId}: Cloudinary delete failed, will retry`);
        continue;
      }
      await PropertyArchive.deleteOne({ _id: item._id });
      removed += 1;
      console.log(`Archived property purged after 30 days: ${item.propertyId}`);
    }
    if (expired.length) {
      console.log(`Archive purge: expired ${expired.length}, removed ${removed}`);
    }
    return { removed, expired: expired.length };
  } finally {
    purgeRunning = false;
  }
}

function asObjectId(value) {
  if (!value) return value;
  if (value instanceof mongoose.Types.ObjectId) return value;
  if (typeof value === 'string' && mongoose.Types.ObjectId.isValid(value)) {
    return new mongoose.Types.ObjectId(value);
  }
  return value;
}

function snapshotFromProperty(property) {
  const raw = property.toObject({ depopulate: true, versionKey: true });
  delete raw.id;
  return raw;
}

function documentFromSnapshot(snapshot) {
  const doc = { ...snapshot };
  delete doc.id;
  delete doc.deletedAt;
  delete doc.deletedBy;
  doc._id = asObjectId(doc._id);
  if (doc.userId) doc.userId = asObjectId(doc.userId);
  return doc;
}

/** ნაგვის ყუთიდან წაშლა: სრული ასლი არქივში, შემდეგ Property-დან მოშორება. */
export async function archiveTrashedProperty(propertyId, archivedBy) {
  const property = await Property.findOne({ _id: propertyId, ...PROPERTY_DELETED });
  if (!property) return null;

  const snapshot = snapshotFromProperty(property);
  await PropertyArchive.findOneAndUpdate(
    { propertyId: property._id },
    {
      $set: {
        propertyId: property._id,
        numericId: property.numericId ?? null,
        title: property.title || '',
        type: property.type || '',
        dealType: property.dealType || '',
        price: property.price ?? 0,
        priceCurrency: property.priceCurrency || 'USD',
        city: property.city || '',
        photos: Array.isArray(property.photos) ? property.photos : [],
        snapshot,
        archivedAt: new Date(),
        archivedBy: archivedBy || null,
      },
    },
    { upsert: true, new: true }
  );
  await Property.deleteOne({ _id: property._id });
  return property;
}

export async function listArchivedProperties({ page = 1, limit = 20, q = '' } = {}) {
  const pageNum = Math.max(1, page);
  const limitNum = Math.min(100, Math.max(1, limit));
  const filter = {};
  const text = String(q || '').trim();
  if (text) {
    const or = [{ title: { $regex: escapeRegex(text), $options: 'i' } }];
    if (/^\d+$/.test(text)) or.push({ numericId: Number(text) });
    filter.$or = or;
  }

  const total = await PropertyArchive.countDocuments(filter);
  const items = await PropertyArchive.find(filter)
    .select('propertyId numericId title type dealType price priceCurrency city photos archivedAt archivedBy')
    .populate('archivedBy', 'name email')
    .sort({ archivedAt: -1 })
    .skip((pageNum - 1) * limitNum)
    .limit(limitNum)
    .lean();

  return {
    properties: items.map((item) => ({
      _id: String(item.propertyId),
      numericId: item.numericId,
      title: item.title,
      type: item.type,
      dealType: item.dealType,
      price: item.price,
      priceCurrency: item.priceCurrency,
      city: item.city,
      photos: item.photos || [],
      archivedAt: item.archivedAt,
      archivedBy: item.archivedBy,
    })),
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum) || 1,
  };
}

/** არქივიდან ცოცხალ განცხადებად დაბრუნება (წაშლის ნიშნების გარეშე). */
export async function restoreArchivedProperty(propertyId) {
  const archive = await PropertyArchive.findOne({ propertyId });
  if (!archive) return { ok: false, status: 404, message: 'განცხადება არქივში ვერ მოიძებნა' };

  const doc = documentFromSnapshot(archive.snapshot || {});
  if (!doc._id) doc._id = archive.propertyId;

  const sameId = await Property.findById(doc._id).select('_id').lean();
  if (sameId) {
    return { ok: false, status: 409, message: 'ამ იდენტიფიკატორით განცხადება უკვე არსებობს' };
  }
  if (doc.numericId) {
    const sameNumber = await Property.findOne({ numericId: doc.numericId }).select('_id').lean();
    if (sameNumber) {
      return { ok: false, status: 409, message: 'ეს ნომერი უკვე სხვა განცხადებას აქვს' };
    }
  }

  await Property.collection.insertOne(doc);
  await PropertyArchive.deleteOne({ _id: archive._id });
  return { ok: true, propertyId: String(doc._id) };
}
