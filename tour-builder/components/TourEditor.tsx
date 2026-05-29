"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PanoramaViewer, type ViewerApi } from "./PanoramaViewer";
import { SceneSettingsPanel } from "./SceneSettingsPanel";
import { SceneSidebar } from "./SceneSidebar";
import {
  getImageFilesFromDataTransfer,
  hasPanoramaImageInDataTransfer,
  isPanoramaImageFile,
  sceneNameFromFile,
} from "@/lib/dnd-image";
import { applySceneSelectionClick } from "@/lib/scene-selection";
import { sortScenesByOrder } from "@/lib/scene-reorder";
import type { Hotspot, Scene, TourDraft } from "@/lib/types";

interface TourEditorProps {
  tourId: string;
}

import { VRGEORGIA_TOUR_MESSAGE, getPublicTourUrl } from "@/lib/vrgeorgia";

export function TourEditor({ tourId }: TourEditorProps) {
  const searchParams = useSearchParams();
  const embedMode = searchParams.get("embed") === "1";
  const [draft, setDraft] = useState<TourDraft | null>(null);
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  const [selectedSceneIds, setSelectedSceneIds] = useState<string[]>([]);
  const selectionAnchorRef = useRef<string | null>(null);
  const [addHotspotMode, setAddHotspotMode] = useState(false);
  const [defaultTargetSceneId, setDefaultTargetSceneId] = useState<string | null>(
    null
  );
  const [uploadingSceneId, setUploadingSceneId] = useState<string | null>(null);
  const [isBatchUploading, setIsBatchUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publishMsg, setPublishMsg] = useState<string | null>(null);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewportDropHover, setViewportDropHover] = useState(false);
  const [viewerApi, setViewerApi] = useState<ViewerApi | null>(null);
  const viewportDragDepth = useRef(0);

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch(`/api/tours/${tourId}`);
    if (!res.ok) {
      setError("Tour not found");
      return;
    }
    const data: TourDraft = await res.json();
    setDraft(data);
    setActiveSceneId((current) => {
      if (data.scenes.length === 0) return null;
      if (current && data.scenes.some((s) => s.id === current)) return current;
      const firstWithImage = data.scenes.find((s) => s.image_path);
      return firstWithImage?.id ?? data.scenes[0].id;
    });
    const validIds = new Set(data.scenes.map((s) => s.id));
    setSelectedSceneIds((prev) => prev.filter((id) => validIds.has(id)));
  }, [tourId]);

  const orderedSceneIds = useMemo(
    () => sortScenesByOrder(draft?.scenes ?? []).map((s) => s.id),
    [draft?.scenes]
  );

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourId]);

  useEffect(() => {
    if (activeSceneId && selectionAnchorRef.current === null) {
      selectionAnchorRef.current = activeSceneId;
    }
  }, [activeSceneId]);

  const activeScene = draft?.scenes.find((s) => s.id === activeSceneId);

  useEffect(() => {
    setViewerApi(null);
  }, [activeSceneId, activeScene?.image_path]);

  const sceneHotspots =
    draft?.hotspots.filter((h) => h.scene_id === activeSceneId) ?? [];
  const otherScenes =
    draft?.scenes.filter((s) => s.id !== activeSceneId && s.image_path) ?? [];

  const targetSceneName =
    otherScenes.find((s) => s.id === defaultTargetSceneId)?.name ?? null;

  // Auto-pick first linkable scene when only one option
  useEffect(() => {
    if (otherScenes.length === 1 && !defaultTargetSceneId) {
      setDefaultTargetSceneId(otherScenes[0].id);
    }
    if (
      defaultTargetSceneId &&
      !otherScenes.some((s) => s.id === defaultTargetSceneId)
    ) {
      setDefaultTargetSceneId(otherScenes[0]?.id ?? null);
    }
  }, [otherScenes, defaultTargetSceneId]);

  const placementHint =
    addHotspotMode && targetSceneName
      ? `Click the door/walkway in the photo — pin will link to “${targetSceneName}”`
      : addHotspotMode
        ? "Select a target scene in the panel first"
        : null;

  async function updateTourTitle(title: string) {
    await fetch(`/api/tours/${tourId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    load();
  }

  async function addScene(name?: string): Promise<Scene | null> {
    const res = await fetch("/api/scenes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tourId,
        name: name?.trim() || `Scene ${(draft?.scenes.length ?? 0) + 1}`,
      }),
    });
    if (!res.ok) return null;
    const scene: Scene = await res.json();
    return scene;
  }

  async function uploadSceneFile(
    sceneId: string,
    file: File
  ): Promise<{ ok: true; scene: Scene } | { ok: false; error: string }> {
    const fd = new FormData();
    fd.append("sceneId", sceneId);
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return {
        ok: false,
        error: typeof data.error === "string" ? data.error : "Upload failed",
      };
    }
    return { ok: true, scene: await res.json() };
  }

  async function uploadManyFiles(files: File[], targetSceneId?: string) {
    const valid = files.filter(isPanoramaImageFile);
    if (valid.length === 0) {
      setError("No valid 360° images (JPEG, PNG, or WebP, 2:1 ratio)");
      return;
    }

    setIsBatchUploading(true);
    setError(null);
    setPublishMsg(null);

    let sceneCount = draft?.scenes.length ?? 0;
    let replaceSceneId = targetSceneId;
    let okCount = 0;
    let lastSceneId: string | null = null;
    const errors: string[] = [];

    for (const file of valid) {
      let sceneId = replaceSceneId;
      if (!sceneId) {
        const scene = await addScene(sceneNameFromFile(file));
        if (!scene) {
          errors.push(`${file.name}: could not create scene`);
          break;
        }
        sceneId = scene.id;
        sceneCount += 1;
      }

      setUploadingSceneId(sceneId);
      const result = await uploadSceneFile(sceneId, file);
      if (!result.ok) {
        errors.push(`${file.name}: ${result.error}`);
      } else {
        okCount += 1;
        lastSceneId = result.scene.id;
      }
      replaceSceneId = undefined;
    }

    setUploadingSceneId(null);
    setIsBatchUploading(false);

    if (lastSceneId) setActiveSceneId(lastSceneId);
    await load();

    if (okCount > 0) {
      setPublishMsg(
        okCount === 1
          ? "1 panorama uploaded."
          : `${okCount} panoramas uploaded.`
      );
    }
    if (errors.length > 0) {
      setError(errors.slice(0, 3).join(" · ") + (errors.length > 3 ? "…" : ""));
    }
  }

  async function reorderScenes(sceneIds: string[]) {
    setError(null);
    setPublishMsg(null);

    setDraft((d) => {
      if (!d) return d;
      const byId = new Map(d.scenes.map((s) => [s.id, s]));
      const scenes = sceneIds
        .map((id, index) => {
          const scene = byId.get(id);
          return scene ? { ...scene, sort_order: index } : null;
        })
        .filter((s): s is Scene => s !== null);
      return { ...d, scenes };
    });

    const res = await fetch(`/api/tours/${tourId}/scenes/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sceneIds }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(
        typeof data.error === "string" ? data.error : "Failed to reorder scenes"
      );
      await load();
      return;
    }
    await load();
  }

  function handleSceneSelectionClick(
    sceneId: string,
    opts: { shiftKey: boolean; additive: boolean }
  ) {
    setSelectedSceneIds((prev) => {
      const { selectedIds, anchorId } = applySceneSelectionClick({
        sceneId,
        shiftKey: opts.shiftKey,
        additive: opts.additive,
        orderedIds: orderedSceneIds,
        previousIds: prev,
        anchorId: selectionAnchorRef.current,
        fallbackAnchorId: activeSceneId,
      });
      selectionAnchorRef.current = anchorId;
      return selectedIds;
    });
  }

  function selectAllScenes() {
    setSelectedSceneIds(orderedSceneIds);
  }

  function selectSceneForView(sceneId: string) {
    setActiveSceneId(sceneId);
  }

  async function deleteSceneById(id: string): Promise<boolean> {
    const res = await fetch(`/api/scenes/${id}`, { method: "DELETE" });
    if (!res.ok) return false;
    if (activeSceneId === id) {
      setAddHotspotMode(false);
    }
    return true;
  }

  async function deleteScene(id: string) {
    setError(null);
    setPublishMsg(null);
    const label = draft?.scenes.find((s) => s.id === id)?.name ?? "Scene";
    if (!(await deleteSceneById(id))) {
      setError("Failed to delete scene");
      return;
    }
    setSelectedSceneIds((prev) => prev.filter((sid) => sid !== id));
    setPublishMsg(`Scene "${label}" deleted.`);
    await load();
  }

  async function deleteSelectedScenes() {
    const ids = [...selectedSceneIds];
    if (ids.length === 0) return;

    setError(null);
    setPublishMsg(null);
    let ok = 0;
    for (const id of ids) {
      if (await deleteSceneById(id)) ok += 1;
    }
    setSelectedSceneIds([]);
    await load();
    if (ok > 0) {
      setPublishMsg(
        ok === 1 ? "1 scene deleted." : `${ok} scenes deleted.`
      );
    }
    if (ok < ids.length) {
      setError(`Failed to delete ${ids.length - ok} scene(s).`);
    }
  }

  useEffect(() => {
    function isTypingTarget(target: EventTarget | null) {
      const el = target as HTMLElement | null;
      return (
        !!el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.tagName === "SELECT" ||
          el.isContentEditable)
      );
    }

    function onKeyDown(e: KeyboardEvent) {
      if (isTypingTarget(e.target)) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a") {
        if (orderedSceneIds.length === 0) return;
        e.preventDefault();
        setSelectedSceneIds(orderedSceneIds);
        const anchor =
          selectionAnchorRef.current ??
          activeSceneId ??
          orderedSceneIds[0];
        if (anchor) selectionAnchorRef.current = anchor;
        return;
      }

      if (e.key !== "Delete" && e.key !== "Backspace") return;

      if (isBatchUploading || uploadingSceneId) return;

      if (selectedSceneIds.length > 0) {
        e.preventDefault();
        void deleteSelectedScenes();
        return;
      }

      if (activeSceneId) {
        e.preventDefault();
        void deleteScene(activeSceneId);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    activeSceneId,
    selectedSceneIds,
    isBatchUploading,
    uploadingSceneId,
    draft,
    orderedSceneIds,
  ]);

  function updateSceneNameLocal(sceneId: string, name: string) {
    setDraft((d) =>
      d
        ? {
            ...d,
            scenes: d.scenes.map((s) =>
              s.id === sceneId ? { ...s, name } : s
            ),
          }
        : d
    );
  }

  async function saveSceneName(sceneId: string) {
    const scene = draft?.scenes.find((s) => s.id === sceneId);
    if (!scene) return;

    const name = scene.name.trim();
    if (!name) {
      setError("Scene name cannot be empty");
      await load();
      return;
    }

    updateSceneNameLocal(sceneId, name);
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/scenes/${sceneId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(
        typeof data.error === "string" ? data.error : "Failed to save scene name"
      );
      await load();
      return;
    }
    await load();
  }

  function patchSceneLocal(sceneId: string, data: Partial<Scene>) {
    setDraft((d) =>
      d
        ? {
            ...d,
            scenes: d.scenes.map((s) =>
              s.id === sceneId ? { ...s, ...data } : s
            ),
          }
        : d
    );
  }

  async function patchScene(data: Partial<Scene>) {
    if (!activeSceneId) return;

    const payload = { ...data };
    const isLocalPatch =
      payload.default_yaw !== undefined ||
      payload.default_pitch !== undefined ||
      payload.default_zoom !== undefined ||
      payload.default_view_custom !== undefined ||
      payload.pan_enabled !== undefined ||
      payload.pan_keyframes_json !== undefined ||
      payload.pan_speed_rpm !== undefined ||
      payload.pan_segment_ms !== undefined;

    if (isLocalPatch) {
      patchSceneLocal(activeSceneId, payload);
    }

    if (typeof payload.name === "string") {
      const trimmed = payload.name.trim();
      if (!trimmed) {
        setError("Scene name cannot be empty");
        await load();
        return;
      }
      payload.name = trimmed;
      updateSceneNameLocal(activeSceneId, trimmed);
    }

    setSaving(true);
    setError(null);
    const res = await fetch(`/api/scenes/${activeSceneId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(
        typeof err.error === "string" ? err.error : "Failed to save scene settings"
      );
      await load();
      return;
    }
    await load();
  }

  async function placeHotspot(yaw: number, pitch: number) {
    if (!activeSceneId || !defaultTargetSceneId) {
      setError("Select a target scene before placing a hotspot");
      return;
    }
    const res = await fetch("/api/hotspots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sceneId: activeSceneId,
        targetSceneId: defaultTargetSceneId,
        yaw,
        pitch,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed to add hotspot");
      return;
    }
    setError(null);
    setPublishMsg(
      `Hotspot placed → links to “${targetSceneName ?? "scene"}”. Click again to add another, or turn off placement mode.`
    );
    load();
  }

  function startPlacingHotspot() {
    if (!defaultTargetSceneId) {
      setError("Choose which scene this pin should open first.");
      return;
    }
    if (otherScenes.length === 0) {
      setError("Upload at least two scenes with 360° images before adding hotspots.");
      return;
    }
    setError(null);
    setPublishMsg(null);
    setAddHotspotMode(true);
  }

  async function updateHotspotTarget(hotspotId: string, targetSceneId: string) {
    await fetch(`/api/hotspots/${hotspotId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetSceneId }),
    });
    load();
  }

  async function deleteHotspot(id: string) {
    await fetch(`/api/hotspots/${id}`, { method: "DELETE" });
    load();
  }

  async function publish() {
    setPublishMsg(null);
    setError(null);
    const res = await fetch(`/api/tours/${tourId}/publish`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Publish failed");
      return;
    }
    const publicUrl = getPublicTourUrl(tourId, embedMode);
    if (embedMode) {
      setPublishedUrl(publicUrl);
      let delivered = false;
      try {
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage(
            { type: VRGEORGIA_TOUR_MESSAGE, url: publicUrl, tourId },
            "*"
          );
          delivered = true;
        }
      } catch {
        /* ignore */
      }
      setPublishMsg(
        delivered
          ? "გამოქვეყნდა! ტურის ბმული გაიგზავნა VR Georgia-ში — დაბრუნდით ატვირთვის ტაბში."
          : "გამოქვეყნდა! დააკოპირეთ ქვემოთ მოცემული ბმული და ჩასვით VR Georgia-ს ატვირთვაში."
      );
    } else {
      setPublishMsg(`Published! Public link: /v/${tourId}`);
    }
    load();
  }

  async function copyPublishedLink() {
    if (!publishedUrl) return;
    try {
      await navigator.clipboard.writeText(publishedUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  function copyPublicLink() {
    const url = `${window.location.origin}/v/${tourId}`;
    navigator.clipboard.writeText(url);
    setPublishMsg("Link copied to clipboard");
  }

  if (!draft) {
    return (
      <div className="flex h-screen items-center justify-center text-zinc-500">
        {error || "Loading tour…"}
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      <header className="flex shrink-0 items-center gap-3 border-b border-zinc-800 bg-zinc-900 px-4 py-2">
        {!embedMode && (
          <Link href="/" className="text-sm text-zinc-400 hover:text-white">
            ← Tours
          </Link>
        )}
        {embedMode && (
          <span className="text-sm font-medium text-amber-400">VR Georgia · 360° ტური</span>
        )}
        <input
          type="text"
          value={draft.tour.title}
          onChange={(e) =>
            setDraft({ ...draft, tour: { ...draft.tour, title: e.target.value } })
          }
          onBlur={(e) => updateTourTitle(e.target.value)}
          className="min-w-0 flex-1 rounded bg-zinc-800 px-3 py-1.5 text-lg font-semibold outline-none focus:ring-1 focus:ring-blue-500"
        />
        <Link
          href={`/tours/${tourId}/preview`}
          className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-800"
        >
          Preview draft
        </Link>
        <button
          type="button"
          onClick={publish}
          className="rounded-lg bg-green-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-600"
        >
          {draft.tour.published_at ? "Re-publish" : "Publish"}
        </button>
        {draft.tour.published_at && (
          <button
            type="button"
            onClick={copyPublicLink}
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-800"
          >
            Copy public link
          </button>
        )}
      </header>

      {(error || publishMsg) && (
        <div
          className={`shrink-0 px-4 py-2 text-sm ${
            error ? "bg-red-950/80 text-red-200" : "bg-green-950/80 text-green-200"
          }`}
        >
          {error || publishMsg}
        </div>
      )}

      {embedMode && publishedUrl && (
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-zinc-800 bg-zinc-900 px-4 py-2">
          <span className="text-xs text-zinc-400">ტურის ბმული:</span>
          <code className="min-w-0 flex-1 truncate rounded bg-zinc-950 px-2 py-1 text-xs text-amber-300">
            {publishedUrl}
          </code>
          <button
            type="button"
            onClick={copyPublishedLink}
            className="shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500"
          >
            {linkCopied ? "✓ დაკოპირდა" : "ბმულის კოპირება"}
          </button>
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <SceneSidebar
          scenes={draft.scenes}
          activeSceneId={activeSceneId}
          selectedSceneIds={selectedSceneIds}
          onSelect={selectSceneForView}
          onSceneSelect={handleSceneSelectionClick}
          onDelete={deleteScene}
          onUploadFiles={uploadManyFiles}
          onReorder={reorderScenes}
          onNameChange={updateSceneNameLocal}
          onNameSave={saveSceneName}
          uploadingSceneId={uploadingSceneId}
          isUploading={isBatchUploading}
        />

        <div
          className="relative min-w-0 flex-1"
          onDragEnter={(e) => {
            if (addHotspotMode || uploadingSceneId || isBatchUploading) return;
            if (!hasPanoramaImageInDataTransfer(e.dataTransfer)) return;
            e.preventDefault();
            viewportDragDepth.current += 1;
            setViewportDropHover(true);
          }}
          onDragOver={(e) => {
            if (addHotspotMode || uploadingSceneId || isBatchUploading)
              return;
            if (!hasPanoramaImageInDataTransfer(e.dataTransfer)) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
          }}
          onDragLeave={() => {
            viewportDragDepth.current = Math.max(0, viewportDragDepth.current - 1);
            if (viewportDragDepth.current === 0) setViewportDropHover(false);
          }}
          onDrop={(e) => {
            viewportDragDepth.current = 0;
            setViewportDropHover(false);
            if (addHotspotMode || uploadingSceneId || isBatchUploading) return;
            e.preventDefault();
            const files = getImageFilesFromDataTransfer(e.dataTransfer);
            if (files.length === 0) return;
            void uploadManyFiles(files, activeSceneId ?? undefined);
          }}
        >
          {viewportDropHover && !addHotspotMode && (
            <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center border-2 border-dashed border-blue-400 bg-blue-950/50 p-6 text-center">
              <p className="text-lg font-medium text-blue-100">
                Drop 360° photo(s) here
              </p>
              <p className="mt-2 text-sm text-blue-200/80">
                {activeScene
                  ? `First updates “${activeScene.name}”, rest become new scenes`
                  : "Each file becomes a scene"}
              </p>
            </div>
          )}
          {activeScene?.image_path ? (
            <PanoramaViewer
              scenes={draft.scenes}
              hotspots={draft.hotspots}
              activeSceneId={activeSceneId}
              mode="edit"
              addHotspotMode={addHotspotMode}
              placementHint={placementHint}
              onPlaceHotspot={placeHotspot}
              onViewerReady={setViewerApi}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-zinc-500">
              {activeScene ? (
                <>
                  <p>Upload or drag a 360° equirectangular image (2:1)</p>
                  <p className="text-xs text-zinc-600">
                    Drop onto this area or onto the scene thumbnail
                  </p>
                </>
              ) : (
                <p>Select a scene, or drag a photo into the sidebar</p>
              )}
            </div>
          )}
        </div>

        <aside className="w-80 shrink-0 overflow-y-auto border-l border-zinc-800 bg-zinc-900 p-4">
          {!activeScene ? (
            <p className="text-sm text-zinc-500">Select a scene</p>
          ) : (
            <>
              <h3 className="font-semibold">Scene settings</h3>
              <label className="mt-3 block text-xs text-zinc-400">Scene name</label>
              <input
                type="text"
                value={activeScene.name}
                placeholder="e.g. Entrance, Kitchen…"
                onChange={(e) =>
                  updateSceneNameLocal(activeScene.id, e.target.value)
                }
                onBlur={() => saveSceneName(activeScene.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                className="mt-1 w-full rounded bg-zinc-800 px-2 py-1.5 text-sm focus:ring-1 focus:ring-blue-500"
              />
              <p className="mt-1 text-[10px] text-zinc-600">
                Press Enter or click away to save
              </p>

              <button
                type="button"
                onClick={() => deleteScene(activeScene.id)}
                className="mt-4 w-full rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-300 hover:bg-red-950/70"
              >
                Delete scene
              </button>

              <div className="mt-4">
                <SceneSettingsPanel
                  scene={activeScene}
                  onPatch={(data) => patchScene(data)}
                  viewerApi={viewerApi}
                  viewerReady={viewerApi !== null}
                />
              </div>

              <hr className="my-6 border-zinc-800" />

              {otherScenes.length === 0 && (
                <p className="mt-3 rounded-lg bg-zinc-800/80 px-3 py-2 text-xs text-amber-200/90">
                  Add another scene with an uploaded panorama to create links between
                  rooms.
                </p>
              )}

              <select
                value={defaultTargetSceneId ?? ""}
                onChange={(e) => setDefaultTargetSceneId(e.target.value || null)}
                disabled={otherScenes.length === 0}
                className="mt-4 w-full rounded bg-zinc-800 px-2 py-1.5 text-sm disabled:opacity-50"
              >
                <option value="">— Select scene —</option>
                {otherScenes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>

              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={startPlacingHotspot}
                  disabled={!defaultTargetSceneId || otherScenes.length === 0}
                  className={`flex-1 rounded px-2 py-2 text-sm font-medium ${
                    addHotspotMode
                      ? "bg-amber-500 text-black ring-2 ring-amber-300"
                      : "bg-blue-600 text-white hover:bg-blue-500"
                  } disabled:opacity-40`}
                >
                  {addHotspotMode ? "Placing pin…" : "Place pin on photo"}
                </button>
                {addHotspotMode && (
                  <button
                    type="button"
                    onClick={() => setAddHotspotMode(false)}
                    className="rounded border border-zinc-600 px-3 py-2 text-sm hover:bg-zinc-800"
                  >
                    Done
                  </button>
                )}
              </div>

              {sceneHotspots.length > 0 && (
                <p className="mt-2 text-xs text-zinc-500">
                  Yellow pins on the preview = this scene. Blue pins appear in tour
                  preview.
                </p>
              )}

              <ul className="mt-4 space-y-2">
                {sceneHotspots.length === 0 && (
                  <li className="text-xs text-zinc-500">No hotspots on this scene</li>
                )}
                {sceneHotspots.map((h) => {
                  const targetName =
                    draft.scenes.find((s) => s.id === h.target_scene_id)?.name ??
                    "Scene";
                  return (
                    <li
                      key={h.id}
                      className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-2"
                    >
                      <div className="mb-2 flex items-center gap-2 text-xs">
                        <span
                          className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white"
                          aria-hidden
                        >
                          ↓
                        </span>
                        <span className="font-medium text-zinc-200">
                          → {targetName}
                        </span>
                      </div>
                      <label className="text-xs text-zinc-500">Opens scene</label>
                      <select
                        value={h.target_scene_id}
                        onChange={(e) =>
                          updateHotspotTarget(h.id, e.target.value)
                        }
                        className="mt-1 w-full rounded bg-zinc-900 px-2 py-1 text-xs"
                      >
                        {draft.scenes
                          .filter((s) => s.id !== activeSceneId && s.image_path)
                          .map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => deleteHotspot(h.id)}
                        className="mt-2 text-xs text-red-400 hover:underline"
                      >
                        Remove pin
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
