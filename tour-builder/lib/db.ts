import { v4 as uuidv4 } from "uuid";
import { connectMongo } from "./mongo";
import {
  HotspotModel,
  SceneModel,
  TourModel,
  toHotspot,
  toSceneRaw,
  toTour,
} from "./models";
import { normalizeScene } from "./scene-settings";
import type { Hotspot, Scene, Tour, TourDraft } from "./types";

function toScene(d: unknown): Scene {
  return normalizeScene(toSceneRaw(d));
}

function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return base || "tour";
}

async function uniqueSlug(title: string): Promise<string> {
  const slug = slugify(title);
  let n = 0;
  while (true) {
    const candidate = n === 0 ? slug : `${slug}-${n}`;
    const row = await TourModel.findOne({ slug: candidate }).lean();
    if (!row) return candidate;
    n++;
  }
}

// ─── Tours ───

export async function listTours(): Promise<Tour[]> {
  await connectMongo();
  const rows = await TourModel.find().sort({ updated_at: -1 }).lean();
  return rows.map(toTour);
}

export async function getTour(id: string): Promise<Tour | undefined> {
  await connectMongo();
  const row = await TourModel.findOne({ id }).lean();
  return row ? toTour(row) : undefined;
}

export async function createTour(
  title: string,
  createdByUserId?: string | null
): Promise<Tour> {
  await connectMongo();
  const id = uuidv4();
  const now = new Date().toISOString();
  const slug = await uniqueSlug(title);
  const creatorId =
    typeof createdByUserId === "string" && createdByUserId.trim()
      ? createdByUserId.trim()
      : null;
  await TourModel.create({
    id,
    title,
    slug,
    created_at: now,
    updated_at: now,
    published_at: null,
    published_snapshot: null,
    created_by_user_id: creatorId,
  });
  return (await getTour(id))!;
}

export async function updateTour(
  id: string,
  data: { title?: string }
): Promise<Tour | undefined> {
  await connectMongo();
  const tour = await getTour(id);
  if (!tour) return undefined;
  const title = data.title ?? tour.title;
  const now = new Date().toISOString();
  await TourModel.updateOne({ id }, { $set: { title, updated_at: now } });
  return getTour(id);
}

export async function deleteTour(id: string): Promise<boolean> {
  await connectMongo();
  // Mongo-ში cascade არ არის — სცენებსა და hotspot-ებს ხელით ვშლით
  const scenes = await SceneModel.find({ tour_id: id }).select("id").lean();
  const sceneIds = scenes.map((s) => (s as { id: string }).id);
  if (sceneIds.length > 0) {
    await HotspotModel.deleteMany({
      $or: [
        { scene_id: { $in: sceneIds } },
        { target_scene_id: { $in: sceneIds } },
      ],
    });
    await SceneModel.deleteMany({ tour_id: id });
  }
  const result = await TourModel.deleteOne({ id });
  return result.deletedCount > 0;
}

export async function touchTour(tourId: string): Promise<void> {
  await TourModel.updateOne(
    { id: tourId },
    { $set: { updated_at: new Date().toISOString() } }
  );
}

// ─── Scenes ───

export async function listScenes(tourId: string): Promise<Scene[]> {
  await connectMongo();
  const rows = await SceneModel.find({ tour_id: tourId })
    .sort({ sort_order: 1, name: 1 })
    .lean();
  return rows.map(toScene);
}

export async function getScene(id: string): Promise<Scene | undefined> {
  await connectMongo();
  const row = await SceneModel.findOne({ id }).lean();
  return row ? toScene(row) : undefined;
}

export async function createScene(
  tourId: string,
  name: string
): Promise<Scene> {
  await connectMongo();
  const id = uuidv4();
  const last = await SceneModel.findOne({ tour_id: tourId })
    .sort({ sort_order: -1 })
    .select("sort_order")
    .lean();
  const nextOrder =
    last && typeof (last as { sort_order?: number }).sort_order === "number"
      ? (last as { sort_order: number }).sort_order + 1
      : 0;
  await SceneModel.create({ id, tour_id: tourId, name, sort_order: nextOrder });
  await touchTour(tourId);
  return (await getScene(id))!;
}

export async function updateScene(
  id: string,
  data: Partial<
    Pick<
      Scene,
      | "name"
      | "image_path"
      | "sort_order"
      | "default_yaw"
      | "default_pitch"
      | "default_zoom"
      | "auto_rotate_speed"
      | "intro_animation_ms"
      | "intro_from_yaw"
      | "intro_from_pitch"
      | "min_fov"
      | "max_fov"
      | "min_pitch"
      | "max_pitch"
      | "min_yaw"
      | "max_yaw"
      | "click_to_advance"
      | "default_view_custom"
      | "pan_enabled"
      | "pan_keyframes_json"
      | "pan_segment_ms"
      | "pan_speed_rpm"
    >
  >
): Promise<Scene | undefined> {
  await connectMongo();
  const scene = await getScene(id);
  if (!scene) return undefined;

  const allowed = [
    "name",
    "image_path",
    "sort_order",
    "default_yaw",
    "default_pitch",
    "default_zoom",
    "auto_rotate_speed",
    "intro_animation_ms",
    "intro_from_yaw",
    "intro_from_pitch",
    "min_fov",
    "max_fov",
    "min_pitch",
    "max_pitch",
    "min_yaw",
    "max_yaw",
    "click_to_advance",
    "default_view_custom",
    "pan_enabled",
    "pan_keyframes_json",
    "pan_segment_ms",
    "pan_speed_rpm",
  ] as const;

  const set: Record<string, unknown> = {};
  for (const key of allowed) {
    if (data[key] !== undefined) set[key] = data[key];
  }

  if (Object.keys(set).length === 0) return scene;

  await SceneModel.updateOne({ id }, { $set: set });
  await touchTour(scene.tour_id);
  return getScene(id);
}

