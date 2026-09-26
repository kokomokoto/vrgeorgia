import mongoose from 'mongoose';

/**
 * ნაგვის ყუთიდან „სამუდამოდ“ წაშლილი განცხადება.
 * ჩანაწერი Property კოლექციიდან ქრება, სრული ასლი აქ რჩება და აღდგენა შესაძლებელია.
 */
const propertyArchiveSchema = new mongoose.Schema(
  {
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      unique: true,
      index: true,
    },
    numericId: { type: Number, index: true },
    title: { type: String, default: '' },
    type: { type: String, default: '' },
    dealType: { type: String, default: '' },
    price: { type: Number, default: 0 },
    priceCurrency: { type: String, default: 'USD' },
    city: { type: String, default: '' },
    photos: [{ type: String }],
    snapshot: { type: mongoose.Schema.Types.Mixed, required: true },
    archivedAt: { type: Date, default: Date.now, index: true },
    archivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

export const PropertyArchive = mongoose.model('PropertyArchive', propertyArchiveSchema);
