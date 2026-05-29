import { NextResponse } from "next/server";
import { deleteHotspot, getHotspot, getScene, updateHotspot } from "@/lib/db";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const existing = await getHotspot(id);
  if (!existing) {
    return NextResponse.json({ error: "Hotspot not found" }, { status: 404 });
  }

  if (body.targetSceneId) {
    const target = await getScene(body.targetSceneId);
    const scene = await getScene(existing.scene_id);
    if (!target || !scene || scene.tour_id !== target.tour_id) {
      return NextResponse.json({ error: "Invalid target scene" }, { status: 400 });
    }
    if (body.targetSceneId === existing.scene_id) {
      return NextResponse.json(
        { error: "Target scene must be different" },
        { status: 400 }
      );
    }
  }

  const hotspot = await updateHotspot(id, {
    target_scene_id: body.targetSceneId,
    yaw: body.yaw !== undefined ? Number(body.yaw) : undefined,
    pitch: body.pitch !== undefined ? Number(body.pitch) : undefined,
    label:
      body.label !== undefined
        ? typeof body.label === "string"
          ? body.label.trim() || null
          : null
        : undefined,
  });

  if (!hotspot) {
    return NextResponse.json({ error: "Hotspot not found" }, { status: 404 });
  }
  return NextResponse.json(hotspot);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const ok = await deleteHotspot(id);
  if (!ok) {
    return NextResponse.json({ error: "Hotspot not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
