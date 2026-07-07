import mongoose from 'mongoose';

const tourSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    created_at: { type: String, required: true },
    updated_at: { type: String, required: true },
    published_at: { type: String, default: null },
    published_snapshot: { type: String, default: null },
    created_by_user_id: { type: String, default: null, index: true },
  },
  { collection: 'tb_tours' }
);

const sceneSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    tour_id: { type: String, required: true, index: true },
    name: { type: String, required: true },
    image_path: { type: String, default: null },
    sort_order: { type: Number, default: 0 },
    default_yaw: { type: Number, default: 0 },
    default_pitch: { type: Number, default: 0 },
    default_zoom: { type: Number, default: 50 },
    default_view_custom: { type: Number, default: 0 },
    auto_rotate_speed: { type: Number, default: 0 },
    intro_animation_ms: { type: Number, default: 0 },
    intro_from_yaw: { type: Number, default: null },
    intro_from_pitch: { type: Number, default: null },
    min_fov: { type: Number, default: 30 },
    max_fov: { type: Number, default: 90 },
    min_pitch: { type: Number, default: -45 },
    max_pitch: { type: Number, default: 45 },
    min_yaw: { type: Number, default: -180 },
    max_yaw: { type: Number, default: 180 },
    click_to_advance: { type: Number, default: 1 },
    pan_enabled: { type: Number, default: 0 },
    pan_keyframes_json: { type: String, default: null },
    pan_segment_ms: { type: Number, default: 4000 },
    pan_speed_rpm: { type: Number, default: 0.08 },
  },
  { collection: 'tb_scenes' }
);

const hotspotSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    scene_id: { type: String, required: true, index: true },
    target_scene_id: { type: String, required: true },
    yaw: { type: Number, required: true },
    pitch: { type: Number, required: true },
    label: { type: String, default: null },
  },
  { collection: 'tb_hotspots' }
);

export const TourModel =
  mongoose.models.TbTour || mongoose.model('TbTour', tourSchema);
export const SceneModel =
  mongoose.models.TbScene || mongoose.model('TbScene', sceneSchema);
export const HotspotModel =
  mongoose.models.TbHotspot || mongoose.model('TbHotspot', hotspotSchema);

export function toTour(d) {
  return {
    id: d.id,
    title: d.title,
    slug: d.slug,
    created_at: d.created_at,
    updated_at: d.updated_at,
    published_at: d.published_at ?? null,
    published_snapshot: d.published_snapshot ?? null,
    created_by_user_id: d.created_by_user_id ?? null,
  };
}

export function toSceneRaw(d) {
  return {
    id: d.id,
    tour_id: d.tour_id,
    name: d.name,
    image_path: d.image_path ?? null,
    sort_order: d.sort_order ?? 0,
    default_yaw: d.default_yaw ?? 0,
    default_pitch: d.default_pitch ?? 0,
    default_zoom: d.default_zoom ?? 50,
    default_view_custom: d.default_view_custom ?? 0,
    auto_rotate_speed: d.auto_rotate_speed ?? 0,
    intro_animation_ms: d.intro_animation_ms ?? 0,
    intro_from_yaw: d.intro_from_yaw ?? null,
    intro_from_pitch: d.intro_from_pitch ?? null,
    min_fov: d.min_fov,
    max_fov: d.max_fov,
    min_pitch: d.min_pitch,
    max_pitch: d.max_pitch,
    min_yaw: d.min_yaw,
    max_yaw: d.max_yaw,
    click_to_advance: d.click_to_advance,
    pan_enabled: d.pan_enabled,
    pan_keyframes_json: d.pan_keyframes_json ?? null,
    pan_segment_ms: d.pan_segment_ms,
    pan_speed_rpm: d.pan_speed_rpm,
  };
}

export function toHotspot(d) {
  return {
    id: d.id,
    scene_id: d.scene_id,
    target_scene_id: d.target_scene_id,
    yaw: d.yaw,
    pitch: d.pitch,
    label: d.label ?? null,
  };
}
