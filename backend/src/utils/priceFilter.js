/** ორივე ფართობი → houseSqm; მხოლოდ ერთი → ის (ბარათის ლოგიკას ემთხვევა) */
export function buildAreaSqmExpr() {
  return {
    $let: {
      vars: {
        sqm: { $ifNull: ['$sqm', 0] },
        houseSqm: { $ifNull: ['$houseSqm', 0] },
      },
      in: {
        $cond: [
          { $gt: ['$$houseSqm', 0] },
          '$$houseSqm',
          { $cond: [{ $gt: ['$$sqm', 0] }, '$$sqm', 0] },
        ],
      },
    },
  };
}

/** სორტისთვის: უფრო დიდი ფართობი (ნაკვეთი ან სახლი) */
export function buildSortAreaExpr() {
  return {
    $max: [{ $ifNull: ['$sqm', 0] }, { $ifNull: ['$houseSqm', 0] }],
  };
}

/**
 * სრული ფასი USD-ში (GEL→USD კურსით, per_sqm→total ფართობით).
 * UI-ის ნაჩვენები ფასთან შესადარებლად.
 */
export function buildComparableTotalPriceUsdExpr(usdToGelRate) {
  const baseExpr = buildBasePriceExpr('total');
  return buildConvertedPriceExpr(baseExpr, 'USD', usdToGelRate);
}

/** ფასის ეფექტური მნიშვნელობა (სრული ან კვ.მ-ზე) MongoDB $expr-ისთვის */
function buildBasePriceExpr(priceType) {
  const areaSqm = buildAreaSqmExpr();

  if (priceType === 'per_sqm') {
    return {
      $cond: [
        { $eq: ['$priceType', 'per_sqm'] },
        '$price',
        {
          $cond: [
            { $gt: [areaSqm, 0] },
            { $divide: ['$price', areaSqm] },
            null,
          ],
        },
      ],
    };
  }

  if (priceType === 'total') {
    return {
      $cond: [
        { $eq: ['$priceType', 'per_sqm'] },
        {
          $cond: [
            { $gt: [areaSqm, 0] },
            { $multiply: ['$price', areaSqm] },
            null,
          ],
        },
        '$price',
      ],
    };
  }

  return '$price';
}

/** native ფასი → ფილტრის ვალუტაში (USD/GEL) */
function buildConvertedPriceExpr(baseExpr, filterCurrency, usdToGelRate) {
  if (filterCurrency === 'GEL') {
    return {
      $cond: [
        { $eq: ['$priceCurrency', 'GEL'] },
        baseExpr,
        { $multiply: [baseExpr, usdToGelRate] },
      ],
    };
  }

  return {
    $cond: [
      { $eq: ['$priceCurrency', 'GEL'] },
      { $divide: [baseExpr, usdToGelRate] },
      baseExpr,
    ],
  };
}

/**
 * ფასის დიაპაზონი — ყველა ობიექტი ერთ ვალუტაში (კურსით), არა priceCurrency ველით.
 */
export function applyPriceRangeFilter(filter, { minPrice, maxPrice, priceType, priceCurrency }, usdToGelRate) {
  if (!minPrice && !maxPrice) return;

  const filterCurrency = priceCurrency === 'GEL' ? 'GEL' : 'USD';
  const effectivePriceType = priceType === 'per_sqm' ? 'per_sqm' : 'total';

  if (effectivePriceType === 'per_sqm') {
    filter.$and.push({
      $or: [{ sqm: { $gt: 0 } }, { houseSqm: { $gt: 0 } }],
    });
  }

  const baseExpr = buildBasePriceExpr(effectivePriceType);
  const convertedExpr = buildConvertedPriceExpr(baseExpr, filterCurrency, usdToGelRate);

  const priceConditions = [
    { $ne: [convertedExpr, null] },
    { $gt: [convertedExpr, 0] },
  ];
  if (minPrice) priceConditions.push({ $gte: [convertedExpr, Number(minPrice)] });
  if (maxPrice) priceConditions.push({ $lte: [convertedExpr, Number(maxPrice)] });

  const expr = { $and: priceConditions };

  if (filter.$expr) {
    filter.$expr = { $and: [filter.$expr, expr] };
  } else {
    filter.$expr = expr;
  }
}
