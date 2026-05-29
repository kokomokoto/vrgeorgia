/** Ordered scene ids from anchor through target (inclusive). */
export function sceneSelectionRange(
  orderedIds: string[],
  anchorId: string,
  targetId: string
): string[] {
  const a = orderedIds.indexOf(anchorId);
  const b = orderedIds.indexOf(targetId);
  if (a < 0 || b < 0) return [targetId];
  const [lo, hi] = a < b ? [a, b] : [b, a];
  return orderedIds.slice(lo, hi + 1);
}

export type SceneSelectionClick = {
  sceneId: string;
  shiftKey: boolean;
  additive: boolean;
  orderedIds: string[];
  previousIds: string[];
  anchorId: string | null;
  fallbackAnchorId: string | null;
};

export type SceneSelectionResult = {
  selectedIds: string[];
  anchorId: string;
};

/**
 * File-explorer style selection: plain click replaces; Ctrl toggles; Shift selects a range.
 */
export function applySceneSelectionClick(
  input: SceneSelectionClick
): SceneSelectionResult {
  const {
    sceneId,
    shiftKey,
    additive,
    orderedIds,
    previousIds,
    anchorId,
    fallbackAnchorId,
  } = input;

  if (shiftKey) {
    const anchor =
      anchorId ??
      fallbackAnchorId ??
      (previousIds.length === 1 ? previousIds[0] : null) ??
      sceneId;
    const range = sceneSelectionRange(orderedIds, anchor, sceneId);
    if (additive) {
      const next = new Set(previousIds);
      for (const id of range) next.add(id);
      return { selectedIds: [...next], anchorId: anchor };
    }
    return { selectedIds: range, anchorId: anchor };
  }

  if (additive) {
    const next = new Set(previousIds);
    if (next.has(sceneId)) next.delete(sceneId);
    else next.add(sceneId);
    const anchor =
      anchorId ?? fallbackAnchorId ?? sceneId;
    return { selectedIds: [...next], anchorId: anchor };
  }

  return { selectedIds: [sceneId], anchorId: sceneId };
}
