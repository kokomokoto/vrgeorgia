import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { nanoid } from 'nanoid';

import { Property } from '../models/Property.js';
import { User } from '../models/User.js';
import Agent from '../models/Agent.js';
import { requireAuth } from '../middleware/auth.js';
import { translateText } from '../services/translate.js';
import { uploadPropertyPhotosMiddleware, deleteCloudinaryImage } from '../services/cloudinary.js';
import { uploadPropertyPhotosFromFiles } from '../services/photoUpload.js';
import { getJWTSecret } from '../config/jwt.js';
import { normalizeTourLink } from '../utils/tourLink.js';
import { buildPropertyTextSearchOr } from '../utils/propertySearch.js';
import { getUsdToGelRate } from '../utils/currency.js';
import { applyPriceRangeFilter } from '../utils/priceFilter.js';
import { applySqmRangeFilter } from '../utils/areaFilter.js';
import { isAdminRole, isAgentRole } from '../utils/userRoles.js';
import { AdminAuditLog } from '../models/AdminAuditLog.js';
import {
  PROPERTY_NOT_DELETED,
  withNotDeleted,
  softDeletePropertyDoc,
} from '../utils/propertySoftDelete.js';
import { applyPropertyQueryFilters, parsePropertySortOption } from '../utils/propertyQueryFilters.js';
import {
  TRANSLATABLE_FIELDS,
  applyTranslation,
  ensurePropertyTranslations,
  fillMissingTranslationsForResponse,
  hasCompleteTranslation,
  pickLanguage,
  scheduleListTranslations,
  scheduleTranslations,
  stripHiddenCadastral,
} from '../utils/propertyTranslations.js';
import {
  discardEditDraft,
  ensureEditDraft,
  mergePatchIntoDraft,
  propertyForEdit,
} from '../services/propertyEditDraft.js';

const router = express.Router();

function normalizePhotoUrl(url) {
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

function photoUrlInList(url, list) {
  if (!url || !Array.isArray(list)) return false;
  const key = normalizePhotoUrl(url);
  return list.some((p) => p === url || normalizePhotoUrl(p) === key);
}

/** JWT-დან მომხმარებლის id და ადმინის ფლაგი (საჯარო GET-ისთვის, სადაც requireAuth არაა) */
async function getRequestUserContext(req) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return { userId: null, isAdmin: false };
  try {
    const jwt = await import('jsonwebtoken');
    const decoded = jwt.default.verify(token, getJWTSecret());
    const userId = decoded.sub;
    const me = await User.findById(userId).select('role').lean();
    return { userId, isAdmin: isAdminRole(me?.role) };
  } catch {
    return { userId: null, isAdmin: false };
  }
}

/** მფლობელი ან ადმინი — რედაქტირება/ფოტოები/სრული ნახვა */
async function userCanManageProperty(requestUserId, property) {
  if (!requestUserId) return false;
  const ownerId =
    property.userId?._id?.toString?.() || property.userId?.toString?.() || String(property.userId);
  if (requestUserId === ownerId) return true;
  const me = await User.findById(requestUserId).select('role').lean();
  return isAdminRole(me?.role);
}

/** სართული ≤ სულ სართული; რემონტის წელი ≥ მშენებლობის წელი */
function validatePropertyDetailNumbers(body) {
  const floor = Number(body.floor) || 0;
  const totalFloors = Number(body.totalFloors) || 0;
  if (floor > 0 && totalFloors > 0 && floor > totalFloors) {
    return {
      msg: 'ბინის სართული არ შეიძლება აღემატებოდეს შენობის სართულების რაოდენობას',
      path: 'floor',
    };
  }
  const constructionYear =
    body.constructionYear !== undefined && body.constructionYear !== null && body.constructionYear !== ''
      ? Number(body.constructionYear)
      : null;
  const renovationYear =
    body.renovationYear !== undefined && body.renovationYear !== null && body.renovationYear !== ''
      ? Number(body.renovationYear)
      : null;
  if (
    constructionYear &&
    renovationYear &&
    Number.isFinite(constructionYear) &&
    Number.isFinite(renovationYear) &&
    renovationYear < constructionYear
  ) {
    return {
      msg: 'რემონტის წელი არ შეიძლება იყოს მშენებლობის წელზე ადრე',
      path: 'renovationYear',
    };
  }
  return null;
}

/** Multi-select rooms/bedrooms: value 6 means „6+“ → field >= 6 */
function applyRoomLikeInFilter(filter, fieldName, rawJson) {
  try {
    const arr = JSON.parse(rawJson);
    if (!Array.isArray(arr) || arr.length === 0) return;
    const nums = arr.map((x) => Number(x)).filter((n) => Number.isFinite(n));
    if (nums.length === 0) return;
    const wantsSixPlus = nums.includes(6);
    const exact = nums.filter((n) => n !== 6);
    const parts = [];
    if (exact.length > 0) parts.push({ [fieldName]: { $in: exact } });
    if (wantsSixPlus) parts.push({ [fieldName]: { $gte: 6 } });
    if (parts.length === 0) return;
    if (parts.length === 1) {
      Object.assign(filter, parts[0]);
    } else {
      filter.$and = filter.$and || [];
      filter.$and.push({ $or: parts });
    }
  } catch (e) {
    // ignore parse error
  }
}

/** საჯარო სიისთვის: აქტიური/მოდერაციაში + საჯარო ხილვადობა */
const PUBLIC_STATUS_OR = {
  $or: [
    { status: 'active' },
    { status: 'pending' },
    { status: { $exists: false } },
  ],
};
const PUBLIC_LISTING_OR = {
  $or: [{ listingVisibility: { $exists: false } }, { listingVisibility: 'public' }],
};

/** ფანჯარა, რომელშიც იდენტური უფოტოო ჩანაწერი ჩავარდნილ ატვირთვად ითვლება */
const FAILED_UPLOAD_REUSE_WINDOW_MS = 30 * 60 * 1000;

/** ველები, რომლებიც იდემპოტენტურ გამეორებაზე უნდა განახლდეს (ფოტოების გარეშე) */
const CREATE_REPLAY_SKIP_FIELDS = new Set([
  'photos',
  'panoramaPhotos',
  'mainPhoto',
  'status',
  'userId',
  'clientRequestId',
]);

/**
 * იდემპოტენტობა — ჩავარდნილი ატვირთვის ხელახლა დაჭერა უნდა დააბრუნოს იგივე ობიექტი,
 * და არა შექმნას ახალი. ორი მექანიზმი:
 *   1. clientRequestId — ზუსტი შესატყვისი (ძირითადი).
 *   2. იდენტური, ჯერ კიდევ უფოტოო ჩანაწერი ბოლო 30 წუთში — უსაფრთხოების ბადე ძველი
 *      ქეშირებული ფრონტენდისთვის, რომელიც გასაღებს არ აგზავნის.
 */
