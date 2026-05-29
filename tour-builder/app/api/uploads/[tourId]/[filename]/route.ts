import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { uploadPath } from "@/lib/paths";

export const runtime = "nodejs";

type Params = { params: Promise<{ tourId: string; filename: string }> };

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

export async function GET(_request: Request, { params }: Params) {
  const { tourId, filename } = await params;

  if (filename.includes("..") || filename.includes("/")) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
  }

  const fullPath = uploadPath(tourId, filename);
  if (!fs.existsSync(fullPath)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const ext = path.extname(filename).toLowerCase();
  const contentType = MIME[ext] ?? "application/octet-stream";
  const buffer = fs.readFileSync(fullPath);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400",
      "Accept-Ranges": "bytes",
    },
  });
}
