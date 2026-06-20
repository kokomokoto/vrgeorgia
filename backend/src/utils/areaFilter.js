/**
 * ფართობის ფილტრი — sqm და houseSqm (ბარათზე რაც ჩანს).
 * max: ორივე არანულოვანი ველი max-ზე ქვემოთ უნდა იყოს.
 * min: მინიმუმ ერთი ველი min-ზე მეტი ან ტოლი.
 */
export function applySqmRangeFilter(filter, { minSqm, maxSqm }) {
  if (!minSqm && !maxSqm) return;

  const parts = [];

  if (maxSqm) {
    const max = Number(maxSqm);
    parts.push({
      $and: [
        {
          $or: [{ $lte: [{ $ifNull: ['$sqm', 0] }, 0] }, { $lte: ['$sqm', max] }],
        },
        {
          $or: [{ $lte: [{ $ifNull: ['$houseSqm', 0] }, 0] }, { $lte: ['$houseSqm', max] }],
        },
        {
          $or: [{ $gt: [{ $ifNull: ['$sqm', 0] }, 0] }, { $gt: [{ $ifNull: ['$houseSqm', 0] }, 0] }],
        },
      ],
    });
  }

  if (minSqm) {
    const min = Number(minSqm);
    parts.push({
      $or: [
        { $and: [{ $gt: [{ $ifNull: ['$sqm', 0] }, 0] }, { $gte: ['$sqm', min] }] },
        { $and: [{ $gt: [{ $ifNull: ['$houseSqm', 0] }, 0] }, { $gte: ['$houseSqm', min] }] },
      ],
    });
  }

  const expr = parts.length === 1 ? parts[0] : { $and: parts };

  if (filter.$expr) {
    filter.$expr = { $and: [filter.$expr, expr] };
  } else {
    filter.$expr = expr;
  }
}