async function findReusablePropertyForCreate(req, clientRequestId) {
  if (clientRequestId) {
    const byKey = await Property.findOne({ userId: req.user.id, clientRequestId });
    if (byKey) return { doc: byKey, reason: 'idempotency-key' };
  }

  const lat = Number(req.body.lat);
  const lng = Number(req.body.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const byContent = await Property.findOne(
    withNotDeleted({
      userId: req.user.id,
      title: req.body.title,
      price: Number(req.body.price),
      type: req.body.type,
      dealType: req.body.dealType,
      'location.lat': lat,
      'location.lng': lng,
      // მხოლოდ უფოტოო ჩანაწერი — თუ ფოტოები აქვს, ატვირთვა წარმატებული იყო
      photos: { $size: 0 },
      createdAt: { $gte: new Date(Date.now() - FAILED_UPLOAD_REUSE_WINDOW_MS) },
    })
  ).sort({ createdAt: -1 });

  return byContent ? { doc: byContent, reason: 'photoless-retry' } : null;
}

// CREATE (protected) - multipart with photos
router.post(
  '/',
  requireAuth,
  uploadPropertyPhotosMiddleware(30),
  [
    body('title').isString().trim().isLength({ min: 2, max: 120 }).withMessage('სათაური უნდა იყოს 2-120 სიმბოლო'),
    body('desc').isString().trim().isLength({ min: 3, max: 5000 }).withMessage('აღწერა უნდა იყოს მინიმუმ 3 სიმბოლო'),
    body('price').isNumeric().withMessage('ფასი უნდა იყოს რიცხვი'),
    body('lat').isNumeric().withMessage('გთხოვთ აირჩიოთ ლოკაცია რუკაზე'),
    body('lng').isNumeric().withMessage('გთხოვთ აირჩიოთ ლოკაცია რუკაზე'),
    body('type').isIn(['apartment', 'house', 'commercial', 'land', 'cottage', 'hotel', 'building', 'warehouse', 'parking', 'business']).withMessage('აირჩიეთ ტიპი'),
    body('dealType').isIn(['sale', 'rent', 'mortgage']).withMessage('აირჩიეთ გარიგების ტიპი'),
    body('city').optional().isString().trim().isLength({ max: 80 }),
    body('street').optional().isString().trim().isLength({ max: 200 }),
    body('region').optional().isString().trim().isLength({ max: 80 }),
    body('sqm').optional({ values: 'falsy' }).isNumeric().withMessage('ფართობი უნდა იყოს რიცხვი'),
    body('houseSqm').optional({ values: 'falsy' }).isNumeric().withMessage('სახლის ფართობი უნდა იყოს რიცხვი'),
    body('rooms').optional().isNumeric().withMessage('ოთახების რაოდენობა უნდა იყოს რიცხვი'),
    body('bedrooms').optional().isNumeric().withMessage('საძინებლების რაოდენობა უნდა იყოს რიცხვი'),
    body('buildingProject').optional().isString().trim(),
    body('buildingStatus').optional().isString().trim(),
    body('renovationStatus').optional().isString().trim(),
    body('landStatus').optional().isIn(['', 'agricultural', 'non_agricultural']).withMessage('მიწის სტატუსი არასწორია'),
    body('priceCurrency').optional().isIn(['USD', 'GEL']).withMessage('ვალუტა უნდა იყოს USD ან GEL'),
    body('priceType').optional().isIn(['total', 'per_sqm']).withMessage('ფასის ტიპი უნდა იყოს total ან per_sqm'),
    body('threeDLink').optional().isString().trim().isLength({ max: 1000 }),
    body('exteriorLink').optional().isString().trim().isLength({ max: 1000 }),
    body('interiorLink').optional().isString().trim().isLength({ max: 1000 }),
    body('tourLink').optional().isString().trim().isLength({ max: 2000 }),
    body('defaultMediaView')
      .optional()
      .isIn(['exterior', 'interior', 'tour', 'photos'])
      .withMessage('defaultMediaView უნდა იყოს exterior, interior, tour ან photos'),
    body('contactPhone').optional().isString().trim().isLength({ max: 50 }),
    body('contactEmail').optional({ values: 'falsy' }).isEmail().withMessage('გთხოვთ შეიყვანოთ სწორი ელ-ფოსტა (მაგ: example@mail.ru)').normalizeEmail(),
    body('cadastralCode').optional().isString().trim(),
    body('clientRequestId').optional().isString().trim().isLength({ max: 100 }),
    body('privateNotes').optional().isString().trim().isLength({ max: 5000 }),
    body('brokerListingMode').optional().isIn(['public', 'unlisted', 'private', 'sold']),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const clientRequestId = String(req.body.clientRequestId || '').trim().slice(0, 100);

    // ჩავარდნილი ატვირთვის გამეორება ახალ ობიექტს არ უნდა შექმნას (იდემპოტენტობა)
    let reusable = null;
    try {
      reusable = await findReusablePropertyForCreate(req, clientRequestId);
    } catch (lookupErr) {
      console.warn('create idempotency lookup failed:', lookupErr?.message || lookupErr);
    }

    // საკადასტრო კოდის უნიკალურობის შემოწმება (თუ მითითებულია)
    if (req.body.cadastralCode && req.body.cadastralCode.trim()) {
      const existingByCadastral = await Property.findOne(
        withNotDeleted({ cadastralCode: req.body.cadastralCode.trim() })
      );
      // საკუთარი თავი ვერ იქნება დუბლიკატი — გამეორებულ მოთხოვნას არ ვბლოკავთ
      if (existingByCadastral && String(existingByCadastral._id) !== String(reusable?.doc?._id || '')) {
        return res.status(400).json({ errors: [{ msg: 'ამ საკადასტრო კოდით ობიექტი უკვე არსებობს', path: 'cadastralCode' }] });
      }
    }

    const cadastralHidden =
      req.body.cadastralHidden === true ||
      req.body.cadastralHidden === 'true';

    let photos = [];
    let panoramaPhotos = [];
    let panoramaFlags = [];
    try {
      panoramaFlags = req.body.panoramaFlags ? JSON.parse(req.body.panoramaFlags) : [];
      if (!Array.isArray(panoramaFlags)) panoramaFlags = [];
    } catch {
      panoramaFlags = [];
    }
    let photoFailures = [];
    try {
      const uploaded = await uploadPropertyPhotosFromFiles(req.files || [], panoramaFlags);
      photos = uploaded.urls.slice(0, 30);
      panoramaPhotos = (uploaded.panoramaUrls || []).filter((u) => photos.includes(u));
      photoFailures = uploaded.failures || [];
      // ყველა ფოტო ჩავარდა — ობიექტს უფოტოოდ არ ვქმნით
      if (photos.length === 0 && photoFailures.length > 0) {
        return res.status(400).json({
          message: `ფოტოს ატვირთვა ვერ მოხერხდა: ${photoFailures.map((f) => f.message).join('; ')}`,
          photoFailures,
        });
      }
    } catch (uploadErr) {
      return res.status(400).json({ message: uploadErr.message || 'ფოტოს ატვირთვა ვერ მოხერხდა' });
    }

    let tbilisiSubdistricts = [];
    try {
      tbilisiSubdistricts = req.body.tbilisiSubdistricts ? JSON.parse(req.body.tbilisiSubdistricts) : [];
      if (!Array.isArray(tbilisiSubdistricts)) tbilisiSubdistricts = [];
    } catch {
      return res.status(400).json({ message: 'tbilisiSubdistricts JSON არასწორია' });
    }

    let amenities = {};
    try {
      amenities = req.body.amenities ? JSON.parse(req.body.amenities) : {};
      if (!amenities || typeof amenities !== 'object' || Array.isArray(amenities)) amenities = {};
    } catch {
      return res.status(400).json({ message: 'amenities JSON არასწორია' });
    }

    let mediaLinks = [];
    try {
      mediaLinks = req.body.mediaLinks ? JSON.parse(req.body.mediaLinks) : [];
      if (!Array.isArray(mediaLinks)) mediaLinks = [];
    } catch {
      return res.status(400).json({ message: 'mediaLinks JSON არასწორია' });
    }

    const detailErr = validatePropertyDetailNumbers(req.body);
    if (detailErr) return res.status(400).json({ errors: [detailErr] });

    try {
      const agentProfile = await Agent.findOne({ user: req.user.id }).select('_id phone email').lean();
      const payload = {
        title: req.body.title,
        desc: req.body.desc,
        price: Number(req.body.price),
        priceCurrency: req.body.priceCurrency || 'USD',
        priceType: req.body.priceType || 'total',
        city: req.body.city || '',
        street: (req.body.street || '').trim(),
        region: req.body.region || '',
        tbilisiDistrict: req.body.tbilisiDistrict || '',
        tbilisiSubdistricts,
        sqm: Number(req.body.sqm) || 0,
        houseSqm: Number(req.body.houseSqm) || 0,
        rooms: Number(req.body.rooms) || 0,
        bedrooms: Number(req.body.bedrooms) || 0,
        roomCount: Number(req.body.roomCount) || 0,
        floor: Number(req.body.floor) || 0,
        totalFloors: Number(req.body.totalFloors) || 0,
        balcony: Number(req.body.balcony) || 0,
        loggia: Number(req.body.loggia) || 0,
        bathroom: Number(req.body.bathroom) || 0,
        constructionYear: req.body.constructionYear ? Number(req.body.constructionYear) : null,
        renovationYear: req.body.renovationYear ? Number(req.body.renovationYear) : null,
        cadastralCode: (req.body.cadastralCode || '').trim(),
        cadastralHidden,
        buildingProject: req.body.buildingProject || '',
        buildingStatus: req.body.buildingStatus || '',
        renovationStatus: req.body.renovationStatus || '',
        landStatus: req.body.type === 'land' ? (req.body.landStatus || '') : '',
        amenities,
        location: { lat: Number(req.body.lat), lng: Number(req.body.lng) },
        type: req.body.type,
        dealType: req.body.dealType,
        photos,
        panoramaPhotos,
        mainPhoto: Math.min(
          Math.max(0, Number(req.body.mainPhoto) || 0),
          Math.max(0, photos.length - 1)
        ),
        threeDLink: req.body.threeDLink || '',
        exteriorLink: req.body.exteriorLink || '',
        interiorLink: req.body.interiorLink || '',
        tourLink: normalizeTourLink(req.body.tourLink || ''),
        defaultMediaView: ['exterior', 'interior', 'tour', 'photos'].includes(req.body.defaultMediaView)
          ? req.body.defaultMediaView
          : 'exterior',
        mediaLinks,
        status: 'pending',
        userId: req.user.id,
        agentId: agentProfile?._id || null,
        privateNotes: req.body.privateNotes || '',
        contact: {
          phone: req.body.contactPhone || agentProfile?.phone || '',
          email: req.body.contactEmail || agentProfile?.email || '',
        },
      };
      if (clientRequestId) payload.clientRequestId = clientRequestId;

      // ატვირთვისას არჩეული ხილვადობა (საჯარო / ლინკით / პირადი / გაყიდული)
      const createMode = req.body.brokerListingMode;
      if (createMode === 'sold') {
        payload.status = 'sold';
      } else if (createMode === 'public' || createMode === 'unlisted' || createMode === 'private') {
        payload.listingVisibility = createMode;
        if (createMode === 'unlisted') {
          payload.shareToken = nanoid(16);
        }
      }

      // გამეორებული ატვირთვა: არსებული ჩანაწერი განვაახლოთ, ახალი არ შევქმნათ
      if (reusable?.doc) {
        const existing = reusable.doc;
        for (const [key, value] of Object.entries(payload)) {
          if (CREATE_REPLAY_SKIP_FIELDS.has(key)) continue;
          existing.set(key, value);
        }
        if (clientRequestId && !existing.clientRequestId) {
          existing.clientRequestId = clientRequestId;
        }
        // sold სტატუსი CREATE_REPLAY_SKIP_FIELDS-შია — ხელით ვაყენებთ
        if (createMode === 'sold') {
          existing.status = 'sold';
        } else if (createMode && existing.status === 'sold') {
          existing.status = 'pending';
        }
        if (createMode === 'unlisted' && !existing.shareToken) {
          existing.shareToken = nanoid(16);
        }
        if (createMode === 'public' || createMode === 'private') {
          existing.shareToken = undefined;
        }
        // თუ ამ ცდაზე ფოტოებიც მოვიდა, დავამატოთ — Cloudinary-ზე ატვირთული არ უნდა დაიკარგოს
        if (photos.length > 0) {
          const merged = [...(existing.photos || []), ...photos].slice(0, 30);
          existing.photos = merged;
          existing.panoramaPhotos = [
            ...new Set([...(existing.panoramaPhotos || []), ...panoramaPhotos]),
          ].filter((u) => merged.includes(u));
        }
        await existing.save();
        scheduleTranslations(existing._id);
        return res.status(200).json({
          property: existing,
          resumed: true,
          resumeReason: reusable.reason,
          ...(photoFailures.length ? { photoFailures } : {}),
        });
      }

      const property = await Property.create(payload);

      scheduleTranslations(property._id);
      res.status(201).json({
        property,
        ...(photoFailures.length ? { photoFailures } : {}),
      });
    } catch (err) {
      console.error('Property.create failed:', err);
      // ორი პარალელური დაჭერა ერთი გასაღებით — უნიკალური ინდექსი აჭერს მეორეს
      if (err.code === 11000 && clientRequestId) {
        const winner = await Property.findOne({ userId: req.user.id, clientRequestId });
        if (winner) {
          return res.status(200).json({ property: winner, resumed: true, resumeReason: 'concurrent-submit' });
        }
      }
      if (err.code === 11000) {
        return res.status(400).json({ message: 'ამ მონაცემებით ჩანაწერი უკვე არსებობს (უნიკალური ველი)' });
      }
      if (err.name === 'ValidationError') {
        const msgs = Object.values(err.errors || {}).map((e) => e.message).join(', ');
        return res.status(400).json({ message: msgs || err.message || 'ვალიდაციის შეცდომა' });
      }
      return res.status(500).json({
        message: err.message || 'ობიექტის შენახვა ვერ მოხერხდა. შეამოწმეთ MongoDB, Cloudinary env და სერვერის ლოგი.',
      });
    }
  }
);

function applyBrokerListingModeFilter(filter, mode) {
  const m = String(mode || '').trim();
  if (!m) return;
  if (m === 'sold') {
    filter.status = 'sold';
    return;
  }
  filter.status = { $ne: 'sold' };
  if (m === 'public') {
    filter.$and = filter.$and || [];
    filter.$and.push({
      $or: [{ listingVisibility: { $exists: false } }, { listingVisibility: 'public' }],
    });
  } else if (m === 'unlisted') {
    filter.listingVisibility = 'unlisted';
  } else if (m === 'private') {
    filter.listingVisibility = 'private';
  }
}

// GET user's own properties (for profile page)
router.get(
  '/user/my',
  requireAuth,
  async (req, res) => {
    const baseFilter = withNotDeleted({ userId: req.user.id });
    const filter = withNotDeleted({ userId: req.user.id });
    applyBrokerListingModeFilter(filter, req.query.brokerListingMode || req.query.listingVisibility);
    await applyPropertyQueryFilters(filter, req.query);
    const sort = parsePropertySortOption(req.query.sort);

    const [totalAll, total, rows] = await Promise.all([
      Property.countDocuments(baseFilter),
      Property.countDocuments(filter),
      Property.find(filter).sort(sort).lean(),
    ]);

    const properties = rows.map((p) => {
      const { editDraft, ...rest } = p;
      return { ...rest, hasEditDraft: Boolean(editDraft) };
    });
    res.json({ properties, total, totalAll });
  }
);

// LIST with filters/query params
router.get(
  '/',
  [
    query('q').optional({ values: 'falsy' }).isString().trim().isLength({ max: 100 }),
    query('minPrice').optional({ values: 'falsy' }).isNumeric(),
    query('maxPrice').optional({ values: 'falsy' }).isNumeric(),
    query('type').optional({ values: 'falsy' }).isString(), // მასივი JSON ფორმატში
    query('dealType').optional({ values: 'falsy' }).isString(),
    query('city').optional({ values: 'falsy' }).isString().trim().isLength({ max: 80 }),
    query('region').optional({ values: 'falsy' }).isString().trim().isLength({ max: 80 }),
    query('tbilisiDistrict').optional({ values: 'falsy' }).isString().trim(),
    query('tbilisiSubdistricts').optional({ values: 'falsy' }).isString(),
    query('has3d').optional({ values: 'falsy' }).isIn(['true', 'false']),
    query('hasPhotos').optional({ values: 'falsy' }).isIn(['true', 'false']),
    query('minSqm').optional({ values: 'falsy' }).isNumeric(),
    query('maxSqm').optional({ values: 'falsy' }).isNumeric(),
    query('minConstructionYear').optional({ values: 'falsy' }).isNumeric(),
    query('maxConstructionYear').optional({ values: 'falsy' }).isNumeric(),
    query('minRenovationYear').optional({ values: 'falsy' }).isNumeric(),
    query('maxRenovationYear').optional({ values: 'falsy' }).isNumeric(),
    query('rooms').optional({ values: 'falsy' }).isString(),
    query('bedrooms').optional({ values: 'falsy' }).isString(),
    query('minRooms').optional({ values: 'falsy' }).isNumeric(),
    query('maxRooms').optional({ values: 'falsy' }).isNumeric(),
    query('minBedrooms').optional({ values: 'falsy' }).isNumeric(),
    query('maxBedrooms').optional({ values: 'falsy' }).isNumeric(),
    query('amenities').optional({ values: 'falsy' }).isString(), // მასივი JSON ფორმატში
    query('balconies').optional({ values: 'falsy' }).isString(),
    query('buildingProject').optional({ values: 'falsy' }).isString().trim(),
    query('renovationStatus').optional({ values: 'falsy' }).isString().trim(),
    query('buildingStatus').optional({ values: 'falsy' }).isString().trim(),
    query('landStatus').optional({ values: 'falsy' }).isString().trim(),
    query('priceCurrency').optional({ values: 'falsy' }).isIn(['USD', 'GEL']),
    query('priceType').optional({ values: 'falsy' }).isIn(['total', 'per_sqm']),
    query('sort').optional({ values: 'falsy' }).isString(),
    query('propertyId').optional({ values: 'falsy' }).isString().trim(),
    query('page').optional({ values: 'falsy' }).isInt({ min: 1 }),
    query('limit').optional({ values: 'falsy' }).isInt({ min: 1, max: 5000 }),
    query('includeTypeCounts').optional({ values: 'falsy' }).isIn(['true', '1']),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const lang = pickLanguage(req);
    const hasPage =
      req.query.page !== undefined && req.query.page !== null && String(req.query.page).trim() !== '';
    const hasLimit =
      req.query.limit !== undefined && req.query.limit !== null && String(req.query.limit).trim() !== '';
    const pageNum = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
    // If client omits page/limit (legacy frontend), return a large batch so listings are not capped at 40.
    // Paginated clients always send page and/or limit explicitly (default page size 40).
    const fallbackLimit = hasPage || hasLimit ? 40 : 5000;
    const limitNum = Math.min(
      5000,
      Math.max(1, parseInt(String(hasLimit ? req.query.limit : fallbackLimit), 10) || fallbackLimit)
    );
    const skip = (pageNum - 1) * limitNum;
    const wantTypeCounts =
      req.query.includeTypeCounts === 'true' || req.query.includeTypeCounts === '1';

    // საჯარო სია: სტატუსი + listingVisibility (არ ჩანს private/unlisted/gsold)
    const filter = {
      $and: [{ ...PUBLIC_STATUS_OR }, { ...PUBLIC_LISTING_OR }, PROPERTY_NOT_DELETED],
    };

    // ტექსტური ძიება — სათაური, აღწერა, ტელეფონი, აგენტის სახელი, ID...
    if (req.query.q) {
      const textOr = await buildPropertyTextSearchOr(req.query.q);
      if (textOr.length) filter.$and.push({ $or: textOr });
    }
    // type შეიძლება იყოს მასივი (მრავალი კატეგორიის არჩევა)
    if (req.query.type) {
      try {
        const types = JSON.parse(req.query.type);
        if (Array.isArray(types) && types.length > 0) {
          filter.type = { $in: types };
        }
      } catch (e) {
        // თუ JSON არ არის, მარტივი string-ია
        filter.type = req.query.type;
      }
    }
    // dealType შეიძლება იყოს მასივი (მრავალი ტიპის არჩევა)
    if (req.query.dealType) {
      try {
        const dealTypes = JSON.parse(req.query.dealType);
        if (Array.isArray(dealTypes) && dealTypes.length > 0) {
          filter.dealType = { $in: dealTypes };
        }
      } catch (e) {
        // თუ JSON არ არის, მარტივი string-ია
        filter.dealType = req.query.dealType;
      }
    }
    if (req.query.city) filter.city = req.query.city;
    if (req.query.region) filter.region = req.query.region;

    // თბილისის უბნებით ფილტრაცია
    if (req.query.tbilisiDistrict) {
      filter.tbilisiDistrict = req.query.tbilisiDistrict;
    }
    if (req.query.tbilisiSubdistricts) {
      try {
        const subdistricts = JSON.parse(req.query.tbilisiSubdistricts);
        if (Array.isArray(subdistricts) && subdistricts.length > 0) {
          filter.tbilisiSubdistricts = { $in: subdistricts };
        }
      } catch (e) {
        // ignore parse error
      }
    }

    // ფასის ფილტრი — ვალუტა = ერთეული (კურსით გადათვლა), არა ატვირთული priceCurrency
    if (req.query.minPrice || req.query.maxPrice) {
      const usdToGel = await getUsdToGelRate();
      applyPriceRangeFilter(
        filter,
        {
          minPrice: req.query.minPrice,
          maxPrice: req.query.maxPrice,
          priceType: req.query.priceType || '',
          priceCurrency: req.query.priceCurrency || 'USD',
        },
        usdToGel
      );
    }

    if (req.query.minSqm || req.query.maxSqm) {
      applySqmRangeFilter(filter, {
        minSqm: req.query.minSqm,
        maxSqm: req.query.maxSqm,
      });
    }

    if (req.query.minConstructionYear || req.query.maxConstructionYear) {
      filter.constructionYear = {};
      if (req.query.minConstructionYear) filter.constructionYear.$gte = Number(req.query.minConstructionYear);
      if (req.query.maxConstructionYear) filter.constructionYear.$lte = Number(req.query.maxConstructionYear);
    }

    if (req.query.minRenovationYear || req.query.maxRenovationYear) {
      filter.renovationYear = {};
      if (req.query.minRenovationYear) filter.renovationYear.$gte = Number(req.query.minRenovationYear);
      if (req.query.maxRenovationYear) filter.renovationYear.$lte = Number(req.query.maxRenovationYear);
    }

    if (req.query.rooms) {
      applyRoomLikeInFilter(filter, 'rooms', req.query.rooms);
    } else if (req.query.minRooms || req.query.maxRooms) {
      filter.rooms = {};
      if (req.query.minRooms) filter.rooms.$gte = Number(req.query.minRooms);
      if (req.query.maxRooms) filter.rooms.$lte = Number(req.query.maxRooms);
    }

    if (req.query.bedrooms) {
      applyRoomLikeInFilter(filter, 'bedrooms', req.query.bedrooms);
    } else     if (req.query.minBedrooms || req.query.maxBedrooms) {
      filter.bedrooms = {};
      if (req.query.minBedrooms) filter.bedrooms.$gte = Number(req.query.minBedrooms);
      if (req.query.maxBedrooms) filter.bedrooms.$lte = Number(req.query.maxBedrooms);
    }

    if (req.query.balconies) {
      try {
        const balcon = JSON.parse(req.query.balconies);
        if (Array.isArray(balcon) && balcon.length > 0) {
          const nums = balcon.map((x) => Number(x)).filter((n) => Number.isFinite(n) && n >= 0);
          if (nums.length > 0) filter.balcony = { $in: nums };
        }
      } catch (e) {
        // ignore parse error
      }
    }

    if (req.query.has3d === 'true') {
      // 3D აქვს თუ ერთი მაინც ლინკიდანაა შევსებული
      filter.$and.push({
        $or: [
          { threeDLink: { $ne: '' } },
          { exteriorLink: { $ne: '' } },
          { interiorLink: { $ne: '' } },
          { tourLink: { $ne: '' } },
        ],
      });
    }
    if (req.query.has3d === 'false') {
      // 3D არ აქვს თუ არცერთი ლინკი არ არის
      filter.threeDLink = '';
      filter.exteriorLink = '';
      filter.interiorLink = '';
      filter.tourLink = '';
    }

    if (req.query.hasPhotos === 'true') filter.photos = { $exists: true, $ne: [] };
    if (req.query.hasPhotos === 'false') {
      filter.$and.push({
        $or: [{ photos: { $exists: false } }, { photos: { $size: 0 } }],
      });
    }

    // კომფორტი და კომუნიკაციების ფილტრაცია
    if (req.query.amenities) {
      try {
        const amenities = JSON.parse(req.query.amenities);
        if (Array.isArray(amenities) && amenities.length > 0) {
          amenities.forEach(amenity => {
            filter[`amenities.${amenity}`] = true;
          });
        }
      } catch (e) {
        // ignore parse error
      }
    }

    // ბინის პროექტის ფილტრი
    if (req.query.buildingProject) {
      try {
        const projects = JSON.parse(req.query.buildingProject);
        if (Array.isArray(projects) && projects.length > 0) {
          filter.buildingProject = { $in: projects };
        }
      } catch (e) {
        filter.buildingProject = req.query.buildingProject;
      }
    }

    // რემონტის სტატუსის ფილტრი
    if (req.query.renovationStatus) {
      try {
        const statuses = JSON.parse(req.query.renovationStatus);
        if (Array.isArray(statuses) && statuses.length > 0) {
          filter.renovationStatus = { $in: statuses };
        }
      } catch (e) {
        filter.renovationStatus = req.query.renovationStatus;
      }
    }
    if (req.query.buildingStatus) {
      try {
        const statuses = JSON.parse(req.query.buildingStatus);
        if (Array.isArray(statuses) && statuses.length > 0) {
          filter.buildingStatus = { $in: statuses };
        }
      } catch (e) {
        filter.buildingStatus = req.query.buildingStatus;
      }
    }
    if (req.query.landStatus) {
      try {
        const statuses = JSON.parse(req.query.landStatus);
        if (Array.isArray(statuses) && statuses.length > 0) {
          filter.landStatus = { $in: statuses };
        }
      } catch (e) {
        filter.landStatus = req.query.landStatus;
      }
    }

    // ID-ით ძებნა (ციფრული numericId)
    if (req.query.propertyId) {
      const numId = Number(req.query.propertyId);
      if (!isNaN(numId) && numId > 0) {
        filter.numericId = numId;
      }
    }

    // სორტირება (მრავალი კრიტერიუმი, მძიმით გამოყოფილი: "price_asc,date_desc")
    let sortOption = {};
    const SORT_MAP = {
      date_asc: { createdAt: 1 },
      date_desc: { createdAt: -1 },
      price_asc: { price: 1 },
      price_desc: { price: -1 },
      area_asc: { sqm: 1 },
      area_desc: { sqm: -1 },
      views_asc: { views: 1 },
      views_desc: { views: -1 },
    };
    if (req.query.sort) {
      const parts = req.query.sort.split(',').map(s => s.trim());
      for (const part of parts) {
        if (SORT_MAP[part]) {
          Object.assign(sortOption, SORT_MAP[part]);
        }
      }
    }
    if (Object.keys(sortOption).length === 0) {
      sortOption = { createdAt: -1 }; // default
    }

    // ადმინის მიერ აპინული ობიექტები ყოველთვის პირველ რიგში, მერე არჩეული სორტი
    const finalSort = { pinned: -1, pinnedAt: -1, ...sortOption };

    const findQuery = Property.find(filter).sort(finalSort).skip(skip).limit(limitNum).lean();
    const countQuery = Property.countDocuments(filter);
    const typeCountsQuery = wantTypeCounts
      ? Property.aggregate([
          { $match: filter },
          { $group: { _id: '$type', count: { $sum: 1 } } },
        ])
      : Promise.resolve(null);

    const [properties, total, typeCountRows] = await Promise.all([
      findQuery,
      countQuery,
      typeCountsQuery,
    ]);

    await fillMissingTranslationsForResponse(properties, lang);
    scheduleListTranslations(properties, lang);

    const translated = properties.map((p) => {
      const { privateNotes, shareToken, ...safe } = applyTranslation(p, lang);
      return stripHiddenCadastral(safe);
    });

    const payload = {
      properties: translated,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      limit: limitNum,
    };

    if (typeCountRows) {
      const typeCounts = {};
      for (const row of typeCountRows) {
        if (row?._id) typeCounts[row._id] = row.count;
      }
      payload.typeCounts = typeCounts;
    }

    res.json(payload);
  }
);

// GET properties by user id
router.get(
  '/user/:userId',
  [param('userId').isString().trim().isLength({ min: 5 })],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const lang = pickLanguage(req);
    const properties = await Property.find({
      userId: req.params.userId,
      $and: [{ ...PUBLIC_STATUS_OR }, { ...PUBLIC_LISTING_OR }, PROPERTY_NOT_DELETED],
    })
      .sort({ createdAt: -1 })
      .lean();

    await fillMissingTranslationsForResponse(properties, lang);
    scheduleListTranslations(properties, lang);

    const translated = properties.map((p) => {
      const { privateNotes, shareToken, ...safe } = applyTranslation(p, lang);
      return stripHiddenCadastral(safe);
    });
    res.json({ properties: translated });
  }
);

