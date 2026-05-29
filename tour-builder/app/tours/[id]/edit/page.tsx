import { Suspense } from "react";
import { TourEditor } from "@/components/TourEditor";

type Props = { params: Promise<{ id: string }> };

export default async function EditTourPage({ params }: Props) {
  const { id } = await params;
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center text-zinc-500">Loading tour…</div>
      }
    >
      <TourEditor tourId={id} />
    </Suspense>
  );
}
