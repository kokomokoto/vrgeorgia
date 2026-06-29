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
  ]);

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
