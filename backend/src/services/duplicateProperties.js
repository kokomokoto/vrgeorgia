import { Property } from '../models/Property.js';
import { PROPERTY_NOT_DELETED } from '../utils/propertySoftDelete.js';

/**
 * დუბლიკატების აღმოჩენა.
 *
 * ატვირთვა ორნაბიჯიანია (ობიექტი → ფოტოები), ამიტომ ჩავარდნისას აგენტს რჩებოდა
 * უფოტოო ჩანაწერი და ხელახალი დაჭერა ახალ დუბლიკატს ქმნიდა. აქ ჯგუფდება იგივე
 * მფლობელის, სათაურის, ფასის, ტიპისა და კოორდინატების ჩანაწერები, რომლებიც
 * მოკლე დროში შეიქმნა.
 */

/** მაქსიმალური სხვაობა ჯგუფის პირველ და ბოლო ჩანაწერს შორის */
export const DEFAULT_DUPLICATE_WINDOW_MINUTES = 60;

function groupKey(p) {
  const lat = Number(p.location?.lat ?? 0).toFixed(5);
  const lng = Number(p.location?.lng ?? 0).toFixed(5);
  return [
    String(p.userId || ''),
    String(p.title || '').trim().toLowerCase(),
    String(p.price ?? ''),
    String(p.type || ''),
    String(p.dealType || ''),
    lat,
    lng,
  ].join('|');
}

/**
 * ჯგუფში ყველაზე „სრული“ ჩანაწერი — ის უნდა შენარჩუნდეს.
 * პრიორიტეტი: მეტი ფოტო → აქტიური სტატუსი → უფრო ძველი (ორიგინალი).
 */
function pickKeeper(items) {
  return [...items].sort((a, b) => {
    const photoDiff = (b.photos?.length || 0) - (a.photos?.length || 0);
    if (photoDiff !== 0) return photoDiff;
    const aActive = a.status === 'active' ? 1 : 0;
    const bActive = b.status === 'active' ? 1 : 0;
    if (aActive !== bActive) return bActive - aActive;
    return new Date(a.createdAt) - new Date(b.createdAt);
  })[0];
}

export async function findDuplicatePropertyGroups({
  windowMinutes = DEFAULT_DUPLICATE_WINDOW_MINUTES,
  sinceDays = 90,
  userId = null,
} = {}) {
  const filter = { ...PROPERTY_NOT_DELETED };
  if (sinceDays > 0) {
    filter.createdAt = { $gte: new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000) };
  }
  if (userId) filter.userId = userId;

  const properties = await Property.find(filter)
    .select(
      'title price priceCurrency type dealType city street location photos status numericId userId createdAt clientRequestId'
    )
    .populate('userId', 'name email')
    .sort({ createdAt: 1 })
    .lean();

  const buckets = new Map();
  for (const p of properties) {
    const key = groupKey(p);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(p);
  }

  const windowMs = windowMinutes * 60 * 1000;
  const groups = [];

  for (const [key, items] of buckets) {
    if (items.length < 2) continue;

    // დროის ფანჯარაში დაყოფა — იგივე ობიექტის თვეების შემდეგ ხელახალი ატვირთვა
    // ლეგიტიმური შეიძლება იყოს და დუბლიკატად არ უნდა ჩაითვალოს
    let run = [items[0]];
    const flush = () => {
      if (run.length < 2) return;
      const keeper = pickKeeper(run);
      groups.push({
        key,
        owner: run[0].userId,
        count: run.length,
        keeperId: String(keeper._id),
        firstCreatedAt: run[0].createdAt,
        lastCreatedAt: run[run.length - 1].createdAt,
        totalPhotos: run.reduce((sum, p) => sum + (p.photos?.length || 0), 0),
        photolessCount: run.filter((p) => (p.photos?.length || 0) === 0).length,
        items: run.map((p) => ({
          _id: String(p._id),
          numericId: p.numericId,
          title: p.title,
          price: p.price,
          priceCurrency: p.priceCurrency,
          type: p.type,
          dealType: p.dealType,
          city: p.city,
          street: p.street,
          status: p.status,
          photoCount: p.photos?.length || 0,
          photos: (p.photos || []).slice(0, 4),
          createdAt: p.createdAt,
          hasClientRequestId: Boolean(p.clientRequestId),
        })),
      });
    };

    for (let i = 1; i < items.length; i++) {
      const prev = run[run.length - 1];
      const gap = new Date(items[i].createdAt) - new Date(prev.createdAt);
      if (gap <= windowMs) {
        run.push(items[i]);
      } else {
        flush();
        run = [items[i]];
      }
    }
    flush();
  }

  groups.sort((a, b) => new Date(b.lastCreatedAt) - new Date(a.lastCreatedAt));
  return groups;
}

