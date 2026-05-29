import { NextResponse } from "next/server";
import { publishTour } from "@/lib/publish";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const { id } = await params;
  try {
    const result = await publishTour(id);
    return NextResponse.json({
      tour: result.tour,
      publishedAt: result.tour.published_at,
      sceneCount: result.snapshot.scenes.filter((s) => s.image_path).length,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Publish failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
