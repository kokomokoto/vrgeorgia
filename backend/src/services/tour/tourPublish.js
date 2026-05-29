import { getTourDraft, setPublishedSnapshot } from './tourDb.js';

export async function buildSnapshot(tourId) {
  const draft = await getTourDraft(tourId);
  if (!draft) return null;

  const scenesWithImages = draft.scenes.filter((s) => s.image_path);
  if (scenesWithImages.length === 0) {
    throw new Error('Tour must have at least one scene with an uploaded panorama');
  }

  return {
    tourId: draft.tour.id,
    title: draft.tour.title,
    scenes: draft.scenes,
    hotspots: draft.hotspots,
  };
}

export async function publishTour(tourId) {
  const snapshot = await buildSnapshot(tourId);
  if (!snapshot) {
    throw new Error('Tour not found');
  }
  const json = JSON.stringify(snapshot);
  const tour = await setPublishedSnapshot(tourId, json);
  if (!tour) {
    throw new Error('Failed to save published snapshot');
  }
  return { tour, snapshot };
}

export async function getPublishedSnapshot(tourId) {
  const draft = await getTourDraft(tourId);
  if (!draft?.tour.published_snapshot) return null;
  try {
    return JSON.parse(draft.tour.published_snapshot);
  } catch {
    return null;
  }
}
