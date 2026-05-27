/** ობიექტზე ფოტოების მაქსიმუმი (backend-თან ერთად) */
export const MAX_PROPERTY_PHOTOS = 30;

/** ერთ მოთხოვნაში ატვირთვის მაქსიმუმი */
export const MAX_PROPERTY_PHOTOS_PER_UPLOAD = 30;
export type DropPlacement = 'before' | 'after';

export function reorderArray<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= items.length ||
    toIndex >= items.length
  ) {
    return items;
  }
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

/** drag-drop ჩავარდნის წერტილიდან ვთვლით ახალ toIndex-ს */
export function resolveDropToIndex(
  fromIndex: number,
  targetIndex: number,
  placement: DropPlacement
): number {
  if (fromIndex === targetIndex) return fromIndex;
  if (fromIndex < targetIndex) {
    return placement === 'before' ? targetIndex - 1 : targetIndex;
  }
  return placement === 'before' ? targetIndex : targetIndex + 1;
}

/** mainPhoto ინდექსის გადათვლა მასივის გადალაგების შემდეგ */
export function remapMainIndexAfterReorder(
  mainIndex: number,
  fromIndex: number,
  toIndex: number
): number {
  if (fromIndex === toIndex) return mainIndex;
  if (mainIndex === fromIndex) return toIndex;
  if (fromIndex < toIndex) {
    if (mainIndex > fromIndex && mainIndex <= toIndex) return mainIndex - 1;
  } else if (mainIndex >= toIndex && mainIndex < fromIndex) {
    return mainIndex + 1;
  }
  return mainIndex;
}

export function adjustMainIndexAfterRemoval(
  mainIndex: number,
  removedIndex: number
): number {
  if (mainIndex === removedIndex) return 0;
  if (removedIndex < mainIndex) return mainIndex - 1;
  return mainIndex;
}
