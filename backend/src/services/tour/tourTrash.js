import mongoose from 'mongoose';
import { User } from '../../models/User.js';
import { Property } from '../../models/Property.js';

void User;
import { PropertyArchive } from '../../models/PropertyArchive.js';
import { HotspotModel, SceneModel, TourModel } from '../../models/tourModels.js';
import { TourTrash } from '../../models/TourTrash.js';
import { deleteCloudinaryImage } from '../cloudinary.js';
import { deleteSceneImageFile } from './sceneFiles.js';

const TRASH_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
let purgeRunning = false;

function asObjectId(value) {
  if (!value) return null;
  if (value instanceof mongoose.Types.ObjectId) return value;
  const raw = String(value);
  if (mongoose.Types.ObjectId.isValid(raw)) return new mongoose.Types.ObjectId(raw);
  return null;
}

function plainDoc(doc) {
  if (!doc) return doc;
  const copy = { ...doc };
  delete copy.__v;
  if (copy._id) copy._id = asObjectId(copy._id) || copy._id;
  return copy;
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function collectImagePaths(scenes, publishedSnapshot) {
  const found = new Set();
  for (const scene of scenes || []) {
    if (scene?.image_path) found.add(String(scene.image_path));
  }
  if (publishedSnapshot) {
    try {
      const parsed = JSON.parse(publishedSnapshot);
      for (const scene of parsed?.scenes || []) {
        if (scene?.image_path) found.add(String(scene.image_path));
      }
    } catch {
      /* published snapshot is optional display data */
    }
  }
  return [...found];
}

async function imageStillUsed(imagePath, trashId) {
  if (!imagePath) return false;
  const liveScene = await SceneModel.exists({ image_path: imagePath });
  if (liveScene) return true;

  const published = await TourModel.exists({
    published_snapshot: { $regex: escapeRegex(imagePath) },
  });
  if (published) return true;

  const keptTrash = await TourTrash.exists({
    _id: { $ne: trashId },
    imagePaths: imagePath,
  });
  if (keptTrash) return true;

  const liveProperty = await Property.exists({
    $or: [{ photos: imagePath }, { panoramaPhotos: imagePath }],
  });
  if (liveProperty) return true;

  const keptArchive = await PropertyArchive.exists({
    $or: [
      { photos: imagePath },
      { 'snapshot.photos': imagePath },
      { 'snapshot.panoramaPhotos': imagePath },
    ],
  });
  return Boolean(keptArchive);
}

async function deleteTourImage(tourId, imagePath) {
  if (!imagePath) return true;
  if (imagePath.includes('cloudinary') || /^https?:\/\//i.test(imagePath)) {
    if (!imagePath.includes('cloudinary')) return true;
    return deleteCloudinaryImage(imagePath);
  }
  deleteSceneImageFile(tourId, imagePath);
  return true;
}

/**
 * ნაგვის ყუთში მოხვედრიდან 30 დღის შემდეგ ტური იშლება MongoDB-დან
 * და მისი პანორამებიც Cloudinary-დან, თუ სხვა ტური ან განცხადება იმ ფაილს აღარ იყენებს.
 */
export async function purgeExpiredTourTrash() {
  if (purgeRunning) return { skipped: true, removed: 0 };
  purgeRunning = true;
  try {
    const cutoff = new Date(Date.now() - TRASH_RETENTION_MS);
    const expired = await TourTrash.find({ trashedAt: { $lte: cutoff } }).limit(40);
    let removed = 0;
    for (const item of expired) {
      const paths = item.imagePaths?.length
        ? item.imagePaths
        : collectImagePaths(item.snapshot?.scenes, item.snapshot?.tour?.published_snapshot);
      let mediaOk = true;
      for (const imagePath of paths) {
        if (await imageStillUsed(imagePath, item._id)) continue;
        const ok = await deleteTourImage(item.tourId, imagePath);
        if (!ok) mediaOk = false;
      }
      if (!mediaOk) {
        console.error(`Tour trash purge kept ${item.tourId}: Cloudinary delete failed, will retry`);
        continue;
      }
      await TourTrash.deleteOne({ _id: item._id });
      removed += 1;
      console.log(`Trashed 3D tour purged after 30 days: ${item.tourId}`);
    }
    if (expired.length) {
      console.log(`Tour trash purge: expired ${expired.length}, removed ${removed}`);
    }
    return { removed, expired: expired.length };
  } finally {
    purgeRunning = false;
  }
}

async function linkedPropertiesForTour(tourId) {
  const escaped = escapeRegex(tourId);
  return Property.find({
    tourLink: { $regex: new RegExp(`/v/${escaped}`, 'i') },
  })
    .select('_id tourLink')
    .lean();
}

/** ცოცხალი ტური ნაგვის ყუთში: სრული ასლი რჩება, tb_* ჩანაწერები იშლება, ფაილები ჯერ რჩება. */
export async function trashTour(tourId, trashedBy) {
  const id = String(tourId || '').trim();
  if (!id) return null;

  const tour = await TourModel.findOne({ id }).lean();
  if (!tour) return null;

  const scenes = await SceneModel.find({ tour_id: id }).lean();
  const sceneIds = scenes.map((scene) => scene.id);
  const hotspots = sceneIds.length
    ? await HotspotModel.find({
        $or: [{ scene_id: { $in: sceneIds } }, { target_scene_id: { $in: sceneIds } }],
      }).lean()
    : [];

  const linked = await linkedPropertiesForTour(id);
  const imagePaths = collectImagePaths(scenes, tour.published_snapshot);

  await TourTrash.findOneAndUpdate(
    { tourId: id },
    {
      $set: {
        tourId: id,
        title: tour.title || '',
        slug: tour.slug || '',
        sceneCount: scenes.length,
        publishedAt: tour.published_at || null,
        imagePaths,
        linkedProperties: linked.map((row) => ({
          propertyId: String(row._id),
          tourLink: row.tourLink || '',
        })),
        snapshot: {
          tour: plainDoc(tour),
          scenes: scenes.map(plainDoc),
          hotspots: hotspots.map(plainDoc),
        },
        trashedAt: new Date(),
        trashedBy: asObjectId(trashedBy),
      },
    },
    { upsert: true, new: true }
  );

  if (sceneIds.length > 0) {
    await HotspotModel.deleteMany({
      $or: [{ scene_id: { $in: sceneIds } }, { target_scene_id: { $in: sceneIds } }],
    });
    await SceneModel.deleteMany({ tour_id: id });
  }
  await TourModel.deleteOne({ id });

  if (linked.length > 0) {
    await Property.updateMany(
      { _id: { $in: linked.map((row) => row._id) } },
      { $set: { tourLink: '' } }
    );
  }

  return { tourId: id, title: tour.title || '' };
}

export async function listTrashedTours({ page = 1, limit = 50, q = '' } = {}) {
  const pageNum = Math.max(1, page);
  const limitNum = Math.min(100, Math.max(1, limit));
  const filter = {};
  const text = String(q || '').trim();
  if (text) {
    filter.title = { $regex: escapeRegex(text), $options: 'i' };
  }

  const total = await TourTrash.countDocuments(filter);
  const items = await TourTrash.find(filter)
    .select('tourId title sceneCount publishedAt trashedAt trashedBy imagePaths')
    .populate('trashedBy', 'name email')
    .sort({ trashedAt: -1 })
    .skip((pageNum - 1) * limitNum)
    .limit(limitNum)
    .lean();

  const now = Date.now();
  return {
    tours: items.map((item) => {
      const trashedAt = item.trashedAt ? new Date(item.trashedAt).getTime() : now;
      const daysLeft = Math.max(0, Math.ceil((trashedAt + TRASH_RETENTION_MS - now) / 86400000));
      return {
        id: item.tourId,
        title: item.title || '',
        sceneCount: item.sceneCount || 0,
        isPublished: Boolean(item.publishedAt),
        publishedAt: item.publishedAt || null,
        trashedAt: item.trashedAt,
        daysLeft,
        previewImage: (item.imagePaths || []).find((path) => String(path).includes('cloudinary')) || '',
        trashedBy: item.trashedBy
          ? {
              id: String(item.trashedBy._id || item.trashedBy),
              name: item.trashedBy.name || null,
              email: item.trashedBy.email || null,
            }
          : null,
      };
    }),
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum) || 1,
  };
}

