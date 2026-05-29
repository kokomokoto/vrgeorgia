import { NextResponse } from "next/server";
import { createScene, getTour } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const tourId = body.tourId as string | undefined;
  const name =
    typeof body.name === "string" && body.name.trim()
      ? body.name.trim()
      : "New scene";

  if (!tourId) {
    return NextResponse.json({ error: "tourId is required" }, { status: 400 });
  }
  if (!(await getTour(tourId))) {
    return NextResponse.json({ error: "Tour not found" }, { status: 404 });
  }

  const scene = await createScene(tourId, name);
  return NextResponse.json(scene, { status: 201 });
}
