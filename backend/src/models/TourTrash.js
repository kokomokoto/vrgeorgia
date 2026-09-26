import mongoose from 'mongoose';

/**
 * სრულად წაშლილი 3D ტური.
 * ცოცხალი tb_tours/tb_scenes/tb_hotspots ჩანაწერები ქრება, სრული ასლი აქ რჩება 30 დღე.
 */
const tourTrashSchema = new mongoose.Schema(
  {
    tourId: { type: String, required: true, unique: true, index: true },
    title: { type: String, default: '' },
    slug: { type: String, default: '' },
    sceneCount: { type: Number, default: 0 },
    publishedAt: { type: String, default: null },
    imagePaths: [{ type: String }],
    linkedProperties: [
      {
        propertyId: { type: String, required: true },
        tourLink: { type: String, default: '' },
      },
    ],
    snapshot: { type: mongoose.Schema.Types.Mixed, required: true },
    trashedAt: { type: Date, default: Date.now, index: true },
    trashedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { collection: 'tb_tour_trash', timestamps: true }
);

export const TourTrash =
  mongoose.models.TourTrash || mongoose.model('TourTrash', tourTrashSchema);
