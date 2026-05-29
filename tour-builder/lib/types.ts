export interface Tour {
  id: string;
  title: string;
  slug: string;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  published_snapshot: string | null;
}

export interface Scene {
  id: string;
  tour_id: string;
  name: string;
  image_path: string | null;
  sort_order: number;
  default_yaw: number;
  default_pitch: number;
  default_zoom: number;
  /** 1 after user saves default view with Set default view */
  default_view_custom: number;
  auto_rotate_speed: number;
  intro_animation_ms: number;
  intro_from_yaw: number | null;
  intro_from_pitch: number | null;
  min_fov?: number;
  max_fov?: number;
  min_pitch?: number;
  max_pitch?: number;
  min_yaw?: number;
  max_yaw?: number;
  click_to_advance?: number;
  /** panning ჩართულია (1) თუ არა (0) */
  pan_enabled?: number;
  /** panning წერტილების JSON მასივი: [{yaw,pitch,zoom}, ...] */
  pan_keyframes_json?: string | null;
  /** წერტილზე შეჩერების დრო ms (dwell) */
  pan_segment_ms?: number;
  /** კადრის მოძრაობის სიჩქარე (rpm) */
  pan_speed_rpm?: number;
}

/** panning ერთი წერტილი — კამერის პოზიცია */
export interface PanKeyframe {
  yaw: number;
  pitch: number;
  zoom: number;
}

export interface Hotspot {
  id: string;
  scene_id: string;
  target_scene_id: string;
  yaw: number;
  pitch: number;
  label: string | null;
}

export interface PublishedSnapshot {
  tourId: string;
  title: string;
  scenes: Scene[];
  hotspots: Hotspot[];
}

export interface TourDraft {
  tour: Tour;
  scenes: Scene[];
  hotspots: Hotspot[];
}