// GET for edit form (draft overlay; does not increment views)
router.get(
  '/:id/for-edit',
  requireAuth,
  [param('id').isString().trim().isLength({ min: 5 })],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const property = await Property.findById(req.params.id)
      .populate('userId', 'email name phone avatar role')
      .lean();
    if (!property) return res.status(404).json({ message: 'Not found' });
    if (property.deletedAt) return res.status(404).json({ message: 'Not found' });
    if (!(await userCanManageProperty(req.user.id, property))) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    if (property.tourLink) {
      property.tourLink = normalizeTourLink(property.tourLink);
    }

    try {
      res.json({ property: propertyForEdit(property) });
    } catch (err) {
      console.error('for-edit failed:', err);
      res.status(500).json({ message: 'რედაქტირების მონაცემების ჩატვირთვა ვერ მოხერხდა' });
    }
  }
);

// Discard staged edit draft (cancel without save)
router.delete(
  '/:id/draft',
  requireAuth,
  [param('id').isString().trim().isLength({ min: 5 })],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const existing = await Property.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Not found' });
    if (existing.deletedAt) return res.status(404).json({ message: 'Not found' });
    if (!(await userCanManageProperty(req.user.id, existing))) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    await discardEditDraft(existing);
    await existing.save();
    res.json({ ok: true });
  }
);

