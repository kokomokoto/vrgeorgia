import { getTourDraft, setPublishedSnapshot } from './tourDb.js';
import { deleteSceneImageFile } from './sceneFiles.js';

function imagePaths(snapshot) {
  return new Set(
    (snapshot?.scenes || []).map((scene) => scene?.image_path).filter(Boolean)
  );
}

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
  const previous = await getPublishedSnapshot(tourId);
  const snapshot = await buildSnapshot(tourId);
  if (!snapshot) {
    throw new Error('Tour not found');
  }
  const json = JSON.stringify(snapshot);
  const tour = await setPublishedSnapshot(tourId, json);
  if (!tour) {
    throw new Error('Failed to save published snapshot');
  }

  // ძველი პანორამა ღრუბლიდან მხოლოდ მაშინ იშლება, როცა ახალი
  // გამოქვეყნებული ვერსია მას აღარ იყენებს. წინააღმდეგ შემთხვევაში
  // უკვე გახსნილი ტური 404-ზე რჩება.
  const nextPaths = imagePaths(snapshot);
  for (const imagePath of imagePaths(previous)) {
    if (!nextPaths.has(imagePath)) {
      deleteSceneImageFile(snapshot.tourId, imagePath);
    }
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
