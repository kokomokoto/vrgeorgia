import { SearchEvent } from '../models/SearchEvent.js';

function arrayFieldStats(match, field, limit = 15) {
  return SearchEvent.aggregate([
    { $match: { ...match, [field]: { $exists: true, $not: { $size: 0 } } } },
    { $unwind: `$${field}` },
    { $group: { _id: `$${field}`, count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: limit },
  ]);
}

function scalarFieldStats(match, field, limit = 15) {
  return SearchEvent.aggregate([
    { $match: { ...match, [field]: { $nin: ['', null] } } },
    { $group: { _id: `$${field}`, count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: limit },
  ]);
}

function parseFilterNumber(value) {
  if (value === '' || value == null) return null;
  const n = Number(String(value).replace(/[\s,]/g, ''));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function representativeFilterValue(minRaw, maxRaw) {
  const min = parseFilterNumber(minRaw);
  const max = parseFilterNumber(maxRaw);
  if (min != null && max != null) return (min + max) / 2;
  if (min != null) return min;
  if (max != null) return max;
  return null;
}

const USD_PER_GEL = 2.75;

const TOTAL_PRICE_BUCKETS = [
  { id: '0-50k', label: '$0 – $50,000', maxUsd: 50000 },
  { id: '50k-100k', label: '$50,000 – $100,000', maxUsd: 100000 },
  { id: '100k-150k', label: '$100,000 – $150,000', maxUsd: 150000 },
  { id: '150k-200k', label: '$150,000 – $200,000', maxUsd: 200000 },
  { id: '200k-300k', label: '$200,000 – $300,000', maxUsd: 300000 },
  { id: '300k-500k', label: '$300,000 – $500,000', maxUsd: 500000 },
  { id: '500k+', label: '$500,000+', maxUsd: Infinity },
];

const PER_SQM_PRICE_BUCKETS = [
  { id: '0-500', label: '$0 – $500 / მ²', maxUsd: 500 },
  { id: '500-1000', label: '$500 – $1,000 / მ²', maxUsd: 1000 },
  { id: '1000-2000', label: '$1,000 – $2,000 / მ²', maxUsd: 2000 },
  { id: '2000-3000', label: '$2,000 – $3,000 / მ²', maxUsd: 3000 },
  { id: '3000+', label: '$3,000+ / მ²', maxUsd: Infinity },
];

const SQM_BUCKETS = [
  { id: '0-30', label: '0 – 30 მ²', max: 30 },
  { id: '30-50', label: '30 – 50 მ²', max: 50 },
  { id: '50-70', label: '50 – 70 მ²', max: 70 },
  { id: '70-100', label: '70 – 100 მ²', max: 100 },
  { id: '100-150', label: '100 – 150 მ²', max: 150 },
  { id: '150-200', label: '150 – 200 მ²', max: 200 },
  { id: '200+', label: '200+ მ²', max: Infinity },
];

function bucketTotalPriceUsd(usdValue) {
  for (const bucket of TOTAL_PRICE_BUCKETS) {
    if (usdValue < bucket.maxUsd) return bucket;
  }
  return TOTAL_PRICE_BUCKETS[TOTAL_PRICE_BUCKETS.length - 1];
}

function bucketPerSqmPriceUsd(usdValue) {
  for (const bucket of PER_SQM_PRICE_BUCKETS) {
    if (usdValue < bucket.maxUsd) return bucket;
  }
  return PER_SQM_PRICE_BUCKETS[PER_SQM_PRICE_BUCKETS.length - 1];
}

function bucketSqm(sqmValue) {
  for (const bucket of SQM_BUCKETS) {
    if (sqmValue < bucket.max) return bucket;
  }
  return SQM_BUCKETS[SQM_BUCKETS.length - 1];
}

function countIntoBuckets(docs, getBucket) {
  const counts = new Map();
  for (const doc of docs) {
    const bucket = getBucket(doc);
    if (!bucket) continue;
    counts.set(bucket.id, (counts.get(bucket.id) || 0) + 1);
  }
  return counts;
}

function bucketsToStats(counts, bucketDefs) {
  return bucketDefs
    .map((b) => ({ _id: b.label, count: counts.get(b.id) || 0 }))
    .filter((row) => row.count > 0);
}

async function priceScaleStats(match) {
  const docs = await SearchEvent.find({
    ...match,
    $or: [{ minPrice: { $nin: ['', null] } }, { maxPrice: { $nin: ['', null] } }],
  })
    .select('minPrice maxPrice priceCurrency priceType')
    .lean();

  const totalCounts = new Map();
  const perSqmCounts = new Map();

  for (const doc of docs) {
    const rep = representativeFilterValue(doc.minPrice, doc.maxPrice);
    if (rep == null) continue;
    const currency = doc.priceCurrency === 'GEL' ? 'GEL' : 'USD';
    const usd = currency === 'GEL' ? rep / USD_PER_GEL : rep;
    const priceType = doc.priceType === 'per_sqm' ? 'per_sqm' : 'total';

    if (priceType === 'per_sqm') {
      const bucket = bucketPerSqmPriceUsd(usd);
      perSqmCounts.set(bucket.id, (perSqmCounts.get(bucket.id) || 0) + 1);
    } else {
      const bucket = bucketTotalPriceUsd(usd);
      totalCounts.set(bucket.id, (totalCounts.get(bucket.id) || 0) + 1);
    }
  }

  return {
    priceScaleStats: bucketsToStats(totalCounts, TOTAL_PRICE_BUCKETS),
    pricePerSqmScaleStats: bucketsToStats(perSqmCounts, PER_SQM_PRICE_BUCKETS),
  };
}

async function sqmScaleStats(match) {
  const docs = await SearchEvent.find({
    ...match,
    $or: [{ minSqm: { $nin: ['', null] } }, { maxSqm: { $nin: ['', null] } }],
  })
    .select('minSqm maxSqm')
    .lean();

  const counts = countIntoBuckets(docs, (doc) => {
    const rep = representativeFilterValue(doc.minSqm, doc.maxSqm);
    if (rep == null) return null;
    return bucketSqm(rep);
  });

  return bucketsToStats(counts, SQM_BUCKETS);
}

export async function getSearchAnalyticsStats(matchStage) {
  const [
    totalSearches,
    uniqueSearchers,
    sourceStats,
    dealTypeStats,
    typeStats,
    searchCityStats,
    regionStats,
    textQueryStats,
    roomsStats,
    bedroomsStats,
    amenitiesStats,
    tbilisiDistrictStats,
    tbilisiSubdistrictStats,
    buildingProjectStats,
    renovationStatusStats,
    balconiesStats,
    dailySearches,
    has3dCount,
    hasPhotosCount,
    priceFilterCount,
    sqmFilterCount,
    constructionYearFilterCount,
    renovationYearFilterCount,
    propertyIdSearchCount,
    priceScaleData,
    sqmScaleStatsResult,
  ] = await Promise.all([
    SearchEvent.countDocuments(matchStage),
    SearchEvent.distinct('sessionId', matchStage).then((s) => s.filter(Boolean).length),
    scalarFieldStats(matchStage, 'source', 10),
    arrayFieldStats(matchStage, 'dealTypes', 10),
    arrayFieldStats(matchStage, 'types', 15),
    scalarFieldStats(matchStage, 'city', 20),
    scalarFieldStats(matchStage, 'region', 15),
    scalarFieldStats(matchStage, 'q', 20),
    arrayFieldStats(matchStage, 'rooms', 10),
    arrayFieldStats(matchStage, 'bedrooms', 10),
    arrayFieldStats(matchStage, 'amenities', 20),
    scalarFieldStats(matchStage, 'tbilisiDistrict', 15),
    arrayFieldStats(matchStage, 'tbilisiSubdistricts', 20),
    arrayFieldStats(matchStage, 'buildingProject', 10),
    arrayFieldStats(matchStage, 'renovationStatus', 10),
    arrayFieldStats(matchStage, 'balconies', 10),
    SearchEvent.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    SearchEvent.countDocuments({ ...matchStage, has3d: true }),
    SearchEvent.countDocuments({ ...matchStage, hasPhotos: true }),
    SearchEvent.countDocuments({
      ...matchStage,
      $or: [{ minPrice: { $nin: ['', null] } }, { maxPrice: { $nin: ['', null] } }],
    }),
    SearchEvent.countDocuments({
      ...matchStage,
      $or: [{ minSqm: { $nin: ['', null] } }, { maxSqm: { $nin: ['', null] } }],
    }),
    SearchEvent.countDocuments({
      ...matchStage,
      $or: [
        { minConstructionYear: { $nin: ['', null] } },
        { maxConstructionYear: { $nin: ['', null] } },
      ],
    }),
    SearchEvent.countDocuments({
      ...matchStage,
      $or: [
        { minRenovationYear: { $nin: ['', null] } },
        { maxRenovationYear: { $nin: ['', null] } },
      ],
    }),
    SearchEvent.countDocuments({ ...matchStage, propertyId: { $nin: ['', null] } }),
    priceScaleStats(matchStage),
    sqmScaleStats(matchStage),
  ]);

  const { priceScaleStats: priceScaleStatsRows, pricePerSqmScaleStats } = priceScaleData;

  return {
    totalSearches,
    uniqueSearchers,
    sourceStats,
    dealTypeStats,
    typeStats,
    searchCityStats,
    regionStats,
    textQueryStats,
    roomsStats,
    bedroomsStats,
    amenitiesStats,
    tbilisiDistrictStats,
    tbilisiSubdistrictStats,
    buildingProjectStats,
    renovationStatusStats,
    balconiesStats,
    dailySearches,
    priceScaleStats: priceScaleStatsRows,
    pricePerSqmScaleStats,
    sqmScaleStats: sqmScaleStatsResult,
    featureStats: {
      has3d: has3dCount,
      hasPhotos: hasPhotosCount,
      priceFilter: priceFilterCount,
      sqmFilter: sqmFilterCount,
      constructionYearFilter: constructionYearFilterCount,
      renovationYearFilter: renovationYearFilterCount,
      propertyIdSearch: propertyIdSearchCount,
    },
  };
}