// GET by id (and optionally translate)
router.get(
  '/:id',
  [
    param('id').isString().trim().isLength({ min: 5 }),
    query('t').optional({ values: 'falsy' }).isString().trim().isLength({ min: 8, max: 64 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const lang = pickLanguage(req);

    const property = await Property.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    )
      .populate('userId', 'email name phone avatar role')
      .lean();
    if (!property) return res.status(404).json({ message: 'Not found' });
    if (property.deletedAt) return res.status(404).json({ message: 'Not found' });

    // privateNotes მხოლოდ მფლობელისთვის / ადმინისთვის ხილული
    const { userId: requestUserId, isAdmin: requestIsAdmin } = await getRequestUserContext(req);
    const ownerIdStr = property.userId?._id?.toString() || property.userId?.toString();
    const isOwner =
      !!requestUserId && (requestUserId === ownerIdStr || requestIsAdmin);
    const shareParam = (req.query.t || '').toString().trim();
    const listingVisibility = property.listingVisibility || 'public';

    if (!isOwner) {
      if (property.status === 'rejected') {
        return res.status(404).json({ message: 'Not found' });
      }
      if (property.status === 'sold') {
        return res.status(404).json({ message: 'Not found' });
      }
      if (listingVisibility === 'private') {
        return res.status(404).json({ message: 'Not found' });
      }
      if (listingVisibility === 'unlisted') {
        const tokenOk =
          property.shareToken &&
          shareParam &&
          shareParam === property.shareToken;
        if (!tokenOk) {
          return res.status(404).json({ message: 'Not found' });
        }
      }
      const isPubliclyVisible =
        property.status === 'active' ||
        property.status === 'pending' ||
        property.status === undefined;
      if (listingVisibility === 'public' && !isPubliclyVisible) {
        return res.status(404).json({ message: 'Not found' });
      }
    }

    if (!isOwner) {
      delete property.privateNotes;
      delete property.shareToken;
      if (property.cadastralHidden) {
        delete property.cadastralCode;
        delete property.cadastralHidden;
      }
    }

    if (property.tourLink) {
      property.tourLink = normalizeTourLink(property.tourLink);
    }

    if (ownerIdStr && isAgentRole(property.userId?.role)) {
      const agentDoc = await Agent.findOne({ user: ownerIdStr }).select('_id').lean();
      if (agentDoc?._id) {
        property.ownerAgentProfileId = String(agentDoc._id);
      }
    }

    delete property.editDraft;

    if (!hasCompleteTranslation(property, lang)) {
      try {
        const translations = await ensurePropertyTranslations(property._id, [lang]);
        if (translations) property.translations = translations;
      } catch (err) {
        console.warn('lazy translate (GET by id) failed:', err?.message || err);
      }
    }

    res.json({ property: applyTranslation(property, lang) });
  }
);

// ADD PHOTOS (protected; only owner) - multipart with photos
router.post(
  '/:id/photos',
  requireAuth,
  uploadPropertyPhotosMiddleware(30),
  [param('id').isString().trim().isLength({ min: 5 })],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const existing = await Property.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Not found' });
    if (existing.deletedAt) return res.status(404).json({ message: 'Not found' });
    if (!(await userCanManageProperty(req.user.id, existing))) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    let panoramaFlags = [];
    try {
      panoramaFlags = req.body.panoramaFlags ? JSON.parse(req.body.panoramaFlags) : [];
      if (!Array.isArray(panoramaFlags)) panoramaFlags = [];
    } catch {
      panoramaFlags = [];
    }

    let uploaded = [];
    let uploadedPanoramas = [];
    let photoFailures = [];
    try {
      const result = await uploadPropertyPhotosFromFiles(req.files || [], panoramaFlags);
      uploaded = result.urls;
      uploadedPanoramas = result.panoramaUrls || [];
      photoFailures = result.failures || [];
    } catch (uploadErr) {
      return res.status(400).json({ message: uploadErr.message || 'ფოტოს ატვირთვა ვერ მოხერხდა' });
    }
    if (uploaded.length === 0) {
      return res.status(400).json({
        message: photoFailures.length
          ? `ფოტო არ აიტვირთა: ${photoFailures.map((f) => f.message).join('; ')}`
          : 'ფოტო არ აიტვირთა',
        photoFailures,
      });
    }

    const useDraft = req.query.draft === '1' || req.query.draft === 'true';
    const newPanoramas = uploadedPanoramas;

    if (useDraft) {
      ensureEditDraft(existing);
      const draft = existing.editDraft;
      const next = [...(draft.photos || []), ...uploaded].slice(0, 30);
      const nextPanorama = [...(draft.panoramaPhotos || []), ...newPanoramas].filter((u) => next.includes(u));
      draft.photos = next;
      draft.panoramaPhotos = [...new Set(nextPanorama)];
      existing.markModified('editDraft');
      await existing.save();
      return res.json({
        photos: draft.photos,
        panoramaPhotos: draft.panoramaPhotos,
        ...(photoFailures.length ? { photoFailures } : {}),
      });
    }

    const next = [...(existing.photos || []), ...uploaded].slice(0, 30);
    const nextPanorama = [...(existing.panoramaPhotos || []), ...newPanoramas].filter((u) => next.includes(u));
    existing.photos = next;
    existing.panoramaPhotos = [...new Set(nextPanorama)];
    await existing.save();

    res.json({
      photos: existing.photos,
      panoramaPhotos: existing.panoramaPhotos,
      ...(photoFailures.length ? { photoFailures } : {}),
    });
  }
);