export async function reorderScenes(
  tourId: string,
  sceneIds: string[]
): Promise<boolean> {
  await connectMongo();
  const existing = await listScenes(tourId);
  if (sceneIds.length !== existing.length) return false;

  const existingIds = new Set(existing.map((s) => s.id));
  if (!sceneIds.every((id) => existingIds.has(id))) return false;

  await SceneModel.bulkWrite(
    sceneIds.map((id, index) => ({
      updateOne: {
        filter: { id, tour_id: tourId },
        update: { $set: { sort_order: index } },
      },
    }))
  );
  await touchTour(tourId);
  return true;
}

export async function deleteScene(id: string): Promise<boolean> {
  await connectMongo();
  const scene = await getScene(id);
  if (!scene) return false;
  await HotspotModel.deleteMany({
    $or: [{ scene_id: id }, { target_scene_id: id }],
  });
  const result = await SceneModel.deleteOne({ id });
  if (result.deletedCount > 0) await touchTour(scene.tour_id);
  return result.deletedCount > 0;
}

// ─── Hotspots ───

export async function listHotspotsForTour(tourId: string): Promise<Hotspot[]> {
  await connectMongo();
  const scenes = await SceneModel.find({ tour_id: tourId }).select("id").lean();
  const sceneIds = scenes.map((s) => (s as { id: string }).id);
  if (sceneIds.length === 0) return [];
  const rows = await HotspotModel.find({ scene_id: { $in: sceneIds } }).lean();
  return rows.map(toHotspot);
}

export async function listHotspotsForScene(
  sceneId: string
): Promise<Hotspot[]> {
  await connectMongo();
  const rows = await HotspotModel.find({ scene_id: sceneId }).lean();
  return rows.map(toHotspot);
}

export async function getHotspot(id: string): Promise<Hotspot | undefined> {
  await connectMongo();
  const row = await HotspotModel.findOne({ id }).lean();
  return row ? toHotspot(row) : undefined;
}

export async function createHotspot(
  sceneId: string,
  targetSceneId: string,
  yaw: number,
  pitch: number,
  label?: string | null
): Promise<Hotspot> {
  await connectMongo();
  const scene = await getScene(sceneId);
  if (!scene) throw new Error("Scene not found");
  const id = uuidv4();
  await HotspotModel.create({
    id,
    scene_id: sceneId,
    target_scene_id: targetSceneId,
    yaw,
    pitch,
    label: label ?? null,
  });
  await touchTour(scene.tour_id);
  return (await getHotspot(id))!;
}

export async function updateHotspot(
  id: string,
  data: Partial<Pick<Hotspot, "target_scene_id" | "yaw" | "pitch" | "label">>
): Promise<Hotspot | undefined> {
  await connectMongo();
  const existing = await getHotspot(id);
  if (!existing) return undefined;

  const set: Record<string, unknown> = {};
  if (data.target_scene_id !== undefined)
    set.target_scene_id = data.target_scene_id;
  if (data.yaw !== undefined) set.yaw = data.yaw;
  if (data.pitch !== undefined) set.pitch = data.pitch;
  if (data.label !== undefined) set.label = data.label;

  if (Object.keys(set).length > 0) {
    await HotspotModel.updateOne({ id }, { $set: set });
    const scene = await getScene(existing.scene_id);
    if (scene) await touchTour(scene.tour_id);
  }

  return getHotspot(id);
}

export async function deleteHotspot(id: string): Promise<boolean> {
  await connectMongo();
  const existing = await getHotspot(id);
  if (!existing) return false;
  const result = await HotspotModel.deleteOne({ id });
  const scene = await getScene(existing.scene_id);
  if (scene) await touchTour(scene.tour_id);
  return result.deletedCount > 0;
}

// ─── Composite ───

export async function getTourDraft(tourId: string): Promise<TourDraft | null> {
  const tour = await getTour(tourId);
  if (!tour) return null;
  return {
    tour,
    scenes: await listScenes(tourId),
    hotspots: await listHotspotsForTour(tourId),
  };
}

export async function setPublishedSnapshot(
  tourId: string,
  snapshotJson: string
): Promise<Tour | undefined> {
  await connectMongo();
  const now = new Date().toISOString();
  await TourModel.updateOne(
    { id: tourId },
    {
      $set: {
        published_snapshot: snapshotJson,
        published_at: now,
        updated_at: now,
      },
    }
  );
  return getTour(tourId);
}
