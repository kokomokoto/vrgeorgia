import { NextResponse } from "next/server";
import { deleteScene, getScene, updateScene } from "@/lib/db";
import { deleteSceneImageFile } from "@/lib/scene-files";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const data: Record<string, unknown> = {};
  const numericFields = [
    "sort_order",
    "default_yaw",
    "default_pitch",
    "default_zoom",
    "auto_rotate_speed",
    "intro_animation_ms",
    "intro_from_yaw",
    "intro_from_pitch",
    "min_fov",
    "max_fov",
    "min_pitch",
    "max_pitch",
    "min_yaw",
    "max_yaw",
    "click_to_advance",
    "default_view_custom",
    "pan_enabled",
    "pan_segment_ms",
    "pan_speed_rpm",
  ] as const;

  // panning წერტილები — JSON სტრიქონი (მასივი {yaw,pitch,zoom})
  if (typeof body.pan_keyframes_json === "string") {
    data.pan_keyframes_json = body.pan_keyframes_json;
  } else if (body.pan_keyframes_json === null) {
    data.pan_keyframes_json = null;
  }

  if (typeof body.name === "string") {
    const name = body.name.trim();
    if (!name) {
      return NextResponse.json(
        { error: "Scene name cannot be empty" },
        { status: 400 }
      );
    }
    data.name = name;
  }
  if (typeof body.image_path === "string") data.image_path = body.image_path;

  for (const key of numericFields) {
    if (body[key] !== undefined && body[key] !== null) {
      data[key] = Number(body[key]);
    } else if (body[key] === null && (key === "intro_from_yaw" || key === "intro_from_pitch")) {
      data[key] = null;
    }
  }

  const scene = await updateScene(id, data);
  if (!scene) {
    return NextResponse.json({ error: "Scene not found" }, { status: 404 });
  }
  return NextResponse.json(scene);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const scene = await getScene(id);
  if (!scene) {
    return NextResponse.json({ error: "Scene not found" }, { status: 404 });
  }
  deleteSceneImageFile(scene.tour_id, scene.image_path);
  const ok = await deleteScene(id);
  if (!ok) {
    return NextResponse.json({ error: "Failed to delete scene" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