// UPDATE (protected; only owner)
router.put(
  '/:id',
  requireAuth,
  [
    param('id').isString().trim().isLength({ min: 5 }),
    body('title').optional().isString().trim().isLength({ min: 2, max: 120 }),
    body('desc').optional().isString().trim().isLength({ min: 3, max: 5000 }),
    body('price').optional().isNumeric(),
    body('type').optional().isIn(['apartment', 'house', 'commercial', 'land', 'cottage', 'hotel', 'building', 'warehouse', 'parking', 'business']),
    body('dealType').optional().isIn(['sale', 'rent', 'mortgage']),
    body('city').optional().isString().trim().isLength({ max: 80 }),
    body('street').optional().isString().trim().isLength({ max: 200 }),
    body('region').optional().isString().trim().isLength({ max: 80 }),
    body('sqm').optional({ values: 'falsy' }).isNumeric(),
    body('houseSqm').optional({ values: 'falsy' }).isNumeric(),
    body('rooms').optional().isNumeric(),
    body('bedrooms').optional().isNumeric(),
    body('threeDLink').optional().isString().trim().isLength({ max: 1000 }),
    body('exteriorLink').optional().isString().trim().isLength({ max: 1000 }),
    body('interiorLink').optional().isString().trim().isLength({ max: 1000 }),
    body('tourLink').optional().isString().trim().isLength({ max: 2000 }),
    body('defaultMediaView')
      .optional()
      .isIn(['exterior', 'interior', 'tour', 'photos'])
      .withMessage('defaultMediaView უნდა იყოს exterior, interior, tour ან photos'),
    body('contactPhone').optional().isString().trim().isLength({ max: 50 }),
    body('contactEmail').optional({ values: 'falsy' }).isEmail().normalizeEmail(),
    body('photos').optional().isArray(),
    body('panoramaPhotos').optional().isArray(),
    body('mainPhoto').optional().isInt({ min: 0 }),
    body('cadastralHidden').optional().isBoolean(),
    body('landStatus').optional().isIn(['', 'agricultural', 'non_agricultural']),
    body('brokerListingMode').optional().isIn(['public', 'unlisted', 'private', 'sold'])
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const existing = await Property.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Not found' });
    if (existing.deletedAt) return res.status(404).json({ message: 'Not found' });
    if (!(await userCanManageProperty(req.user.id, existing))) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const patch = {};
    for (const k of ['title', 'desc', 'type', 'dealType', 'city', 'street', 'region', 'tbilisiDistrict', 'threeDLink', 'exteriorLink', 'interiorLink', 'tourLink', 'defaultMediaView', 'cadastralCode', 'privateNotes', 'buildingProject', 'buildingStatus', 'renovationStatus', 'landStatus', 'cadastralHidden']) {
      if (req.body[k] !== undefined) patch[k] = req.body[k];
    }
    const nextType = patch.type !== undefined ? patch.type : existing.type;
    if (nextType !== 'land') {
      patch.landStatus = '';
    }
    if (patch.tourLink !== undefined) {
      patch.tourLink = normalizeTourLink(patch.tourLink);
    }
    // საკადასტრო კოდის უნიკალურობის შემოწმება რედაქტირებისას (თუ მითითებულია)
    if (req.body.cadastralCode && req.body.cadastralCode.trim()) {
      const dup = await Property.findOne(
        withNotDeleted({ cadastralCode: req.body.cadastralCode.trim(), _id: { $ne: existing._id } })
      );
      if (dup) {
        return res.status(400).json({ errors: [{ msg: 'ამ საკადასტრო კოდით ობიექტი უკვე არსებობს', path: 'cadastralCode' }] });
      }
    }
    if (req.body.tbilisiSubdistricts !== undefined) patch.tbilisiSubdistricts = req.body.tbilisiSubdistricts;
    if (req.body.price !== undefined) patch.price = Number(req.body.price);
    if (req.body.priceCurrency !== undefined) patch.priceCurrency = req.body.priceCurrency;
    if (req.body.priceType !== undefined) patch.priceType = req.body.priceType;
    if (req.body.sqm !== undefined) patch.sqm = Number(req.body.sqm);
    if (req.body.houseSqm !== undefined) patch.houseSqm = Number(req.body.houseSqm);
    if (req.body.rooms !== undefined) patch.rooms = Number(req.body.rooms);
    if (req.body.bedrooms !== undefined) patch.bedrooms = Number(req.body.bedrooms);
    if (req.body.photos !== undefined) patch.photos = req.body.photos;
    const isDraftSave = req.body.draft === true;
    if (req.body.panoramaPhotos !== undefined) {
      const list = Array.isArray(req.body.panoramaPhotos) ? req.body.panoramaPhotos : [];
      const photoList =
        req.body.photos !== undefined
          ? req.body.photos
          : isDraftSave && existing.editDraft?.photos
            ? existing.editDraft.photos
            : existing.photos;
      patch.panoramaPhotos = list.filter(
        (u) => typeof u === 'string' && u.trim() && photoUrlInList(u, photoList)
      );
    }
    if (req.body.mainPhoto !== undefined) patch.mainPhoto = Number(req.body.mainPhoto);
    if (req.body.location !== undefined) patch.location = req.body.location;
    if (req.body.floor !== undefined) patch.floor = Number(req.body.floor);
    if (req.body.totalFloors !== undefined) patch.totalFloors = Number(req.body.totalFloors);
    if (req.body.balcony !== undefined) patch.balcony = Number(req.body.balcony);
    if (req.body.loggia !== undefined) patch.loggia = Number(req.body.loggia);
    if (req.body.bathroom !== undefined) patch.bathroom = Number(req.body.bathroom);
    if (req.body.constructionYear !== undefined) patch.constructionYear = req.body.constructionYear ? Number(req.body.constructionYear) : null;
    if (req.body.renovationYear !== undefined) patch.renovationYear = req.body.renovationYear ? Number(req.body.renovationYear) : null;

    const detailErr = validatePropertyDetailNumbers({
      floor: req.body.floor !== undefined ? req.body.floor : existing.floor,
      totalFloors: req.body.totalFloors !== undefined ? req.body.totalFloors : existing.totalFloors,
      constructionYear:
        req.body.constructionYear !== undefined ? req.body.constructionYear : existing.constructionYear,
      renovationYear: req.body.renovationYear !== undefined ? req.body.renovationYear : existing.renovationYear,
    });
    if (detailErr) return res.status(400).json({ errors: [detailErr] });

    if (req.body.amenities !== undefined) patch.amenities = req.body.amenities;
    if (req.body.contactPhone !== undefined || req.body.contactEmail !== undefined) {
      patch.contact = {
        phone: req.body.contactPhone ?? existing.contact?.phone ?? '',
        email: req.body.contactEmail ?? existing.contact?.email ?? ''
      };
    }

    let unsetShareToken = false;
    if (req.body.brokerListingMode !== undefined) {
      const mode = req.body.brokerListingMode;
      if (mode === 'sold') {
        patch.status = 'sold';
      } else {
        if (existing.status === 'sold') {
          patch.status = 'active';
        }
        if (mode === 'public') {
          patch.listingVisibility = 'public';
          unsetShareToken = true;
        } else if (mode === 'unlisted') {
          patch.listingVisibility = 'unlisted';
          if (!existing.shareToken) {
            patch.shareToken = nanoid(16);
          }
        } else if (mode === 'private') {
          patch.listingVisibility = 'private';
          unsetShareToken = true;
        }
      }
    }

    if (unsetShareToken) delete patch.shareToken;

    if (isDraftSave) {
      if (req.body.brokerListingMode !== undefined) {
        return res.status(400).json({ message: 'brokerListingMode cannot be staged' });
      }
      mergePatchIntoDraft(existing, patch);
      await existing.save();
      return res.json({ property: propertyForEdit(existing.toObject()) });
    }

    const oldLivePhotos = [...(existing.photos || [])];
    const draftPhotos = existing.editDraft?.photos ? [...existing.editDraft.photos] : [];

    // If any user-facing text changed, drop the cached translations so they are rebuilt fresh.
    const textChanged = TRANSLATABLE_FIELDS.some((f) => patch[f] !== undefined);

    const mongoUpdate = {};
    if (Object.keys(patch).length > 0) mongoUpdate.$set = patch;
    if (unsetShareToken) mongoUpdate.$unset = { shareToken: '' };
    mongoUpdate.$unset = { ...(mongoUpdate.$unset || {}), editDraft: '' };
    if (textChanged) mongoUpdate.$unset = { ...mongoUpdate.$unset, translations: '' };

    if (Object.keys(mongoUpdate.$set || {}).length === 0 && !mongoUpdate.$unset?.editDraft) {
      const fresh = await Property.findById(req.params.id).lean();
      delete fresh.editDraft;
      return res.json({ property: fresh });
    }

    const updated = await Property.findByIdAndUpdate(req.params.id, mongoUpdate, { new: true }).lean();
    delete updated.editDraft;

    if (textChanged) scheduleTranslations(updated._id);

    // პასუხი ჯერ — Cloudinary cleanup არ უნდა ბლოკავდეს კლიენტს (Render timeout).
    res.json({ property: updated });

    const publishedPhotos = updated.photos || [];
    const publishedKeys = new Set(publishedPhotos.map((u) => normalizePhotoUrl(u)));
    const photoCandidates = [...oldLivePhotos, ...draftPhotos];
    const seen = new Set();
    void (async () => {
      try {
        for (const url of photoCandidates) {
          const key = normalizePhotoUrl(url);
          if (seen.has(key)) continue;
          seen.add(key);
          if (!publishedKeys.has(key)) {
            await deleteCloudinaryImage(url);
          }
        }
      } catch (err) {
        console.error('Property photo cleanup failed:', err?.message || err);
      }
    })();
  }
);

