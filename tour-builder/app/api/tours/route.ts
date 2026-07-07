import { NextResponse } from "next/server";
import { createTour, listTours } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const tours = await listTours();
  return NextResponse.json(tours);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const title = typeof body.title === "string" && body.title.trim()
    ? body.title.trim()
    : "Untitled tour";
  const createdByUserId =
    typeof body.created_by_user_id === "string"
      ? body.created_by_user_id.trim()
      : null;
  const tour = await createTour(title, createdByUserId);
  return NextResponse.json(tour, { status: 201 });
}
