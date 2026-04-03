import express from 'express';
import { body, param, query, validationResult } from 'express-validator';

import { Property } from '../models/Property.js';
import { requireAuth } from '../middleware/auth.js';
import { translateText } from '../services/translate.js';
import { uploadPropertyPhotos, deleteCloudinaryImage } from '../services/cloudinary.js';

const router = express.Router();

const upload = uploadPropertyPhotos;

function pickLanguage(req) {
  const raw = (req.query.lang || req.headers['accept-language'] || 'ka').toString();
  const lang = raw.split(',')[0].trim().toLowerCase();
  const supported = ['ka', 'en', 'ru', 'tr', 'az'];
  return supported.includes(lang) ? lang : 'ka';
}

function applyTranslation(property, lang) {
  if (lang === 'ka') return property;
  const t = property.translations?.get(lang);
  if (!t) return property;
  return { ...property, title: t.title ?? property.title, desc: t.desc ?? property.desc };
}

// CREATE (protected) - multipart with photos
router.post(
  '/',
  requireAuth,
  upload.array('photos', 12),
  [
    body('title').isString().trim().isLength({ min: 2, max: 120 }).withMessage('სათაური უნდა იყოს 2-120 სიმბოლო'),
    body('desc').isString().trim().isLength({ min: 3, max: 5000 }).withMessage('აღწერა უნდა იყოს მინიმუმ 3 სიმბოლო'),
    body('price').isNumeric().withMessage('ფასი უნდა იყოს რიცხვი'),
    body('lat').isNumeric().withMessage('გთხოვთ აირჩიოთ ლოკაცია რუკაზე'),
    body('lng').isNumeric().withMessage('გთხოვთ აირჩიოთ ლოკაცია რუკაზე'),
    body('type').isIn(['apartment', 'house', 'commercial', 'land', 'cottage', 'hotel', 'building', 'warehouse', 'parking']).withMessage('აირჩიეთ ტიპი'),
    body('dealType').isIn(['sale', 'rent', 'mortgage', 'daily', 'under_construction']).withMessage('აირჩიეთ გარიგების ტიპი'),
    body('city').optional().isString().trim().isLength({ max: 80 }),
    body('region').optional().isString().trim().isLength({ max: 80 }),
    body('sqm').optional().isNumeric().withMessage('ფართობი უნდა იყოს რიცხვი'),
    body('rooms').optional().isNumeric().withMessage('ოთახების რაოდენობა უნდა იყოს რიცხვი'),
    body('priceCurrency').optional().isIn(['USD', 'GEL']).withMessage('ვალუტა უნდა იყოს USD ან GEL'),
    body('priceType').optional().isIn(['total', 'per_sqm']).withMessage('ფასის ტიპი უნდა იყოს total ან per_sqm'),
    body('threeDLink').optional().isString().trim().isLength({ max: 1000 }),
    body('exteriorLink').optional().isString().trim().isLength({ max: 1000 }),
    body('interiorLink').optional().isString().trim().isLength({ max: 1000 }),
    body('contactPhone').optional().isString().trim().isLength({ max: 50 }),
    body('contactEmail').optional({ values: 'falsy' }).isEmail().withMessage('გთხოვთ შეიყვანოთ სწორი ელ-ფოსტა (მაგ: example@mail.ru)').normalizeEmail(),
    body('cadastralCode').optional().isString().trim()
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

    const photos = (req.files || []).map((f) => f.path);

    const property = await Property.create({
      title: req.body.title,
      desc: req.body.desc,
      price: Number(req.body.price),
      priceCurrency: req.body.priceCurrency || 'USD',
      priceType: req.body.priceType || 'total',
      city: req.body.city || '',
      region: req.body.region || '',
      tbilisiDistrict: req.body.tbilisiDistrict || '',
      tbilisiSubdistricts: req.body.tbilisiSubdistricts ? JSON.parse(req.body.tbilisiSubdistricts) : [],
      sqm: Number(req.body.sqm) || 0,
      rooms: Number(req.body.rooms) || 0,
      roomCount: Number(req.body.roomCount) || 0,
      floor: Number(req.body.floor) || 0,
      totalFloors: Number(req.body.totalFloors) || 0,
      balcony: Number(req.body.balcony) || 0,
      loggia: Number(req.body.loggia) || 0,
      bathroom: Number(req.body.bathroom) || 0,
      cadastralCode: (req.body.cadastralCode || '').trim(),
      amenities: req.body.amenities ? JSON.parse(req.body.amenities) : {},
      location: { lat: Number(req.body.lat), lng: Number(req.body.lng) },
      type: req.body.type,
      dealType: req.body.dealType,
      photos,
      threeDLink: req.body.threeDLink || '',
      exteriorLink: req.body.exteriorLink || '',
      interiorLink: req.body.interiorLink || '',
      mediaLinks: req.body.mediaLinks ? JSON.parse(req.body.mediaLinks) : [],
      contact: {
        phone: req.body.contactPhone || '',
        email: req.body.contactEmail || ''
      },
      userId: req.user.id
    });

    res.status(201).json({ property });
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
    query('minRooms').optional({ values: 'falsy' }).isNumeric(),
    query('maxRooms').optional({ values: 'falsy' }).isNumeric(),
    query('amenities').optional({ values: 'falsy' }).isString(), // მასივი JSON ფორმატში
    query('priceCurrency').optional({ values: 'falsy' }).isIn(['USD', 'GEL']),
    query('priceType').optional({ values: 'falsy' }).isIn(['total', 'per_sqm']),
    query('sort').optional({ values: 'falsy' }).isString(),
    query('propertyId').optional({ values: 'falsy' }).isString().trim()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const lang = pickLanguage(req);

    const filter = {};

    if (req.query.q) filter.$text = { $search: req.query.q };
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

    if (req.query.minRooms || req.query.maxRooms) {
      filter.rooms = {};
      if (req.query.minRooms) filter.rooms.$gte = Number(req.query.minRooms);
      if (req.query.maxRooms) filter.rooms.$lte = Number(req.query.maxRooms);
    }

    if (req.query.has3d === 'true') {
      // 3D აქვს თუ ერთი მაინც ლინკიდანაა შევსებული
      filter.$or = filter.$or || [];
      filter.$or.push(
        { threeDLink: { $ne: '' } },
        { exteriorLink: { $ne: '' } },
        { interiorLink: { $ne: '' } }
      );
    }
    if (req.query.has3d === 'false') {
      // 3D არ აქვს თუ არცერთი ლინკი არ არის
      filter.threeDLink = '';
      filter.exteriorLink = '';
      filter.interiorLink = '';
    }

    if (req.query.hasPhotos === 'true') filter.photos = { $exists: true, $ne: [] };
    if (req.query.hasPhotos === 'false') filter.$or = [{ photos: { $exists: false } }, { photos: { $size: 0 } }];

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

    const properties = await Property.find(filter).sort(sortOption).limit(200).lean();

    const translated = properties.map((p) => applyTranslation(p, lang));
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
    const properties = await Property.find({ userId: req.params.userId })
      .sort({ createdAt: -1 })
      .lean();

    const translated = properties.map((p) => applyTranslation(p, lang));
    res.json({ properties: translated });
  }
);

