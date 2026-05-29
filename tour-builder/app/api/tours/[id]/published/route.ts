import { NextResponse } from "next/server";
import { getTour } from "@/lib/db";
import { getPublishedSnapshot } from "@/lib/publish";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const tour = await getTour(id);
  if (!tour) {
    return NextResponse.json({ error: "Tour not found" }, { status: 404 });
  }
  const snapshot = await getPublishedSnapshot(id);
  if (!snapshot) {
    return NextResponse.json(
      { error: "Tour has not been published yet" },
      { status: 404 }
    );
  }
  return NextResponse.json({
    tour: {
      id: tour.id,
      title: tour.title,
      published_at: tour.published_at,
    },
    snapshot,
  });
}
