"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getOrderedScenes } from "@/lib/scene-nav";
import type { Hotspot, Scene } from "@/lib/types";
import { PanoramaViewer } from "./PanoramaViewer";
import { SceneFilmstrip } from "./SceneFilmstrip";

interface TourExperienceProps {
  tourId: string;
  title: string;
  scenes: Scene[];
  hotspots: Hotspot[];
  variant: "draft" | "published";
}

export function TourExperience({
  tourId,
  title: _title,
  scenes,
  hotspots,
  variant,
}: TourExperienceProps) {
  const ordered = useMemo(() => getOrderedScenes(scenes), [scenes]);
  const [activeSceneId, setActiveSceneId] = useState<string | null>(
    ordered[0]?.id ?? null
  );

  useEffect(() => {
    if (ordered.length && !ordered.some((s) => s.id === activeSceneId)) {
      setActiveSceneId(ordered[0].id);
    }
  }, [ordered, activeSceneId]);

  const activeScene = ordered.find((s) => s.id === activeSceneId);
  const clickToAdvance = (activeScene?.click_to_advance ?? 1) === 1;

  const goToScene = useCallback((id: string) => {
    setActiveSceneId(id);
  }, []);

  if (!activeSceneId || ordered.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0a0a0c] text-zinc-400">
        No scenes to display.
      </div>
    );
  }

  return (
    <div className="tour-shell relative size-full min-h-[100dvh] overflow-hidden bg-[#0a0a0c]">
      <div className="tour-stage relative size-full min-h-0 min-w-0">
        <PanoramaViewer
          className="tour-panorama-layer absolute inset-0 z-0 size-full bg-transparent"
          scenes={ordered}
          hotspots={hotspots}
          activeSceneId={activeSceneId}
          navigateToSceneId={activeSceneId}
          mode="navigate"
          clickToAdvance={clickToAdvance}
          onSceneChange={setActiveSceneId}
        />

        <SceneFilmstrip
          scenes={ordered}
          activeSceneId={activeSceneId}
          onSelect={goToScene}
        />

        {variant === "draft" && (
          <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-end p-4">
            <Link
              href={`/tours/${tourId}/edit`}
              className="pointer-events-auto rounded-full border border-white/15 bg-black/50 px-4 py-2 text-sm text-white backdrop-blur-md transition hover:bg-white/10"
            >
              Exit preview
            </Link>
          </header>
        )}

        <footer className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center p-4">
          <div className="rounded-full border border-white/10 bg-black/50 px-4 py-2 text-xs text-white/70 backdrop-blur-md">
            {ordered.findIndex((s) => s.id === activeSceneId) + 1} /{" "}
            {ordered.length} — {activeScene?.name}
          </div>
        </footer>
      </div>
    </div>
  );
}
