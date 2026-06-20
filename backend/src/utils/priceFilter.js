/** ფასის ეფექტური მნიშვნელობა (სრული ან კვ.მ-ზე) MongoDB $expr-ისთვის */
function buildBasePriceExpr(priceType) {
  if (priceType === 'per_sqm') {
    return {
      $cond: [
        { $eq: ['$priceType', 'per_sqm'] },
        '$price',
        { $divide: ['$price', '$sqm'] },
      ],
    };
  }

  if (priceType === 'total') {
    return {
      $cond: [
        { $eq: ['$priceType', 'per_sqm'] },
        { $multiply: ['$price', { $ifNull: ['$sqm', 1] }] },
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

  if (priceType === 'per_sqm') {
    filter.$and.push({ sqm: { $gt: 0 } });
  }

  const baseExpr = buildBasePriceExpr(priceType);
  const convertedExpr = buildConvertedPriceExpr(baseExpr, filterCurrency, usdToGelRate);

  const priceConditions = [];
  if (minPrice) priceConditions.push({ $gte: [convertedExpr, Number(minPrice)] });
  if (maxPrice) priceConditions.push({ $lte: [convertedExpr, Number(maxPrice)] });

  const expr = priceConditions.length === 1 ? priceConditions[0] : { $and: priceConditions };

  if (filter.$expr) {
    filter.$expr = { $and: [filter.$expr, expr] };
  } else {
    filter.$expr = expr;
  }
}
