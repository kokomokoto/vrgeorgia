import type { Scene } from "./types";

export const SCENE_REORDER_MIME = "application/x-tour-scene-reorder";

export function isSceneReorderDrag(dataTransfer: DataTransfer): boolean {
  return dataTransfer.types.includes(SCENE_REORDER_MIME);
}

export function sortScenesByOrder(scenes: Scene[]): Scene[] {
  return [...scenes].sort(
    (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)
  );
}

/** Stable viewer cache key — ignores scene list order (reorder-safe). */
export function tourViewerKey(scenes: Scene[], mode: string): string {
  const signatures = scenes
    .map(
      (s) =>
        `${s.id}:${s.image_path ?? ""}:${s.min_fov}:${s.max_fov}:${s.min_pitch}:${s.max_pitch}:${s.min_yaw}:${s.max_yaw}`
    )
    .sort();
  return `${signatures.join("|")}|${mode}`;
}

export function sceneOrderKey(scenes: Scene[]): string {
  return sortScenesByOrder(scenes)
    .map((s) => s.id)
    .join(",");
}

export function reorderSceneIds(
  sceneIds: string[],
  draggedId: string,
  targetId: string,
  position: "before" | "after"
): string[] {
  return reorderSceneIdsBlock(sceneIds, [draggedId], targetId, position);
}

/** Move one or more scenes together, preserving their relative order. */
export function reorderSceneIdsBlock(
  sceneIds: string[],
  movingIds: string[],
  targetId: string,
  position: "before" | "after"
): string[] {
  const movingSet = new Set(movingIds);
  if (movingSet.size === 0) return sceneIds;

  const block = sceneIds.filter((id) => movingSet.has(id));
  if (block.length === 0) return sceneIds;

  if (movingSet.has(targetId) && block.length === movingSet.size) {
    return sceneIds;
  }

  const rest = sceneIds.filter((id) => !movingSet.has(id));
  let insertIndex = rest.indexOf(targetId);
  if (insertIndex < 0) return sceneIds;
  if (position === "after") insertIndex += 1;

  return [...rest.slice(0, insertIndex), ...block, ...rest.slice(insertIndex)];
}

export function parseReorderDragIds(data: string): string[] {
  if (!data) return [];
  return data.split(",").map((s) => s.trim()).filter(Boolean);
}
