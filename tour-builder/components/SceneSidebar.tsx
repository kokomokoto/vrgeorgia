"use client";

import { useMemo, useRef, useState } from "react";
import {
  getImageFilesFromDataTransfer,
  hasPanoramaImageInDataTransfer,
} from "@/lib/dnd-image";
import {
  isSceneReorderDrag,
  parseReorderDragIds,
  reorderSceneIdsBlock,
  SCENE_REORDER_MIME,
  sortScenesByOrder,
} from "@/lib/scene-reorder";
import type { Scene } from "@/lib/types";

interface SceneSidebarProps {
  scenes: Scene[];
  activeSceneId: string | null;
  selectedSceneIds: string[];
  onSelect: (id: string) => void;
  onSceneSelect: (
    id: string,
    opts: { shiftKey: boolean; additive: boolean }
  ) => void;
  onDelete: (id: string) => void;
  onUploadFiles: (files: File[], targetSceneId?: string) => void;
  onReorder: (sceneIds: string[]) => void;
  onNameChange: (sceneId: string, name: string) => void;
  onNameSave: (sceneId: string) => void;
  uploadingSceneId: string | null;
  isUploading?: boolean;
}

type ReorderMarker = { targetId: string; position: "before" | "after" };

function readDraggedSceneIds(
  dataTransfer: DataTransfer,
  fallback: string | null,
  sceneIds: string[],
  selectedSet: Set<string>
): string[] {
  const raw =
    dataTransfer.getData(SCENE_REORDER_MIME) ||
    dataTransfer.getData("text/plain");
  const parsed = parseReorderDragIds(raw);
  if (parsed.length > 0) return parsed;
  if (!fallback) return [];
  if (selectedSet.has(fallback) && selectedSet.size > 1) {
    return sceneIds.filter((id) => selectedSet.has(id));
  }
  return [fallback];
}

function markerFromElement(
  el: HTMLElement,
  clientY: number
): ReorderMarker | null {
  const li = el.closest("[data-scene-drop]");
  if (!li) return null;
  const targetId = li.getAttribute("data-scene-drop");
  if (!targetId) return null;
  const rect = li.getBoundingClientRect();
  const position: "before" | "after" =
    clientY < rect.top + rect.height / 2 ? "before" : "after";
  return { targetId, position };
}