// GET by id (and optionally translate)
router.get(
  '/:id',
  [param('id').isString().trim().isLength({ min: 5 })],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const lang = pickLanguage(req);

    const property = await Property.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    )
      .populate('userId', 'email name phone avatar')
      .lean();
    if (!property) return res.status(404).json({ message: 'Not found' });

    res.json({ property: applyTranslation(property, lang) });
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
    body('type').optional().isIn(['apartment', 'house', 'commercial', 'land', 'cottage', 'hotel', 'building', 'warehouse', 'parking']),
    body('dealType').optional().isIn(['sale', 'rent', 'mortgage', 'daily', 'under_construction']),
    body('city').optional().isString().trim().isLength({ max: 80 }),
    body('region').optional().isString().trim().isLength({ max: 80 }),
    body('sqm').optional().isNumeric(),
    body('rooms').optional().isNumeric(),
    body('threeDLink').optional().isString().trim().isLength({ max: 1000 }),
    body('exteriorLink').optional().isString().trim().isLength({ max: 1000 }),
    body('interiorLink').optional().isString().trim().isLength({ max: 1000 }),
    body('contactPhone').optional().isString().trim().isLength({ max: 50 }),
    body('contactEmail').optional({ values: 'falsy' }).isEmail().normalizeEmail(),
    body('photos').optional().isArray(),
    body('mainPhoto').optional().isInt({ min: 0 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const existing = await Property.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Not found' });
    if (existing.userId.toString() !== req.user.id) return res.status(403).json({ message: 'Forbidden' });

    const patch = {};
    for (const k of ['title', 'desc', 'type', 'dealType', 'city', 'region', 'tbilisiDistrict', 'threeDLink', 'exteriorLink', 'interiorLink', 'cadastralCode']) {
      if (req.body[k] !== undefined) patch[k] = req.body[k];
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
    if (req.body.photos !== undefined) patch.photos = req.body.photos;
    if (req.body.mainPhoto !== undefined) patch.mainPhoto = Number(req.body.mainPhoto);
    if (req.body.location !== undefined) patch.location = req.body.location;
    if (req.body.floor !== undefined) patch.floor = Number(req.body.floor);
    if (req.body.totalFloors !== undefined) patch.totalFloors = Number(req.body.totalFloors);
    if (req.body.balcony !== undefined) patch.balcony = Number(req.body.balcony);
    if (req.body.loggia !== undefined) patch.loggia = Number(req.body.loggia);
    if (req.body.bathroom !== undefined) patch.bathroom = Number(req.body.bathroom);
    if (req.body.amenities !== undefined) patch.amenities = req.body.amenities;
    if (req.body.contactPhone !== undefined || req.body.contactEmail !== undefined) {
      patch.contact = {
        phone: req.body.contactPhone ?? existing.contact?.phone ?? '',
        email: req.body.contactEmail ?? existing.contact?.email ?? ''
      };
    }

    const updated = await Property.findByIdAndUpdate(req.params.id, patch, { new: true }).lean();
    res.json({ property: updated });
  }
);

// DELETE (protected; only owner)
router.delete('/:id', requireAuth, async (req, res) => {
  const existing = await Property.findById(req.params.id);
  if (!existing) return res.status(404).json({ message: 'Not found' });
  if (existing.userId.toString() !== req.user.id) return res.status(403).json({ message: 'Forbidden' });

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
