import { toSceneRaw } from '../../models/tourModels.js';

const SCENE_DEFAULTS = {
  min_fov: 30,
  max_fov: 90,
  min_pitch: -45,
  max_pitch: 45,
  min_yaw: -180,
  max_yaw: 180,
  click_to_advance: 1,
  default_view_custom: 0,
  pan_enabled: 0,
  pan_segment_ms: 800,
  pan_speed_rpm: 1,
};

export function normalizeScene(raw) {
  return {
    ...raw,
    default_view_custom: raw.default_view_custom ?? SCENE_DEFAULTS.default_view_custom,
    min_fov: raw.min_fov ?? SCENE_DEFAULTS.min_fov,
    max_fov: raw.max_fov ?? SCENE_DEFAULTS.max_fov,
    min_pitch: raw.min_pitch ?? SCENE_DEFAULTS.min_pitch,
    max_pitch: raw.max_pitch ?? SCENE_DEFAULTS.max_pitch,
    min_yaw: raw.min_yaw ?? SCENE_DEFAULTS.min_yaw,
    max_yaw: raw.max_yaw ?? SCENE_DEFAULTS.max_yaw,
    click_to_advance: raw.click_to_advance ?? SCENE_DEFAULTS.click_to_advance,
    pan_enabled: raw.pan_enabled ?? SCENE_DEFAULTS.pan_enabled,
    pan_keyframes_json: raw.pan_keyframes_json ?? null,
    pan_segment_ms: raw.pan_segment_ms ?? SCENE_DEFAULTS.pan_segment_ms,
    pan_speed_rpm: raw.pan_speed_rpm ?? SCENE_DEFAULTS.pan_speed_rpm,
  };
}

export function toScene(d) {
  return normalizeScene(toSceneRaw(d));
}