export function SceneSidebar({
  scenes,
  activeSceneId,
  selectedSceneIds,
  onSelect,
  onSceneSelect,
  onDelete,
  onUploadFiles,
  onReorder,
  onNameChange,
  onNameSave,
  uploadingSceneId,
  isUploading = false,
}: SceneSidebarProps) {
  const ordered = useMemo(() => sortScenesByOrder(scenes), [scenes]);
  const sceneIds = useMemo(() => ordered.map((s) => s.id), [scenes]);
  const selectedSet = useMemo(
    () => new Set(selectedSceneIds),
    [selectedSceneIds]
  );

  const [panelFileDragOver, setPanelFileDragOver] = useState(false);
  const [fileHoverSceneId, setFileHoverSceneId] = useState<string | null>(null);
  const [draggingSceneId, setDraggingSceneId] = useState<string | null>(null);
  const [reorderMarker, setReorderMarker] = useState<ReorderMarker | null>(null);
  const reorderMarkerRef = useRef<ReorderMarker | null>(null);
  const draggingSceneIdRef = useRef<string | null>(null);
  const fileDragDepth = useRef(0);
  const busy = isUploading || uploadingSceneId !== null;
  const [pendingFileCount, setPendingFileCount] = useState(0);

  function isFileDrag(dt: DataTransfer) {
    return hasPanoramaImageInDataTransfer(dt) && !isSceneReorderDrag(dt);
  }

  function isReorderActive() {
    return draggingSceneIdRef.current !== null;
  }

  function setMarker(marker: ReorderMarker | null) {
    reorderMarkerRef.current = marker;
    setReorderMarker(marker);
  }

  function allowFileDrop(e: React.DragEvent) {
    if (busy || isReorderActive()) return;
    if (!isFileDrag(e.dataTransfer)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }

  function allowReorderDrop(e: React.DragEvent) {
    if (busy || !isReorderActive()) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
  }

  function handlePanelFileDragEnter(e: React.DragEvent) {
    if (busy || isReorderActive() || !isFileDrag(e.dataTransfer)) return;
    e.preventDefault();
    fileDragDepth.current += 1;
    setPendingFileCount(getImageFilesFromDataTransfer(e.dataTransfer).length);
    setPanelFileDragOver(true);
  }

  function handlePanelFileDragLeave(e: React.DragEvent) {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    fileDragDepth.current = Math.max(0, fileDragDepth.current - 1);
    if (fileDragDepth.current === 0) {
      setPanelFileDragOver(false);
      setFileHoverSceneId(null);
      setPendingFileCount(0);
    }
  }

  function handlePanelFileDrop(e: React.DragEvent) {
    if (isSceneReorderDrag(e.dataTransfer) || isReorderActive()) return;

    e.preventDefault();
    fileDragDepth.current = 0;
    setPanelFileDragOver(false);
    setFileHoverSceneId(null);
    if (busy) return;

    const files = getImageFilesFromDataTransfer(e.dataTransfer);
    if (files.length === 0) return;

    const card = (e.target as HTMLElement).closest("[data-scene-drop]");
    const sceneId = card?.getAttribute("data-scene-drop") ?? undefined;
    if (sceneId) onSelect(sceneId);
    onUploadFiles(files, sceneId);
  }

  function handleReorderDragOver(e: React.DragEvent, targetId: string) {
    if (!isReorderActive() || busy) return;
    allowReorderDrop(e);
    const li =
      (e.currentTarget as HTMLElement).closest("[data-scene-drop]") ??
      (e.currentTarget as HTMLElement);
    const rect = li.getBoundingClientRect();
    const position: "before" | "after" =
      e.clientY < rect.top + rect.height / 2 ? "before" : "after";
    setMarker({ targetId, position });
  }

  function handleReorderDrop(e: React.DragEvent) {
    const movingIds = readDraggedSceneIds(
      e.dataTransfer,
      draggingSceneIdRef.current,
      sceneIds,
      selectedSet
    );
    if (movingIds.length === 0 || busy) return;

    e.preventDefault();
    e.stopPropagation();

    const marker =
      reorderMarkerRef.current ??
      markerFromElement(e.target as HTMLElement, e.clientY);
    if (!marker) {
      endReorderDrag();
      return;
    }

    const next = reorderSceneIdsBlock(
      sceneIds,
      movingIds,
      marker.targetId,
      marker.position
    );
    endReorderDrag();
    if (next.join() !== sceneIds.join()) {
      onReorder(next);
    }
  }

  function startReorderDrag(e: React.DragEvent, sceneId: string) {
    e.stopPropagation();
    const movingIds =
      selectedSet.has(sceneId) && selectedSet.size > 1
        ? sceneIds.filter((id) => selectedSet.has(id))
        : [sceneId];
    e.dataTransfer.setData(SCENE_REORDER_MIME, movingIds.join(","));
    e.dataTransfer.setData("text/plain", movingIds[0] ?? sceneId);
    e.dataTransfer.effectAllowed = "move";
    draggingSceneIdRef.current = sceneId;
    setDraggingSceneId(sceneId);
    setPanelFileDragOver(false);
    fileDragDepth.current = 0;
  }

  function endReorderDrag() {
    draggingSceneIdRef.current = null;
    setDraggingSceneId(null);
    setMarker(null);
  }

  const fileHoverScene = fileHoverSceneId
    ? ordered.find((s) => s.id === fileHoverSceneId)
    : null;

  const fileOverlayHint = fileHoverScene
    ? pendingFileCount > 1
      ? `Drop ${pendingFileCount} photos — first on “${fileHoverScene.name}”, then new scenes`
      : `Drop on “${fileHoverScene.name}” — ${fileHoverScene.image_path ? "replace photo" : "add photo"}`
    : pendingFileCount > 1
      ? `Drop ${pendingFileCount} photos — each becomes a scene`
      : "Drop 360° photo(s) — each becomes a scene";

  return (
    <aside
      className="relative flex w-56 shrink-0 flex-col border-r border-zinc-800 bg-zinc-900"
      onDragEnter={handlePanelFileDragEnter}
      onDragLeave={handlePanelFileDragLeave}
      onDragOver={(e) => {
        if (isReorderActive() || isSceneReorderDrag(e.dataTransfer)) {
          allowReorderDrop(e);
          return;
        }
        allowFileDrop(e);
      }}
      onDrop={(e) => {
        if (isReorderActive() || isSceneReorderDrag(e.dataTransfer)) {
          handleReorderDrop(e);
          return;
        }
        handlePanelFileDrop(e);
      }}
    >
      {panelFileDragOver && !draggingSceneId && (
        <div
          className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center border-2 border-dashed border-blue-400 bg-blue-950/55 p-4 text-center backdrop-blur-[1px]"
          aria-hidden
        >
          <p className="text-sm font-medium text-blue-100">{fileOverlayHint}</p>
          <p className="mt-2 text-[11px] text-blue-200/70">
            JPEG, PNG or WebP · 2:1 equirectangular
          </p>
        </div>
      )}

      <div className="relative z-10 border-b border-zinc-800 p-2">
        <label
          className={`group block w-full cursor-pointer ${busy ? "pointer-events-none opacity-50" : ""}`}
          title="Add 360° images"
        >
          <span className="flex aspect-video w-full items-center justify-center rounded-lg border border-dashed border-zinc-600 bg-zinc-800/90 text-zinc-400 transition group-hover:border-zinc-500 group-hover:bg-zinc-700 group-hover:text-zinc-200">
            {busy ? (
              <span className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-600 border-t-zinc-300" />
            ) : (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-12 w-12"
                aria-hidden
              >
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="M8 11l2.5 2.5L14 10l6 7H3l5-6z" />
                <path d="M17 3v4M15 5h4" strokeWidth="2" />
              </svg>
            )}
          </span>
          <span className="sr-only">Add 360° images</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            disabled={busy}
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              e.target.value = "";
              if (files.length > 0) onUploadFiles(files);
            }}
          />
        </label>
      </div>

      <ul
        className="relative z-10 flex-1 overflow-y-auto p-2 space-y-2"
        onDragOver={(e) => {
          if (!isReorderActive()) return;
          allowReorderDrop(e);
          const marker = markerFromElement(e.target as HTMLElement, e.clientY);
          if (marker) setMarker(marker);
        }}
        onDrop={handleReorderDrop}
      >
        {ordered.length === 0 && (
          <li className="rounded-lg border border-dashed border-zinc-700 px-2 py-10 text-center text-xs text-zinc-500">
            No scenes yet.
            <span className="mt-2 block text-zinc-600">
              Drag a 360° image anywhere here
            </span>
          </li>
        )}
        {ordered.map((scene, index) => {
          const isFileHover = fileHoverSceneId === scene.id;
          const isUploading = uploadingSceneId === scene.id;
          const isDragging = draggingSceneId === scene.id;
          const isSelected = selectedSet.has(scene.id);
          const isActive = activeSceneId === scene.id;
          const showBefore =
            reorderMarker?.targetId === scene.id &&
            reorderMarker.position === "before";
          const showAfter =
            reorderMarker?.targetId === scene.id &&
            reorderMarker.position === "after";

          return (
            <li
              key={scene.id}
              data-scene-drop={scene.id}
              className="relative"
              onDragOver={(e) => handleReorderDragOver(e, scene.id)}
              onDrop={handleReorderDrop}
            >
              {showBefore && (
                <div className="absolute -top-1 left-1 right-1 z-30 h-0.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
              )}
              <div
                className={`rounded-lg border-2 p-2 transition ${
                  isSelected
                    ? "border-sky-400 bg-sky-950/55 shadow-[0_0_0_1px_rgba(56,189,248,0.35)]"
                    : isActive
                      ? "border-blue-500/80 bg-zinc-800"
                      : "border-zinc-700 bg-zinc-900"
                } ${
                  isFileHover && panelFileDragOver
                    ? "border-blue-300 ring-2 ring-blue-400/60"
                    : ""
                } ${isDragging ? "opacity-40" : ""} ${
                  reorderMarker?.targetId === scene.id && draggingSceneId
                    ? "ring-1 ring-amber-400/50"
                    : ""
                }`}
                onClick={(e) => {
                  const target = e.target as HTMLElement;
                  if (target.closest("input, button, label, a")) return;
                  e.preventDefault();
                  onSceneSelect(scene.id, {
                    shiftKey: e.shiftKey,
                    additive: e.ctrlKey || e.metaKey,
                  });
                  onSelect(scene.id);
                }}
                onDragOver={(e) => {
                  if (isReorderActive()) {
                    handleReorderDragOver(e, scene.id);
                    return;
                  }
                  allowFileDrop(e);
                  if (isFileDrag(e.dataTransfer)) {
                    setFileHoverSceneId(scene.id);
                  }
                }}
                onDragLeave={(e) => {
                  if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                  setFileHoverSceneId((id) => (id === scene.id ? null : id));
                }}
              >
                <div
                  className="mb-1.5 flex items-center gap-1.5"
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <span className="shrink-0 text-[10px] font-semibold tabular-nums text-zinc-500">
                    #{index + 1}
                  </span>
                  <input
                    type="text"
                    value={scene.name}
                    disabled={busy}
                    placeholder="Scene name"
                    onChange={(e) => onNameChange(scene.id, e.target.value)}
                    onBlur={() => onNameSave(scene.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                    className="min-w-0 flex-1 truncate rounded bg-zinc-950/60 px-1.5 py-0.5 text-sm font-medium text-white ring-1 ring-zinc-700/80 placeholder:text-zinc-600 outline-none focus:ring-blue-500 disabled:opacity-50"
                  />
                </div>
                <div
                  draggable={!busy}
                  onDragStart={(e) => startReorderDrag(e, scene.id)}
                  onDragEnd={endReorderDrag}
                  title="Drag to reorder · Ctrl+click · Shift+click range"
                  className={`relative aspect-video w-full cursor-grab overflow-hidden rounded bg-zinc-950 active:cursor-grabbing ${
                    isSelected ? "ring-2 ring-inset ring-sky-400/90" : ""
                  }`}
                >
                  {scene.image_path ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={scene.image_path}
                      alt={scene.name}
                      draggable={false}
                      className={`pointer-events-none h-full w-full select-none object-cover ${
                        isSelected ? "brightness-110 saturate-110" : ""
                      }`}
                    />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-1 px-1 text-center text-xs text-zinc-600">
                      <span>No image</span>
                      <span className="text-[10px] text-zinc-500">Drag to reorder</span>
                    </div>
                  )}
                  {isSelected && !isUploading && (
                    <div
                      className="pointer-events-none absolute inset-0 bg-sky-400/20"
                      aria-hidden
                    />
                  )}
                  {isUploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-xs text-white">
                      Uploading…
                    </div>
                  )}
                  {!isUploading && scene.image_path && (
                    <span className="pointer-events-none absolute bottom-1.5 right-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-zinc-300">
                      ⋮⋮
                    </span>
                  )}
                  <button
                    type="button"
                    title={`Delete ${scene.name}`}
                    disabled={busy}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(scene.id);
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="absolute top-1.5 right-1.5 z-20 grid h-6 w-6 place-items-center rounded-full bg-black/65 p-0 text-zinc-100 shadow-sm hover:bg-red-900/90 hover:text-white disabled:pointer-events-none disabled:opacity-40"
                    aria-label={`Delete ${scene.name}`}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="h-3.5 w-3.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      aria-hidden
                    >
                      <path d="M6 6l12 12M18 6 6 18" />
                    </svg>
                  </button>
                </div>
              </div>
              {showAfter && (
                <div className="absolute -bottom-1 left-1 right-1 z-30 h-0.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
              )}
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
