import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { getScene, updateScene } from "@/lib/db";
import sharp from "sharp";
import { validateEquirectangular } from "@/lib/image";
import { UPLOADS_DIR, uploadPath, uploadUrl } from "@/lib/paths";
import {
  compressPanoramaForCloudinary,
  isCloudinaryConfigured,
  uploadPanoramaToCloudinary,
} from "@/lib/cloudinary";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const formData = await request.formData();
  const sceneId = formData.get("sceneId") as string | null;
  const file = formData.get("file") as File | null;

  if (!sceneId || !file) {
    return NextResponse.json(
      { error: "sceneId and file are required" },
      { status: 400 }
    );
  }

  const scene = await getScene(sceneId);
  if (!scene) {
    return NextResponse.json({ error: "Scene not found" }, { status: 404 });
  }

  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.type)) {
    return NextResponse.json(
      { error: "Only JPEG, PNG, and WebP images are allowed" },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    await validateEquirectangular(buffer);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Invalid image";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // ── Production: ფოტო Cloudinary-ზე (იგივე ადგილი, სადაც ობიექტების ფოტოები) ──
  if (isCloudinaryConfigured()) {
    try {
      const compressed = await compressPanoramaForCloudinary(buffer);
      const imageUrl = await uploadPanoramaToCloudinary(
        compressed,
        scene.tour_id,
        sceneId
      );
      // ძველი ლოკალური ფაილი (ასეთის არსებობისას) გავწმინდოთ
      if (scene.image_path && scene.image_path.startsWith("/api/uploads/")) {
        const oldFilename = scene.image_path.split("/").pop();
        if (oldFilename) {
          const oldPath = uploadPath(scene.tour_id, oldFilename);
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }
      }
      const updated = await updateScene(sceneId, { image_path: imageUrl });
      return NextResponse.json(updated);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Upload failed";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  // ── Local dev fallback: დისკზე შენახვა (Cloudinary გასაღებების გარეშე) ──
  const ext =
    file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : "jpg";

  const tourDir = path.join(UPLOADS_DIR, scene.tour_id);
  fs.mkdirSync(tourDir, { recursive: true });

  const filename = `${sceneId}.${ext}`;
  const fullPath = uploadPath(scene.tour_id, filename);

  if (scene.image_path) {
    const oldFilename = scene.image_path.split("/").pop();
    if (oldFilename && oldFilename !== filename) {
      const oldPath = uploadPath(scene.tour_id, oldFilename);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
  }

  // Resize large panoramas so GPU upload stays fast (max 4K equirectangular)
  let output = buffer;
  let outExt = ext;
  try {
    const optimized = await sharp(buffer)
      .resize(4096, 2048, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer();
    output = Buffer.from(optimized);
    outExt = "jpg";
  } catch {
    output = buffer;
    outExt = ext;
  }

  const outFilename = outExt === ext ? filename : `${sceneId}.jpg`;
  const outPath = uploadPath(scene.tour_id, outFilename);

  if (outFilename !== filename && fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }

  fs.writeFileSync(outPath, output);

  const imageUrl = uploadUrl(scene.tour_id, outFilename);
  const updated = await updateScene(sceneId, { image_path: imageUrl });

  return NextResponse.json(updated);
}
