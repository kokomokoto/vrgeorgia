import { NextResponse } from "next/server";
import { deleteTour, getTourDraft, updateTour } from "@/lib/db";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const draft = await getTourDraft(id);
  if (!draft) {
    return NextResponse.json({ error: "Tour not found" }, { status: 404 });
  }
  return NextResponse.json(draft);
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const tour = await updateTour(id, {
    title: typeof body.title === "string" ? body.title.trim() : undefined,
  });
  if (!tour) {
    return NextResponse.json({ error: "Tour not found" }, { status: 404 });
  }
  return NextResponse.json(tour);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const ok = await deleteTour(id);
  if (!ok) {
    return NextResponse.json({ error: "Tour not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
