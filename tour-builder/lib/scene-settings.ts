import type { Viewer } from "@photo-sphere-viewer/core";
import type { PanKeyframe, Scene } from "./types";

export const SCENE_DEFAULTS = {
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
} as const;

/** panning სიჩქარის დიაპაზონი (rpm) — slider 0..100 */
export const PAN_SPEED_MIN_RPM = 0.2;
export const PAN_SPEED_MAX_RPM = 5;

export function hasCustomDefaultView(scene: Scene): boolean {
  return scene.default_view_custom === 1;
}

export function normalizeScene(raw: Scene): Scene {
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

/** panning წერტილების წაკითხვა JSON სტრიქონიდან — უსაფრთხო parse */
export function parsePanKeyframes(scene: Scene): PanKeyframe[] {
  const raw = scene.pan_keyframes_json;
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter(
        (k) =>
          k &&
          typeof k.yaw === "number" &&
          typeof k.pitch === "number" &&
          typeof k.zoom === "number"
      )
      .map((k) => ({ yaw: k.yaw, pitch: k.pitch, zoom: k.zoom }));
  } catch {
    return [];
  }
}

export function serializePanKeyframes(keyframes: PanKeyframe[]): string {
  return JSON.stringify(
    keyframes.map((k) => ({ yaw: k.yaw, pitch: k.pitch, zoom: k.zoom }))
  );
}

/** panning ჩართულია და გაშვებადია (აქვს მინიმუმ 1 წერტილი) */
export function isPanningActive(scene: Scene): boolean {
  return (scene.pan_enabled ?? 0) === 1 && parsePanKeyframes(scene).length > 0;
}

/** slider 0..100 → rpm */
export function panSliderToRpm(slider: number): number {
  const t = Math.min(100, Math.max(0, slider)) / 100;
  return PAN_SPEED_MIN_RPM + t * (PAN_SPEED_MAX_RPM - PAN_SPEED_MIN_RPM);
}

/** rpm → slider 0..100 */
export function panRpmToSlider(rpm: number): number {
  const t =
    (rpm - PAN_SPEED_MIN_RPM) / (PAN_SPEED_MAX_RPM - PAN_SPEED_MIN_RPM);
  return Math.min(100, Math.max(0, Math.round(t * 100)));
}

export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function radToDeg(rad: number): number {
  return Math.round((rad * 180) / Math.PI);
}

/** Photo Sphere Viewer limits from scene settings */
export function getViewerLimits(scene: Scene) {
  const s = normalizeScene(scene);
  return {
    minFov: s.min_fov!,
    maxFov: s.max_fov!,
    latitudeRange: [degToRad(s.min_pitch!), degToRad(s.max_pitch!)] as [
      number,
      number,
    ],
    longitudeRange: [degToRad(s.min_yaw!), degToRad(s.max_yaw!)] as [
      number,
      number,
    ],
  };
}

/** Autorotate rpm shown on slider 0–100 → actual 0–0.25 rpm */
export function sliderToAutorotate(slider: number): number {
  return (slider / 100) * 0.25;
}

export function autorotateToSlider(rpm: number): number {
  return Math.min(100, Math.round((rpm / 0.25) * 100));
}

/** Apply saved default view (opening frame). */
export function applyDefaultView(viewer: Viewer, scene: Scene) {
  viewer.rotate({ yaw: scene.default_yaw, pitch: scene.default_pitch });
  viewer.zoom(scene.default_zoom);
}