async function uniqueRestoredSlug(slug, tourId) {
  const base = String(slug || 'tour').slice(0, 60) || 'tour';
  let n = 0;
  while (n < 50) {
    const candidate = n === 0 ? base : `${base}-restored-${n}`.slice(0, 80);
    const taken = await TourModel.findOne({ slug: candidate, id: { $ne: tourId } }).select('id').lean();
    if (!taken) return candidate;
    n += 1;
  }
  return `${base}-${tourId}`.slice(0, 80);
}

/** ნაგვის ყუთიდან ტურის, სცენების და პანორამის ბმულების დაბრუნება. */
export async function restoreTrashedTour(tourId) {
  const id = String(tourId || '').trim();
  const row = await TourTrash.findOne({ tourId: id });
  if (!row) return { ok: false, status: 404, message: 'ტური ნაგვის ყუთში ვერ მოიძებნა' };

  const snapshot = row.snapshot || {};
  const tour = snapshot.tour;
  if (!tour?.id) return { ok: false, status: 500, message: 'ტურის ასლი დაზიანებულია' };

  const sameId = await TourModel.findOne({ id: tour.id }).select('id').lean();
  if (sameId) {
    return { ok: false, status: 409, message: 'ამ იდენტიფიკატორით ტური უკვე არსებობს' };
  }

  const sceneIds = (snapshot.scenes || []).map((scene) => scene.id).filter(Boolean);
  if (sceneIds.length > 0) {
    const sceneClash = await SceneModel.findOne({ id: { $in: sceneIds } }).select('id').lean();
    if (sceneClash) {
      return { ok: false, status: 409, message: 'ტურის სცენის იდენტიფიკატორი უკვე დაკავებულია' };
    }
  }

  const tourDoc = plainDoc(tour);
  tourDoc.slug = await uniqueRestoredSlug(tourDoc.slug, tour.id);

  try {
    await TourModel.collection.insertOne(tourDoc);
    if (snapshot.scenes?.length) {
      await SceneModel.collection.insertMany(snapshot.scenes.map(plainDoc));
    }
    if (snapshot.hotspots?.length) {
      await HotspotModel.collection.insertMany(snapshot.hotspots.map(plainDoc));
    }
  } catch (err) {
    if (sceneIds.length > 0) {
      await HotspotModel.deleteMany({
        $or: [{ scene_id: { $in: sceneIds } }, { target_scene_id: { $in: sceneIds } }],
      });
      await SceneModel.deleteMany({ tour_id: tour.id });
    }
    await TourModel.deleteOne({ id: tour.id });
    throw err;
  }

  for (const link of row.linkedProperties || []) {
    if (!link?.propertyId || !link.tourLink) continue;
    const property = await Property.findById(link.propertyId);
    if (!property) continue;
    if (String(property.tourLink || '').trim()) continue;
    property.tourLink = link.tourLink;
    await property.save();
  }

  await TourTrash.deleteOne({ _id: row._id });
  return { ok: true, tourId: tour.id };
}
