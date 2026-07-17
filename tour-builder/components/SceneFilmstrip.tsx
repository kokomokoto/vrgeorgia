"use client";

import { useEffect, useState } from "react";
import { resolvePanoramaUrl } from "@/lib/tourApi";
import type { Scene } from "@/lib/types";

const STORAGE_KEY = "vrgeorgia-tour-filmstrip-collapsed";

interface SceneFilmstripProps {
  scenes: Scene[];
  activeSceneId: string | null;
  onSelect: (sceneId: string) => void;
}

export function SceneFilmstrip({
  scenes,
  activeSceneId,
  onSelect,
}: SceneFilmstripProps) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw === "1") setCollapsed(true);
    } catch {
      /* ignore */
    }
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        sessionStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  if (collapsed) {
    return (
      <div className="tour-filmstrip-wrap absolute left-0 top-0 z-30 p-2">
        <button
          type="button"
          onClick={toggleCollapsed}
          className="tour-filmstrip__toggle flex h-8 w-8 items-center justify-center rounded-lg border border-white/20 bg-black/55 text-white shadow-md backdrop-blur-md transition hover:bg-black/75"
          aria-label="Show scene list"
          title="ფოტოების გაშლა"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="tour-filmstrip-wrap absolute inset-y-0 left-0 z-30 flex w-[88px] flex-col sm:w-[100px]">
      <div className="pointer-events-auto shrink-0 p-2 pb-0">
        <button
          type="button"
          onClick={toggleCollapsed}
          className="tour-filmstrip__toggle flex h-8 w-full items-center justify-center rounded-lg border border-white/20 bg-black/55 text-white shadow-md backdrop-blur-md transition hover:bg-black/75"
          aria-label="Hide scene list"
          title="ფოტოების შეკეცვა"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      <nav
        className="tour-filmstrip flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-y-contain p-2 pt-2"
        aria-label="Tour scenes"
      >
        {scenes.map((scene, index) => {
          const active = scene.id === activeSceneId;
          return (
            <button
              key={scene.id}
              type="button"
              onClick={() => onSelect(scene.id)}
              className={`tour-filmstrip__thumb group relative w-full shrink-0 overflow-hidden rounded-xl shadow-lg ring-1 ring-white/20 transition-all duration-200 ${
                active
                  ? "ring-2 ring-sky-400 ring-offset-2 ring-offset-transparent scale-[1.02] shadow-sky-900/40"
                  : "opacity-90 hover:opacity-100 hover:ring-white/40"
              }`}
              title={scene.name}
            >
              <div className="aspect-[4/3] w-full shrink-0 bg-zinc-900">
                {scene.image_path ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={resolvePanoramaUrl(scene.image_path)}
                    alt=""
                    className="pointer-events-none h-full w-full object-cover"
                    draggable={false}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-[10px] text-zinc-600">
                    —
                  </div>
                )}
              </div>
              <span
                className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-1.5 pb-1.5 pt-4 text-left text-[10px] font-medium leading-tight ${
                  active ? "text-sky-200" : "text-white/90"
                }`}
              >
                <span className="text-white/50">{index + 1}.</span> {scene.name}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
