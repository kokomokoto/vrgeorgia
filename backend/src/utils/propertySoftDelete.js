/** განცხადება არ არის ნაგვის ყუთში */
export const PROPERTY_NOT_DELETED = {
  $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
};

/** ნაგვის ყუთში */
export const PROPERTY_DELETED = {
  deletedAt: { $exists: true, $ne: null },
};

export function withNotDeleted(filter = {}) {
  if (!filter || Object.keys(filter).length === 0) {
    return { ...PROPERTY_NOT_DELETED };
  }
  if (filter.$and) {
    return { ...filter, $and: [...filter.$and, PROPERTY_NOT_DELETED] };
  }
  return { $and: [filter, PROPERTY_NOT_DELETED] };
}

export async function softDeletePropertyDoc(property, deletedBy) {
  property.deletedAt = new Date();
  property.deletedBy = deletedBy;
  property.pinned = false;
  property.pinnedAt = null;
  await property.save();
}

export async function softDeletePropertiesByUserId(userId, deletedBy) {
  const { Property } = await import('../models/Property.js');
  const result = await Property.updateMany(
    { userId, ...PROPERTY_NOT_DELETED },
    {
      $set: {
        deletedAt: new Date(),
        deletedBy,
        pinned: false,
        pinnedAt: null,
      },
    }
  );
  return result.modifiedCount || 0;
}

export async function restorePropertyById(id) {
  const { Property } = await import('../models/Property.js');
  const property = await Property.findOneAndUpdate(
    { _id: id, ...PROPERTY_DELETED },
    { $unset: { deletedAt: '', deletedBy: '' } },
    { new: true }
  );
  return property;
}
