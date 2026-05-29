import path from "path";

// Render-ზე ფაილური სისტემა ephemeral-ია — DB/ფაილების შესანახად
// TOUR_DATA_DIR-ით შეგიძლია persistent disk-ის mount path მიუთითო.
export const DATA_DIR = process.env.TOUR_DATA_DIR
  ? path.resolve(process.env.TOUR_DATA_DIR)
  : path.join(process.cwd(), "data");
export const DB_PATH = path.join(DATA_DIR, "tours.db");
export const UPLOADS_DIR = path.join(DATA_DIR, "uploads");

export function uploadPath(tourId: string, filename: string): string {
  return path.join(UPLOADS_DIR, tourId, filename);
}

export function uploadUrl(tourId: string, filename: string): string {
  return `/api/uploads/${tourId}/${filename}`;
}
