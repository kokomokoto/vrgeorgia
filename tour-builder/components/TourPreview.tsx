"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { normalizeScene } from "@/lib/scene-settings";
import type { Hotspot, PublishedSnapshot, Scene } from "@/lib/types";
import { TourExperience } from "./TourExperience";

interface TourPreviewProps {
  tourId: string;
  source: "draft" | "published";
}

export function TourPreview({ tourId, source }: TourPreviewProps) {
  const [title, setTitle] = useState("");
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    setReady(false);
    const url =
      source === "published"
        ? `/api/tours/${tourId}/published`
        : `/api/tours/${tourId}`;
    const res = await fetch(url);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not load tour");
      return;
    }
    const data = await res.json();
    if (source === "published") {
      const snap = data.snapshot as PublishedSnapshot;
      setTitle(snap.title);
      setScenes(
        snap.scenes.filter((s) => s.image_path).map((s) => normalizeScene(s))
      );
      setHotspots(snap.hotspots);
    } else {
      setTitle(data.tour.title);
      setScenes(
        data.scenes
          .filter((s: Scene) => s.image_path)
          .map((s: Scene) => normalizeScene(s))
      );
      setHotspots(data.hotspots);
    }
    setReady(true);
  }, [tourId, source]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-[#0a0a0c]">
        <p className="text-red-300">{error}</p>
        <Link
          href={`/tours/${tourId}/edit`}
          className="text-sky-400 hover:underline"
        >
          Back to editor
        </Link>
      </div>
    );
  }

  if (!ready || scenes.length === 0) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-[#0a0a0c] text-zinc-400">
        <p>{ready ? "No scenes with images to preview." : "Loading tour…"}</p>
        {ready && (
          <Link
            href={`/tours/${tourId}/edit`}
            className="text-sky-400 hover:underline"
          >
            Back to editor
          </Link>
        )}
      </div>
    );
  }

  return (
    <TourExperience
      tourId={tourId}
      title={title}
      scenes={scenes}
      hotspots={hotspots}
      variant={source}
    />
  );
}