// DELETE (protected; only owner)
router.delete('/:id', requireAuth, async (req, res) => {
  const existing = await Property.findById(req.params.id);
  if (!existing) return res.status(404).json({ message: 'Not found' });
  if (existing.deletedAt) return res.status(404).json({ message: 'Not found' });
  if (!(await userCanManageProperty(req.user.id, existing))) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  await softDeletePropertyDoc(existing, req.user.id);
  try {
    await AdminAuditLog.create({
      adminId: req.user.id,
      action: 'property.deleted_by_owner',
      targetType: 'property',
      targetId: String(existing._id),
      meta: { ownerUserId: String(existing.userId) },
    });
  } catch {
    /* audit failure should not block delete */
  }
  res.json({ ok: true });
});

// Translate + cache for a property (used by UI language switching for user content)
router.post('/:id/translate', requireAuth, async (req, res) => {
  const { lang } = req.body || {};
  const supported = ['en', 'ru', 'tr', 'az'];
  if (!supported.includes(lang)) return res.status(400).json({ message: 'Unsupported lang' });

  const property = await Property.findById(req.params.id);
  if (!property) return res.status(404).json({ message: 'Not found' });
  if (property.userId.toString() !== req.user.id) return res.status(403).json({ message: 'Forbidden' });

  const title = await translateText(property.title, lang);
  const desc = await translateText(property.desc, lang);

  property.translations = property.translations || new Map();
  property.translations.set(lang, { title, desc });
  await property.save();

  res.json({ ok: true });
});

export default router;
