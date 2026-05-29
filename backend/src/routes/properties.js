import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { nanoid } from 'nanoid';

import { Property } from '../models/Property.js';
import { User } from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';
import { translateText } from '../services/translate.js';
import { uploadPropertyPhotosMiddleware, deleteCloudinaryImage } from '../services/cloudinary.js';
import { uploadPropertyPhotosFromFiles } from '../services/photoUpload.js';
import { getJWTSecret } from '../config/jwt.js';
import { normalizeTourLink } from '../utils/tourLink.js';

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

function pickLanguage(req) {
  const raw = (req.query.lang || req.headers['accept-language'] || 'ka').toString();
  const lang = raw.split(',')[0].trim().toLowerCase();
  const supported = ['ka', 'en', 'ru', 'tr', 'az'];
  return supported.includes(lang) ? lang : 'ka';
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

function applyTranslation(property, lang) {
  if (lang === 'ka') return property;
  const t = property.translations?.get(lang);
  if (!t) return property;
  return { ...property, title: t.title ?? property.title, desc: t.desc ?? property.desc };
}

/** საჯაროდ არ ჩანს საკადასტრო, თუ მონიშნულია დამალვა */
function stripHiddenCadastral(p) {
  if (!p?.cadastralHidden) return p;
  const { cadastralCode, cadastralHidden, ...rest } = p;
  return rest;
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
    body('sqm').optional().isNumeric().withMessage('ფართობი უნდა იყოს რიცხვი'),
    body('rooms').optional().isNumeric().withMessage('ოთახების რაოდენობა უნდა იყოს რიცხვი'),
    body('bedrooms').optional().isNumeric().withMessage('საძინებლების რაოდენობა უნდა იყოს რიცხვი'),
    body('buildingProject').optional().isString().trim(),
    body('renovationStatus').optional().isString().trim(),
    body('priceCurrency').optional().isIn(['USD', 'GEL']).withMessage('ვალუტა უნდა იყოს USD ან GEL'),
    body('priceType').optional().isIn(['total', 'per_sqm']).withMessage('ფასის ტიპი უნდა იყოს total ან per_sqm'),
    body('threeDLink').optional().isString().trim().isLength({ max: 1000 }),
    body('exteriorLink').optional().isString().trim().isLength({ max: 1000 }),
    body('interiorLink').optional().isString().trim().isLength({ max: 1000 }),
    body('tourLink').optional().isString().trim().isLength({ max: 2000 }),
    body('contactPhone').optional().isString().trim().isLength({ max: 50 }),
    body('contactEmail').optional({ values: 'falsy' }).isEmail().withMessage('გთხოვთ შეიყვანოთ სწორი ელ-ფოსტა (მაგ: example@mail.ru)').normalizeEmail(),
    body('cadastralCode').optional().isString().trim(),
    body('privateNotes').optional().isString().trim().isLength({ max: 5000 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    // საკადასტრო კოდის უნიკალურობის შემოწმება (თუ მითითებულია)
    if (req.body.cadastralCode && req.body.cadastralCode.trim()) {
      const existingByCadastral = await Property.findOne({ cadastralCode: req.body.cadastralCode.trim() });
      if (existingByCadastral) {
        return res.status(400).json({ errors: [{ msg: 'ამ საკადასტრო კოდით ობიექტი უკვე არსებობს', path: 'cadastralCode' }] });
      }
    }

    const cadastralHidden =
      req.body.cadastralHidden === true ||
      req.body.cadastralHidden === 'true';

    let photos = [];
    let panoramaPhotos = [];
    try {
      const uploaded = await uploadPropertyPhotosFromFiles(req.files || []);
      photos = uploaded.urls.slice(0, 30);
      let panoramaFlags = [];
      try {
        panoramaFlags = req.body.panoramaFlags ? JSON.parse(req.body.panoramaFlags) : [];
        if (!Array.isArray(panoramaFlags)) panoramaFlags = [];
      } catch {
        panoramaFlags = [];
      }
      panoramaPhotos = photos.filter((_, i) => Boolean(panoramaFlags[i]));
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

    try {
      const property = await Property.create({
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
        renovationStatus: req.body.renovationStatus || '',
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
        mediaLinks,
        status: 'pending',
        contact: {
          phone: req.body.contactPhone || '',
          email: req.body.contactEmail || ''
        },
        userId: req.user.id,
        privateNotes: req.body.privateNotes || ''
      });

      res.status(201).json({ property });
    } catch (err) {
      console.error('Property.create failed:', err);
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

// GET user's own properties (for profile page)
router.get(
  '/user/my',
  requireAuth,
  async (req, res) => {
    const properties = await Property.find({ userId: req.user.id }).sort({ createdAt: -1 }).lean();
    res.json({ properties });
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
    query('priceCurrency').optional({ values: 'falsy' }).isIn(['USD', 'GEL']),
    query('priceType').optional({ values: 'falsy' }).isIn(['total', 'per_sqm']),
    query('sort').optional({ values: 'falsy' }).isString(),
    query('propertyId').optional({ values: 'falsy' }).isString().trim()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const lang = pickLanguage(req);

    // საჯარო სია: სტატუსი + listingVisibility (არ ჩანს private/unlisted/gsold)
    const filter = {
      $and: [{ ...PUBLIC_STATUS_OR }, { ...PUBLIC_LISTING_OR }],
    };

    // ტექსტური ძიება - ეძებს ყველა ველში
    if (req.query.q) {
      const q = req.query.q.trim();
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = { $regex: escaped, $options: 'i' };
      const textOr = [
        { title: regex },
        { desc: regex },
        { city: regex },
        { region: regex },
        { tbilisiDistrict: regex },
        { tbilisiSubdistricts: regex },
        {
          $and: [
            { cadastralCode: regex },
            { cadastralHidden: { $ne: true } },
          ],
        },
        { type: regex },
        { dealType: regex },
        { buildingProject: regex },
        { renovationStatus: regex },
        { 'contact.phone': regex },
        { 'contact.email': regex },
        { privateNotes: regex },
      ];
      // რიცხვითი ძიება (ID, ფასი, ფართობი, ოთახები)
      const num = Number(q);
      if (!isNaN(num) && num > 0) {
        textOr.push(
          { numericId: num },
          { price: num },
          { sqm: num },
          { rooms: num },
          { bedrooms: num }
        );
      }
      filter.$and.push({ $or: textOr });
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

    // ვალუტა: USD არის default, ამიტომ ველის არარსებობაც USD-ად ითვლება
    if (req.query.priceCurrency) {
      if (req.query.priceCurrency === 'USD') {
        filter.$and = filter.$and || [];
        filter.$and.push({ $or: [{ priceCurrency: 'USD' }, { priceCurrency: { $exists: false } }] });
      } else {
        filter.priceCurrency = req.query.priceCurrency;
      }
    }

    // ფასის ფილტრაცია priceType-ის გათვალისწინებით
    // თუ მომხმარებელი ირჩევს "კვ.მ-ზე", სისტემა ითვლის price/sqm და ადარებს
    // თუ "სრული" ან არაფერი - პირდაპირ price-ს ადარებს
    const filterPriceType = req.query.priceType || '';
    
    if (filterPriceType === 'per_sqm' && (req.query.minPrice || req.query.maxPrice)) {
      // კვ.მ-ზე ფილტრაცია: გამოვთვალოთ ეფექტური ფასი კვადრატულზე
      // - სრული ფასის ობიექტები: price / sqm
      // - კვ.მ-ზე ფასის ობიექტები: price პირდაპირ
      filter.$and = filter.$and || [];
      filter.$and.push({ sqm: { $gt: 0 } }); // sqm > 0 რომ გაყოფა შესაძლებელი იყოს
      
      const effectivePricePerSqm = {
        $cond: [
          { $eq: ['$priceType', 'per_sqm'] },
          '$price',
          { $divide: ['$price', '$sqm'] }
        ]
      };
      
      const priceConditions = [];
      if (req.query.minPrice) {
        priceConditions.push({ $gte: [effectivePricePerSqm, Number(req.query.minPrice)] });
      }
      if (req.query.maxPrice) {
        priceConditions.push({ $lte: [effectivePricePerSqm, Number(req.query.maxPrice)] });
      }
      
      if (priceConditions.length === 1) {
        filter.$expr = priceConditions[0];
      } else {
        filter.$expr = { $and: priceConditions };
      }
    } else if (req.query.minPrice || req.query.maxPrice) {
      // სრული ფასის ფილტრაცია (default): 
      // - კვ.მ-ზე ფასის ობიექტები: price * sqm
      // - სრული ფასის ობიექტები: price პირდაპირ
      if (filterPriceType === 'total') {
        const effectiveTotalPrice = {
          $cond: [
            { $eq: ['$priceType', 'per_sqm'] },
            { $multiply: ['$price', { $ifNull: ['$sqm', 1] }] },
            '$price'
          ]
        };
        
        const priceConditions = [];
        if (req.query.minPrice) {
          priceConditions.push({ $gte: [effectiveTotalPrice, Number(req.query.minPrice)] });
        }
        if (req.query.maxPrice) {
          priceConditions.push({ $lte: [effectiveTotalPrice, Number(req.query.maxPrice)] });
        }
        
        if (priceConditions.length === 1) {
          filter.$expr = priceConditions[0];
        } else {
          filter.$expr = { $and: priceConditions };
        }
      } else {
        // priceType არ არის მითითებული — პირდაპირი შედარება
        filter.price = {};
        if (req.query.minPrice) filter.price.$gte = Number(req.query.minPrice);
        if (req.query.maxPrice) filter.price.$lte = Number(req.query.maxPrice);
      }
    }

    if (req.query.minSqm || req.query.maxSqm) {
      filter.sqm = {};
      if (req.query.minSqm) filter.sqm.$gte = Number(req.query.minSqm);
      if (req.query.maxSqm) filter.sqm.$lte = Number(req.query.maxSqm);
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

    const properties = await Property.find(filter).sort(finalSort).limit(200).lean();

    const translated = properties.map((p) => {
      const { privateNotes, shareToken, ...safe } = applyTranslation(p, lang);
      return stripHiddenCadastral(safe);
    });
    res.json({ properties: translated });
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
      $and: [{ ...PUBLIC_STATUS_OR }, { ...PUBLIC_LISTING_OR }],
    })
      .sort({ createdAt: -1 })
      .lean();

    const translated = properties.map((p) => {
      const { privateNotes, shareToken, ...safe } = applyTranslation(p, lang);
      return stripHiddenCadastral(safe);
    });
    res.json({ properties: translated });
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

    // privateNotes მხოლოდ მფლობელისთვის ხილული
    const token = req.headers.authorization?.split(' ')[1];
    let requestUserId = null;
    if (token) {
      try {
        const jwt = await import('jsonwebtoken');
        const decoded = jwt.default.verify(token, getJWTSecret());
        requestUserId = decoded.sub;
      } catch (_) {}
    }
    const ownerIdStr = property.userId?._id?.toString() || property.userId?.toString();
    const isOwner = !!requestUserId && requestUserId === ownerIdStr;
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
    if (existing.userId.toString() !== req.user.id) return res.status(403).json({ message: 'Forbidden' });

    let uploaded = [];
    try {
      const result = await uploadPropertyPhotosFromFiles(req.files || []);
      uploaded = result.urls;
    } catch (uploadErr) {
      return res.status(400).json({ message: uploadErr.message || 'ფოტოს ატვირთვა ვერ მოხერხდა' });
    }
    if (uploaded.length === 0) return res.status(400).json({ message: 'ფოტო არ აიტვირთა' });

    let panoramaFlags = [];
    try {
      panoramaFlags = req.body.panoramaFlags ? JSON.parse(req.body.panoramaFlags) : [];
      if (!Array.isArray(panoramaFlags)) panoramaFlags = [];
    } catch {
      panoramaFlags = [];
    }
    const newPanoramas = uploaded.filter((_, i) => Boolean(panoramaFlags[i]));
    const next = [...(existing.photos || []), ...uploaded].slice(0, 30);
    const nextPanorama = [...(existing.panoramaPhotos || []), ...newPanoramas].filter((u) => next.includes(u));
    existing.photos = next;
    existing.panoramaPhotos = [...new Set(nextPanorama)];
    await existing.save();

    res.json({ photos: existing.photos, panoramaPhotos: existing.panoramaPhotos });
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
    body('sqm').optional().isNumeric(),
    body('rooms').optional().isNumeric(),
    body('bedrooms').optional().isNumeric(),
    body('threeDLink').optional().isString().trim().isLength({ max: 1000 }),
    body('exteriorLink').optional().isString().trim().isLength({ max: 1000 }),
    body('interiorLink').optional().isString().trim().isLength({ max: 1000 }),
    body('tourLink').optional().isString().trim().isLength({ max: 2000 }),
    body('contactPhone').optional().isString().trim().isLength({ max: 50 }),
    body('contactEmail').optional({ values: 'falsy' }).isEmail().normalizeEmail(),
    body('photos').optional().isArray(),
    body('panoramaPhotos').optional().isArray(),
    body('mainPhoto').optional().isInt({ min: 0 }),
    body('cadastralHidden').optional().isBoolean(),
    body('brokerListingMode').optional().isIn(['public', 'unlisted', 'private', 'sold'])
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const existing = await Property.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Not found' });
    if (existing.userId.toString() !== req.user.id) {
      // ადმინს ნებისმიერი ობიექტის რედაქტირება შეუძლია
      const me = await User.findById(req.user.id).select('role');
      if (!me || me.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    }

    const patch = {};
    for (const k of ['title', 'desc', 'type', 'dealType', 'city', 'street', 'region', 'tbilisiDistrict', 'threeDLink', 'exteriorLink', 'interiorLink', 'tourLink', 'cadastralCode', 'privateNotes', 'buildingProject', 'renovationStatus', 'cadastralHidden']) {
      if (req.body[k] !== undefined) patch[k] = req.body[k];
    }
    if (patch.tourLink !== undefined) {
      patch.tourLink = normalizeTourLink(patch.tourLink);
    }
    // საკადასტრო კოდის უნიკალურობის შემოწმება რედაქტირებისას (თუ მითითებულია)
    if (req.body.cadastralCode && req.body.cadastralCode.trim()) {
      const dup = await Property.findOne({ cadastralCode: req.body.cadastralCode.trim(), _id: { $ne: existing._id } });
      if (dup) {
        return res.status(400).json({ errors: [{ msg: 'ამ საკადასტრო კოდით ობიექტი უკვე არსებობს', path: 'cadastralCode' }] });
      }
    }
    if (req.body.tbilisiSubdistricts !== undefined) patch.tbilisiSubdistricts = req.body.tbilisiSubdistricts;
    if (req.body.price !== undefined) patch.price = Number(req.body.price);
    if (req.body.priceCurrency !== undefined) patch.priceCurrency = req.body.priceCurrency;
    if (req.body.priceType !== undefined) patch.priceType = req.body.priceType;
    if (req.body.sqm !== undefined) patch.sqm = Number(req.body.sqm);
    if (req.body.rooms !== undefined) patch.rooms = Number(req.body.rooms);
    if (req.body.bedrooms !== undefined) patch.bedrooms = Number(req.body.bedrooms);
    if (req.body.photos !== undefined) patch.photos = req.body.photos;
    if (req.body.panoramaPhotos !== undefined) {
      const list = Array.isArray(req.body.panoramaPhotos) ? req.body.panoramaPhotos : [];
      const photoList = req.body.photos !== undefined ? req.body.photos : existing.photos;
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
    const mongoUpdate = {};
    if (Object.keys(patch).length > 0) mongoUpdate.$set = patch;
    if (unsetShareToken) mongoUpdate.$unset = { shareToken: '' };

    if (Object.keys(mongoUpdate).length === 0) {
      const fresh = await Property.findById(req.params.id).lean();
      return res.json({ property: fresh });
    }

    const updated = await Property.findByIdAndUpdate(req.params.id, mongoUpdate, { new: true }).lean();
    res.json({ property: updated });
  }
);

// DELETE (protected; only owner)
router.delete('/:id', requireAuth, async (req, res) => {
  const existing = await Property.findById(req.params.id);
  if (!existing) return res.status(404).json({ message: 'Not found' });
  if (existing.userId.toString() !== req.user.id) {
    // ადმინს ნებისმიერი ობიექტის წაშლა შეუძლია
    const me = await User.findById(req.user.id).select('role');
    if (!me || me.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  }

  await Property.deleteOne({ _id: existing._id });
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
