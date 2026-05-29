import { sortScenesByOrder } from "./scene-reorder";
import type { Scene } from "./types";

export function getOrderedScenes(scenes: Scene[]): Scene[] {
  return sortScenesByOrder(scenes).filter((s) => s.image_path);
}

export function getNextSceneId(
  scenes: Scene[],
  currentId: string | null
): string | null {
  const ordered = getOrderedScenes(scenes);
  if (!currentId || ordered.length < 2) return null;
  const idx = ordered.findIndex((s) => s.id === currentId);
  if (idx < 0) return ordered[0]?.id ?? null;
  return ordered[(idx + 1) % ordered.length].id;
}