/**
 * უფოტოო განცხადებები — ჩავარდნილი ატვირთვის მთავარი კვალი.
 *
 * როცა ობიექტი შეიქმნა, ფოტოები კი ვერ აიტვირთა, ჩანაწერი უფოტოოდ რჩება და
 * დუბლიკატის ჯგუფშიც შეიძლება არ მოხვდეს (თუ აგენტმა ხელახლა რუკაზე სხვა
 * წერტილი მონიშნა). ამიტომ ცალკე ჩამონათვალი გვჭირდება.
 */
export async function findPhotolessProperties({ sinceDays = 90, limit = 100 } = {}) {
  const filter = {
    ...PROPERTY_NOT_DELETED,
    $or: [{ photos: { $size: 0 } }, { photos: { $exists: false } }],
  };
  if (sinceDays > 0) {
    filter.createdAt = { $gte: new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000) };
  }

  const docs = await Property.find(filter)
    .select('title price priceCurrency type dealType city street status numericId userId createdAt')
    .populate('userId', 'name email')
    .sort({ createdAt: -1 })
    .limit(Math.min(500, Math.max(1, limit)))
    .lean();

  return docs.map((p) => ({
    _id: String(p._id),
    numericId: p.numericId,
    title: p.title,
    price: p.price,
    priceCurrency: p.priceCurrency,
    type: p.type,
    dealType: p.dealType,
    city: p.city,
    street: p.street,
    status: p.status,
    owner: p.userId,
    createdAt: p.createdAt,
  }));
}

/**
 * ჯგუფის გაერთიანება: ფოტოები გადმოაქვს keeper-ზე და დანარჩენებს ნაგვის ყუთში აგზავნის.
 * ბრუნდება რა მოხდა, რომ ადმინის ლოგში ჩაიწეროს.
 */
export async function mergeDuplicateProperties({ keeperId, duplicateIds, adminUserId }) {
  const keeper = await Property.findOne({ _id: keeperId, ...PROPERTY_NOT_DELETED });
  if (!keeper) return { ok: false, message: 'შესანარჩუნებელი ობიექტი ვერ მოიძებნა' };

  const ids = (duplicateIds || []).filter((id) => String(id) !== String(keeperId));
  if (ids.length === 0) return { ok: false, message: 'გასაერთიანებელი დუბლიკატი არ არის მითითებული' };

  const duplicates = await Property.find({ _id: { $in: ids }, ...PROPERTY_NOT_DELETED });

  const keeperOwner = String(keeper.userId);
  const foreign = duplicates.filter((d) => String(d.userId) !== keeperOwner);
  if (foreign.length > 0) {
    return { ok: false, message: 'ობიექტები სხვადასხვა მფლობელს ეკუთვნის — გაერთიანება არ შესრულდა' };
  }

  const photoSet = new Set(keeper.photos || []);
  const panoramaSet = new Set(keeper.panoramaPhotos || []);
  let addedPhotos = 0;

  for (const dup of duplicates) {
    for (const url of dup.photos || []) {
      if (photoSet.size >= 30) break;
      if (photoSet.has(url)) continue;
      photoSet.add(url);
      addedPhotos += 1;
      if ((dup.panoramaPhotos || []).includes(url)) panoramaSet.add(url);
    }
    // აღწერა/ტური რომ არ დაიკარგოს, თუ keeper-ს არ აქვს
    if (!keeper.tourLink && dup.tourLink) keeper.tourLink = dup.tourLink;
    if (!keeper.exteriorLink && dup.exteriorLink) keeper.exteriorLink = dup.exteriorLink;
    if (!keeper.interiorLink && dup.interiorLink) keeper.interiorLink = dup.interiorLink;
  }

  const mergedPhotos = [...photoSet].slice(0, 30);
  keeper.photos = mergedPhotos;
  keeper.panoramaPhotos = [...panoramaSet].filter((u) => mergedPhotos.includes(u));
  if (keeper.mainPhoto >= mergedPhotos.length) {
    keeper.mainPhoto = Math.max(0, mergedPhotos.length - 1);
  }
  await keeper.save();

  const now = new Date();
  const removedIds = duplicates.map((d) => String(d._id));
  if (removedIds.length > 0) {
    await Property.updateMany(
      { _id: { $in: removedIds } },
      { $set: { deletedAt: now, deletedBy: adminUserId || null } }
    );
  }

  return {
    ok: true,
    keeperId: String(keeper._id),
    addedPhotos,
    removedIds,
    keeperPhotoCount: keeper.photos.length,
  };
}
