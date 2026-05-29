import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import multer from 'multer';
import sharp from 'sharp';

import {
  createHotspot,
  createScene,
  createTour,
  deleteHotspot,
  deleteScene,
  deleteTour,
  getHotspot,
  getScene,
  getTour,
  getTourDraft,
  listTours,
  reorderScenes,
  updateHotspot,
  updateScene,
  updateTour,
} from '../services/tour/tourDb.js';
import { publishTour, getPublishedSnapshot } from '../services/tour/tourPublish.js';
import { validateEquirectangular } from '../services/tour/tourImageValidate.js';
import {
  compressPanoramaForCloudinary,
  isCloudinaryConfigured,
  uploadPanoramaToCloudinary,
} from '../services/tour/panoramaImage.js';
import { deleteSceneImageFile } from '../services/tour/sceneFiles.js';
import { tourUploadPath, tourUploadUrl, TOUR_UPLOADS_DIR } from '../services/tour/tourPaths.js';

const router = express.Router();

const PANORAMA_MAX_MB = Number(process.env.TOUR_PANORAMA_MAX_MB || 50);
const uploadPanorama = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: PANORAMA_MAX_MB * 1024 * 1024 },
});

const SCENE_NUMERIC_FIELDS = [
  'sort_order',
  'default_yaw',
  'default_pitch',
  'default_zoom',
  'auto_rotate_speed',
  'intro_animation_ms',
  'intro_from_yaw',
  'intro_from_pitch',
  'min_fov',
  'max_fov',
  'min_pitch',
  'max_pitch',
  'min_yaw',
  'max_yaw',
  'click_to_advance',
  'default_view_custom',
  'pan_enabled',
  'pan_segment_ms',
  'pan_speed_rpm',
];

function parseScenePatch(body) {
  const data = {};

  if (typeof body.pan_keyframes_json === 'string') {
    data.pan_keyframes_json = body.pan_keyframes_json;
  } else if (body.pan_keyframes_json === null) {
    data.pan_keyframes_json = null;
  }

  if (typeof body.name === 'string') {
    const name = body.name.trim();
    if (!name) return { error: 'Scene name cannot be empty', status: 400 };
    data.name = name;
  }
  if (typeof body.image_path === 'string') data.image_path = body.image_path;

  for (const key of SCENE_NUMERIC_FIELDS) {
    if (body[key] !== undefined && body[key] !== null) {
      data[key] = Number(body[key]);
    } else if (
      body[key] === null &&
      (key === 'intro_from_yaw' || key === 'intro_from_pitch')
    ) {
      data[key] = null;
    }
  }

  return { data };
}

// ─── Tours ───

router.get('/tours', async (_req, res, next) => {
  try {
    const tours = await listTours();
    res.json(tours);
  } catch (err) {
    next(err);
  }
});

router.post('/tours', async (req, res, next) => {
  try {
    const title =
      typeof req.body?.title === 'string' && req.body.title.trim()
        ? req.body.title.trim()
        : 'Untitled tour';
    const tour = await createTour(title);
    res.status(201).json(tour);
  } catch (err) {
    next(err);
  }
});

router.get('/tours/:id', async (req, res, next) => {
  try {
    const draft = await getTourDraft(req.params.id);
    if (!draft) {
      return res.status(404).json({ error: 'Tour not found' });
    }
    res.json(draft);
  } catch (err) {
    next(err);
  }
});

router.patch('/tours/:id', async (req, res, next) => {
  try {
    const tour = await updateTour(req.params.id, {
      title: typeof req.body?.title === 'string' ? req.body.title.trim() : undefined,
    });
    if (!tour) {
      return res.status(404).json({ error: 'Tour not found' });
    }
    res.json(tour);
  } catch (err) {
    next(err);
  }
});

