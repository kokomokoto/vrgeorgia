import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const TOUR_UPLOADS_DIR = process.env.TOUR_UPLOADS_DIR
  ? path.resolve(process.env.TOUR_UPLOADS_DIR)
  : path.resolve(__dirname, '../../uploads/tours');

export function tourUploadPath(tourId, filename) {
  return path.join(TOUR_UPLOADS_DIR, tourId, filename);
}

/** სრული ან relative URL ლოკალური პანორამისთვის (dev fallback) */
export function tourUploadUrl(tourId, filename) {
  const base =
    process.env.API_PUBLIC_URL ||
    process.env.TOUR_API_PUBLIC_URL ||
    (process.env.NODE_ENV !== 'production'
      ? `http://localhost:${process.env.PORT || 5000}`
      : '');
  const pathPart = `/api/uploads/${tourId}/${filename}`;
  if (!base) return pathPart;
  return `${base.replace(/\/$/, '')}${pathPart}`;
}
