import { sortScenesByOrder } from "./scene-reorder";
import { resolvePanoramaUrl } from "./tourApi";
import type { Hotspot, Scene } from "./types";

export interface ViewerNode {
  id: string;
  panorama: string;
  name: string;
  links: Array<{
    nodeId: string;
    position: { yaw: number; pitch: number };
    name?: string;
  }>;
}

export function buildViewerNodes(scenes: Scene[]): ViewerNode[] {
  return sortScenesByOrder(scenes)
    .filter((s) => s.image_path)
    .map((scene) => ({
      id: scene.id,
      panorama: resolvePanoramaUrl(scene.image_path)!,
      name: scene.name,
      links: [],
    }));
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Navigation pin — door + arrow, animated in tour preview */
export function hotspotMarkerHtml(
  label: string,
  editable: boolean
): string {
  const safe = escapeHtml(label);
  return `<div class="tour-pin${editable ? " tour-pin--edit" : ""}" role="button" aria-label="Go to ${safe}">
  <div class="tour-pin__rings" aria-hidden="true">
    <span class="tour-pin__pulse"></span>
    <span class="tour-pin__pulse tour-pin__pulse--delayed"></span>
  </div>
  <div class="tour-pin__orb">
    <svg class="tour-pin__icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 5h9v14H4V5z" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round"/>
      <path d="M13 12h7" stroke="currentColor" stroke-width="2.25" stroke-linecap="round"/>
      <path d="M17 8l4 4-4 4" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  </div>
  <span class="tour-pin__chip">${safe}</span>
</div>`;
}

export function sceneMarkers(
  hotspots: Hotspot[],
  sceneId: string,
  editable: boolean,
  sceneNameById: Map<string, string>
) {
  return hotspots
    .filter((h) => h.scene_id === sceneId)
    .map((h) => {
      const label =
        h.label || sceneNameById.get(h.target_scene_id) || "Next room";
      return {
        id: h.id,
        position: { yaw: h.yaw, pitch: h.pitch },
        html: hotspotMarkerHtml(label, editable),
        anchor: "center bottom" as const,
        tooltip: editable ? `→ ${label}` : `Enter ${label}`,
        data: {
          hotspotId: h.id,
          targetSceneId: h.target_scene_id,
        },
      };
    });
}
