import { NextResponse } from "next/server";
import { createHotspot, getScene } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const sceneId = body.sceneId as string | undefined;
  const targetSceneId = body.targetSceneId as string | undefined;
  const yaw = Number(body.yaw);
  const pitch = Number(body.pitch);
  const label =
    typeof body.label === "string" ? body.label.trim() || null : null;

  if (!sceneId || !targetSceneId) {
    return NextResponse.json(
      { error: "sceneId and targetSceneId are required" },
      { status: 400 }
    );
  }
  if (Number.isNaN(yaw) || Number.isNaN(pitch)) {
    return NextResponse.json(
      { error: "yaw and pitch must be numbers" },
      { status: 400 }
    );
  }

  const scene = await getScene(sceneId);
  const target = await getScene(targetSceneId);
  if (!scene || !target) {
    return NextResponse.json({ error: "Scene not found" }, { status: 404 });
  }
  if (scene.tour_id !== target.tour_id) {
    return NextResponse.json(
      { error: "Scenes must belong to the same tour" },
      { status: 400 }
    );
  }
  if (sceneId === targetSceneId) {
    return NextResponse.json(
      { error: "Target scene must be different" },
      { status: 400 }
    );
  }

  const hotspot = await createHotspot(sceneId, targetSceneId, yaw, pitch, label);
  return NextResponse.json(hotspot, { status: 201 });
}
