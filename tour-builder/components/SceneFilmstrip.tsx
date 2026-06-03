"use client";

import { resolvePanoramaUrl } from "@/lib/tourApi";
import type { Scene } from "@/lib/types";

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
  return (
    <nav
      className="tour-filmstrip pointer-events-none absolute inset-y-0 left-0 z-30 flex w-[88px] flex-col gap-2 overflow-y-auto bg-transparent p-2 sm:w-[100px]"
      aria-label="Tour scenes"
    >
      {scenes.map((scene, index) => {
        const active = scene.id === activeSceneId;
        return (
          <button
            key={scene.id}
            type="button"
            onClick={() => onSelect(scene.id)}
            className={`pointer-events-auto group relative overflow-hidden rounded-xl shadow-lg ring-1 ring-white/20 transition-all duration-200 ${
              active
                ? "ring-2 ring-sky-400 ring-offset-2 ring-offset-transparent scale-[1.02] shadow-sky-900/40"
                : "opacity-90 hover:opacity-100 hover:ring-white/40"
            }`}
            title={scene.name}
          >
            <div className="aspect-[4/3] w-full bg-zinc-900">
              {scene.image_path ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={resolvePanoramaUrl(scene.image_path)}
                  alt=""
                  className="h-full w-full object-cover"
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
  );
}
