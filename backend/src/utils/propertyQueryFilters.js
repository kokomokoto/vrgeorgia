import { buildPropertyTextSearchOr } from './propertySearch.js';
import { applyPriceRangeFilter } from './priceFilter.js';
import { applySqmRangeFilter } from './areaFilter.js';
import { getUsdToGelRate } from './currency.js';

export const PUBLIC_STATUS_OR = {
  $or: [
    { status: 'active' },
    { status: 'pending' },
    { status: { $exists: false } },
  ],
};

export const PUBLIC_LISTING_OR = {
  $or: [{ listingVisibility: { $exists: false } }, { listingVisibility: 'public' }],
};

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
  } catch {
    // ignore parse error
  }
}

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

export function parsePropertySortOption(sortRaw) {
  let sortOption = {};
  if (sortRaw) {
    const parts = String(sortRaw).split(',').map((s) => s.trim());
    for (const part of parts) {
      if (SORT_MAP[part]) {
        Object.assign(sortOption, SORT_MAP[part]);
      }
    }
  }
  if (Object.keys(sortOption).length === 0) {
    sortOption = { createdAt: -1 };
  }
  return { pinned: -1, pinnedAt: -1, ...sortOption };
}

/** Apply list/search
params to a Mongo filter (expects $and array when combining with public filters). */
export async function applyPropertyQueryFilters(filter, query) {
  if (query.q) {
    const textOr = await buildPropertyTextSearchOr(query.q);
    if (textOr.length) {
      filter.$and = filter.$and || [];
      filter.$and.push({ $or: textOr });
    }
  }

  if (query.type) {
    try {
      const types = JSON.parse(query.type);
      if (Array.isArray(types) && types.length > 0) {
        filter.type = { $in: types };
      }
    } catch {
      filter.type = query.type;
    }
  }

  if (query.dealType) {
    try {
      const dealTypes = JSON.parse(query.dealType);
      if (Array.isArray(dealTypes) && dealTypes.length > 0) {
        filter.dealType = { $in: dealTypes };
      }
    } catch {
      filter.dealType = query.dealType;
    }
  }

  if (query.city) filter.city = query.city;
  if (query.region) filter.region = query.region;

  if (query.tbilisiDistrict) {
    filter.tbilisiDistrict = query.tbilisiDistrict;
  }
  if (query.tbilisiSubdistricts) {
    try {
      const subdistricts = JSON.parse(query.tbilisiSubdistricts);
      if (Array.isArray(subdistricts) && subdistricts.length > 0) {
        filter.tbilisiSubdistricts = { $in: subdistricts };
      }
    } catch {
      // ignore parse error
    }
  }

  if (query.minPrice || query.maxPrice) {
    const usdToGel = await getUsdToGelRate();
    applyPriceRangeFilter(
      filter,
      {
        minPrice: query.minPrice,
        maxPrice: query.maxPrice,
        priceType: query.priceType || '',
        priceCurrency: query.priceCurrency || 'USD',
      },
      usdToGel
    );
  }

  if (query.minSqm || query.maxSqm) {
    applySqmRangeFilter(filter, {
      minSqm: query.minSqm,
      maxSqm: query.maxSqm,
    });
  }

  if (query.minConstructionYear || query.maxConstructionYear) {
    filter.constructionYear = {};
    if (query.minConstructionYear) filter.constructionYear.$gte = Number(query.minConstructionYear);
    if (query.maxConstructionYear) filter.constructionYear.$lte = Number(query.maxConstructionYear);
  }

  if (query.minRenovationYear || query.maxRenovationYear) {
    filter.renovationYear = {};
    if (query.minRenovationYear) filter.renovationYear.$gte = Number(query.minRenovationYear);
    if (query.maxRenovationYear) filter.renovationYear.$lte = Number(query.maxRenovationYear);
  }

  if (query.rooms) {
    applyRoomLikeInFilter(filter, 'rooms', query.rooms);
  } else if (query.minRooms || query.maxRooms) {
    filter.rooms = {};
    if (query.minRooms) filter.rooms.$gte = Number(query.minRooms);
    if (query.maxRooms) filter.rooms.$lte = Number(query.maxRooms);
  }

  if (query.bedrooms) {
    applyRoomLikeInFilter(filter, 'bedrooms', query.bedrooms);
  } else if (query.minBedrooms || query.maxBedrooms) {
    filter.bedrooms = {};
    if (query.minBedrooms) filter.bedrooms.$gte = Number(query.minBedrooms);
    if (query.maxBedrooms) filter.bedrooms.$lte = Number(query.maxBedrooms);
  }

  if (query.balconies) {
    try {
      const balcon = JSON.parse(query.balconies);
      if (Array.isArray(balcon) && balcon.length > 0) {
        const nums = balcon.map((x) => Number(x)).filter((n) => Number.isFinite(n) && n >= 0);
        if (nums.length > 0) filter.balcony = { $in: nums };
      }
    } catch {
      // ignore parse error
    }
  }

  if (query.has3d === 'true') {
    filter.$and = filter.$and || [];
    filter.$and.push({
      $or: [
        { threeDLink: { $ne: '' } },
        { exteriorLink: { $ne: '' } },
        { interiorLink: { $ne: '' } },
        { tourLink: { $ne: '' } },
      ],
    });
  }
  if (query.has3d === 'false') {
    filter.threeDLink = '';
    filter.exteriorLink = '';
    filter.interiorLink = '';
    filter.tourLink = '';
  }

  if (query.hasPhotos === 'true') filter.photos = { $exists: true, $ne: [] };
  if (query.hasPhotos === 'false') {
    filter.$and = filter.$and || [];
    filter.$and.push({
      $or: [{ photos: { $exists: false } }, { photos: { $size: 0 } }],
    });
  }

  if (query.amenities) {
    try {
      const amenities = JSON.parse(query.amenities);
      if (Array.isArray(amenities) && amenities.length > 0) {
        amenities.forEach((amenity) => {
          filter[`amenities.${amenity}`] = true;
        });
      }
    } catch {
      // ignore parse error
    }
  }

  if (query.buildingProject) {
    try {
      const projects = JSON.parse(query.buildingProject);
      if (Array.isArray(projects) && projects.length > 0) {
        filter.buildingProject = { $in: projects };
      }
    } catch {
      filter.buildingProject = query.buildingProject;
    }
  }

  if (query.renovationStatus) {
    try {
      const statuses = JSON.parse(query.renovationStatus);
      if (Array.isArray(statuses) && statuses.length > 0) {
        filter.renovationStatus = { $in: statuses };
      }
    } catch {
      filter.renovationStatus = query.renovationStatus;
    }
  }

  if (query.buildingStatus) {
    try {
      const statuses = JSON.parse(query.buildingStatus);
      if (Array.isArray(statuses) && statuses.length > 0) {
        filter.buildingStatus = { $in: statuses };
      }
    } catch {
      filter.buildingStatus = query.buildingStatus;
    }
  }

  if (query.landStatus) {
    try {
      const statuses = JSON.parse(query.landStatus);
      if (Array.isArray(statuses) && statuses.length > 0) {
        filter.landStatus = { $in: statuses };
      }
    } catch {
      filter.landStatus = query.landStatus;
    }
  }

  if (query.propertyId) {
    const numId = Number(query.propertyId);
    if (!Number.isNaN(numId) && numId > 0) {
      filter.numericId = numId;
    }
  }
}

/**
 * Admin / broker listing visibility filter.
 * @param {Record<string, unknown>} filter
 * @param {string} mode public | unlisted | private | sold | ''
 */
export function applyListingVisibilityFilter(filter, mode) {
  const m = String(mode || '').trim();
  if (!m || m === 'all') return;

  if (m === 'sold') {
    filter.status = 'sold';
    return;
  }

  if (m === 'public') {
    filter.$and = filter.$and || [];
    filter.$and.push({
      $or: [{ listingVisibility: { $exists: false } }, { listingVisibility: 'public' }],
    });
    return;
  }

  if (m === 'unlisted' || m === 'private') {
    filter.listingVisibility = m;
  }
}
