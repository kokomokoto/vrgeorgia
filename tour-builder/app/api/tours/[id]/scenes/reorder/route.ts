import { NextResponse } from "next/server";
import { getTour, reorderScenes } from "@/lib/db";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id: tourId } = await params;
  if (!(await getTour(tourId))) {
    return NextResponse.json({ error: "Tour not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const sceneIds = body.sceneIds;
  if (!Array.isArray(sceneIds) || !sceneIds.every((x) => typeof x === "string")) {
    return NextResponse.json(
      { error: "sceneIds must be an array of strings" },
      { status: 400 }
    );
  }

  const ok = await reorderScenes(tourId, sceneIds);
  if (!ok) {
    return NextResponse.json({ error: "Invalid scene order" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