router.delete('/tours/:id', async (req, res, next) => {
  try {
    const ok = await deleteTour(req.params.id);
    if (!ok) {
      return res.status(404).json({ error: 'Tour not found' });
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.post('/tours/:id/publish', async (req, res, next) => {
  try {
    const result = await publishTour(req.params.id);
    res.json({
      tour: result.tour,
      publishedAt: result.tour.published_at,
      sceneCount: result.snapshot.scenes.filter((s) => s.image_path).length,
    });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Publish failed' });
  }
});

router.get('/tours/:id/published', async (req, res, next) => {
  try {
    const tour = await getTour(req.params.id);
    if (!tour) {
      return res.status(404).json({ error: 'Tour not found' });
    }
    const snapshot = await getPublishedSnapshot(req.params.id);
    if (!snapshot) {
      return res.status(404).json({ error: 'Tour has not been published yet' });
    }
    res.json({
      tour: {
        id: tour.id,
        title: tour.title,
        published_at: tour.published_at,
      },
      snapshot,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/tours/:id/scenes/reorder', async (req, res, next) => {
  try {
    const tourId = req.params.id;
    if (!(await getTour(tourId))) {
      return res.status(404).json({ error: 'Tour not found' });
    }
    const sceneIds = req.body?.sceneIds;
    if (!Array.isArray(sceneIds) || !sceneIds.every((x) => typeof x === 'string')) {
      return res.status(400).json({ error: 'sceneIds must be an array of strings' });
    }
    const ok = await reorderScenes(tourId, sceneIds);
    if (!ok) {
      return res.status(400).json({ error: 'Invalid scene order' });
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ─── Scenes ───

router.post('/scenes', async (req, res, next) => {
  try {
    const tourId = req.body?.tourId;
    const name =
      typeof req.body?.name === 'string' && req.body.name.trim()
        ? req.body.name.trim()
        : 'New scene';

    if (!tourId) {
      return res.status(400).json({ error: 'tourId is required' });
    }
    if (!(await getTour(tourId))) {
      return res.status(404).json({ error: 'Tour not found' });
    }

    const scene = await createScene(tourId, name);
    res.status(201).json(scene);
  } catch (err) {
    next(err);
  }
});

router.patch('/scenes/:id', async (req, res, next) => {
  try {
    const parsed = parseScenePatch(req.body || {});
    if (parsed.error) {
      return res.status(parsed.status).json({ error: parsed.error });
    }
    const scene = await updateScene(req.params.id, parsed.data);
    if (!scene) {
      return res.status(404).json({ error: 'Scene not found' });
    }
    res.json(scene);
  } catch (err) {
    next(err);
  }
});

router.delete('/scenes/:id', async (req, res, next) => {
  try {
    const scene = await getScene(req.params.id);
    if (!scene) {
      return res.status(404).json({ error: 'Scene not found' });
    }
    deleteSceneImageFile(scene.tour_id, scene.image_path);
    const ok = await deleteScene(req.params.id);
    if (!ok) {
      return res.status(500).json({ error: 'Failed to delete scene' });
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ─── Hotspots ───

router.post('/hotspots', async (req, res, next) => {
  try {
    const { sceneId, targetSceneId } = req.body || {};
    const yaw = Number(req.body?.yaw);
    const pitch = Number(req.body?.pitch);
    const label =
      typeof req.body?.label === 'string' ? req.body.label.trim() || null : null;

    if (!sceneId || !targetSceneId) {
      return res.status(400).json({ error: 'sceneId and targetSceneId are required' });
    }
    if (Number.isNaN(yaw) || Number.isNaN(pitch)) {
      return res.status(400).json({ error: 'yaw and pitch must be numbers' });
    }

    const scene = await getScene(sceneId);
    const target = await getScene(targetSceneId);
    if (!scene || !target) {
      return res.status(404).json({ error: 'Scene not found' });
    }
    if (scene.tour_id !== target.tour_id) {
      return res.status(400).json({ error: 'Scenes must belong to the same tour' });
    }
    if (sceneId === targetSceneId) {
      return res.status(400).json({ error: 'Target scene must be different' });
    }

    const hotspot = await createHotspot(sceneId, targetSceneId, yaw, pitch, label);
    res.status(201).json(hotspot);
  } catch (err) {
    next(err);
  }
});

router.patch('/hotspots/:id', async (req, res, next) => {
  try {
    const existing = await getHotspot(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Hotspot not found' });
    }

    const body = req.body || {};
    if (body.targetSceneId) {
      const target = await getScene(body.targetSceneId);
      const scene = await getScene(existing.scene_id);
      if (!target || !scene || scene.tour_id !== target.tour_id) {
        return res.status(400).json({ error: 'Invalid target scene' });
      }
      if (body.targetSceneId === existing.scene_id) {
        return res.status(400).json({ error: 'Target scene must be different' });
      }
    }

    const hotspot = await updateHotspot(req.params.id, {
      target_scene_id: body.targetSceneId,
      yaw: body.yaw !== undefined ? Number(body.yaw) : undefined,
      pitch: body.pitch !== undefined ? Number(body.pitch) : undefined,
      label:
        body.label !== undefined
          ? typeof body.label === 'string'
            ? body.label.trim() || null
            : null
          : undefined,
    });

    if (!hotspot) {
      return res.status(404).json({ error: 'Hotspot not found' });
    }
    res.json(hotspot);
  } catch (err) {
    next(err);
  }
});

router.delete('/hotspots/:id', async (req, res, next) => {
  try {
    const ok = await deleteHotspot(req.params.id);
    if (!ok) {
      return res.status(404).json({ error: 'Hotspot not found' });
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ─── Panorama upload ───

router.post('/upload', uploadPanorama.single('file'), async (req, res, next) => {
  try {
    const sceneId = req.body?.sceneId;
    const file = req.file;

    if (!sceneId || !file) {
      return res.status(400).json({ error: 'sceneId and file are required' });
    }

    const scene = await getScene(sceneId);
    if (!scene) {
      return res.status(404).json({ error: 'Scene not found' });
    }

    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.mimetype)) {
      return res.status(400).json({ error: 'Only JPEG, PNG, and WebP images are allowed' });
    }

    try {
      await validateEquirectangular(file.buffer);
    } catch (e) {
      return res.status(400).json({ error: e.message || 'Invalid image' });
    }

    if (isCloudinaryConfigured()) {
      try {
        const compressed = await compressPanoramaForCloudinary(file.buffer);
        const imageUrl = await uploadPanoramaToCloudinary(
          compressed,
          scene.tour_id,
          sceneId
        );
        if (scene.image_path?.startsWith('/api/uploads/')) {
          deleteSceneImageFile(scene.tour_id, scene.image_path);
        }
        const updated = await updateScene(sceneId, { image_path: imageUrl });
        return res.json(updated);
      } catch (e) {
        return res.status(400).json({ error: e.message || 'Upload failed' });
      }
    }

    const ext =
      file.mimetype === 'image/png'
        ? 'png'
        : file.mimetype === 'image/webp'
          ? 'webp'
          : 'jpg';

    const tourDir = path.join(TOUR_UPLOADS_DIR, scene.tour_id);
    fs.mkdirSync(tourDir, { recursive: true });

    const filename = `${sceneId}.${ext}`;
    const fullPath = tourUploadPath(scene.tour_id, filename);

    if (scene.image_path) {
      deleteSceneImageFile(scene.tour_id, scene.image_path);
    }

    let output = file.buffer;
    let outExt = ext;
    try {
      output = await sharp(file.buffer)
        .resize(4096, 2048, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85, mozjpeg: true })
        .toBuffer();
      outExt = 'jpg';
    } catch {
      output = file.buffer;
      outExt = ext;
    }

    const outFilename = outExt === ext ? filename : `${sceneId}.jpg`;
    const outPath = tourUploadPath(scene.tour_id, outFilename);

    if (outFilename !== filename && fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }

    fs.writeFileSync(outPath, output);

    const imageUrl = tourUploadUrl(scene.tour_id, outFilename);
    const updated = await updateScene(sceneId, { image_path: imageUrl });
    res.json(updated);
  } catch (err) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: `ფოტო ძალიან დიდია. მაქსიმუმ ${PANORAMA_MAX_MB} MB.`,
      });
    }
    next(err);
  }
});

// ─── Local panorama files (dev fallback) ───

const MIME = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

router.get('/uploads/:tourId/:filename', (req, res) => {
  const { tourId, filename } = req.params;
  if (filename.includes('..') || filename.includes('/')) {
    return res.status(400).json({ error: 'Invalid filename' });
  }

  const fullPath = tourUploadPath(tourId, filename);
  if (!fs.existsSync(fullPath)) {
    return res.status(404).json({ error: 'Not found' });
  }

  const ext = path.extname(filename).toLowerCase();
  res.setHeader('Content-Type', MIME[ext] ?? 'application/octet-stream');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.sendFile(fullPath);
});

export default router;
