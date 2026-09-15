"use client";

import { useEffect, useMemo, useRef } from "react";
import { Viewer } from "@photo-sphere-viewer/core";
import { MarkersPlugin } from "@photo-sphere-viewer/markers-plugin";
import { VirtualTourPlugin } from "@photo-sphere-viewer/virtual-tour-plugin";
import "@photo-sphere-viewer/core/index.css";
import "@photo-sphere-viewer/markers-plugin/index.css";
import "@photo-sphere-viewer/virtual-tour-plugin/index.css";
import { getNextSceneId } from "@/lib/scene-nav";
import { sceneOrderKey, tourViewerKey } from "@/lib/scene-reorder";
import {
  getSceneEntryView,
  getViewerLimits,
  isPanningActive,
  parsePanKeyframes,
} from "@/lib/scene-settings";
import { preloadPanoramas } from "@/lib/panorama-preload";
import type { Hotspot, Scene } from "@/lib/types";
import { resolvePanoramaUrl } from "@/lib/tourApi";
import { buildViewerNodes, sceneMarkers } from "@/lib/viewer-utils";

export type ViewerMode = "edit" | "navigate";

const SCENE_TRANSITION = {
  showLoader: false,
  effect: "fade" as const,
  rotation: false,
  speed: 700,
};

/** VirtualTour / setPanorama options: fade in already looking at the pan start. */
function transitionToSceneEntry(scene: Scene) {
  const entry = getSceneEntryView(scene);
  return {
    ...SCENE_TRANSITION,
    rotateTo: { yaw: entry.yaw, pitch: entry.pitch },
    zoomTo: entry.zoom,
  };
}

type PanController = { token: number; active: boolean; raf: number };

export interface PanoramaViewerProps {
  scenes: Scene[];
  hotspots: Hotspot[];
  activeSceneId: string | null;
  mode: ViewerMode;
  addHotspotMode?: boolean;
  placementHint?: string | null;
  navigateToSceneId?: string | null;
  clickToAdvance?: boolean;
  /** Called when a scene finishes one panning pass (auto-advance). */
  onPanComplete?: (sceneId: string) => void;
  onActiveSceneChange?: (sceneId: string) => void;
  onSceneChange?: (sceneId: string) => void;
  onPlaceHotspot?: (yaw: number, pitch: number) => void;
  onViewerReady?: (api: ViewerApi) => void;
  className?: string;
}

export interface ViewerApi {
  getPosition: () => { yaw: number; pitch: number; zoom: number };
  goToView: (yaw: number, pitch: number, zoom: number) => void;
  /** panning-áƒ˜áƒ¡ áƒ’áƒáƒ¨áƒ•áƒ”áƒ‘áƒ áƒ›áƒ˜áƒ›áƒ“áƒ˜áƒœáƒáƒ áƒ” áƒ¡áƒªáƒ”áƒœáƒ˜áƒ¡ áƒžáƒáƒ áƒáƒ›áƒ”áƒ¢áƒ áƒ”áƒ‘áƒ˜áƒ— (preview) */
  startPan: () => void;
  /** panning-áƒ˜áƒ¡ áƒ’áƒáƒ©áƒ”áƒ áƒ”áƒ‘áƒ */
  stopPan: () => void;
}

export function PanoramaViewer({
  scenes,
  hotspots,
  activeSceneId,
  mode,
  addHotspotMode = false,
  placementHint = null,
  navigateToSceneId = null,
  clickToAdvance = false,
  onPanComplete,
  onActiveSceneChange,
  onSceneChange,
  onPlaceHotspot,
  onViewerReady,
  className = "",
}: PanoramaViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const pluginsRef = useRef<{
    markers?: MarkersPlugin;
    vt?: VirtualTourPlugin;
  }>({});
  const currentSceneIdRef = useRef<string | null>(null);
  const currentPanoramaRef = useRef<string | null>(null);
  const viewerReadyRef = useRef(false);
  const vtNodesKeyRef = useRef<string | null>(null);
  const clampCleanupRef = useRef<(() => void) | null>(null);
  const panRef = useRef<PanController>({ token: 0, active: false, raf: 0 });
  /** After auto-advance, start panning on the next scene in edit mode too. */
  const chainPanRef = useRef(false);

  const scenesRef = useRef(scenes);
  const hotspotsRef = useRef(hotspots);
  const modeRef = useRef(mode);
  const addHotspotRef = useRef(addHotspotMode);
  const clickToAdvanceRef = useRef(clickToAdvance);
  const onPlaceRef = useRef(onPlaceHotspot);
  const onSceneChangeRef = useRef(onSceneChange ?? onActiveSceneChange);
  const onPanCompleteRef = useRef(onPanComplete);
  const navigateToSceneIdRef = useRef(navigateToSceneId);

  scenesRef.current = scenes;
  navigateToSceneIdRef.current = navigateToSceneId;
  hotspotsRef.current = hotspots;
  modeRef.current = mode;
  addHotspotRef.current = addHotspotMode;
  clickToAdvanceRef.current = clickToAdvance;
  onPlaceRef.current = onPlaceHotspot;
  onSceneChangeRef.current = onSceneChange ?? onActiveSceneChange;
  onPanCompleteRef.current = onPanComplete;

  const activeScene = scenes.find((s) => s.id === activeSceneId);

  const tourKey = useMemo(() => tourViewerKey(scenes, mode), [scenes, mode]);
  const orderKey = useMemo(() => sceneOrderKey(scenes), [scenes]);

  useEffect(() => {
    const urls = scenes
      .map((s) => s.image_path)
      .filter((u): u is string => Boolean(u))
      .map((u) => resolvePanoramaUrl(u));
    preloadPanoramas(urls);
  }, [tourKey, scenes]);

  // Create viewer once per tour structure â€” scene switches must NOT destroy it
  // (that caused pan to start, stop, and restart on every photo).
  useEffect(() => {
    if (!containerRef.current || !activeScene?.image_path) return;

    const isNavigate = mode === "navigate";
    const nodes = buildViewerNodes(scenes);
    const useVirtualTour = isNavigate && nodes.length > 1;
    const limits = getViewerLimits(activeScene);
    const startPanoramaUrl = resolvePanoramaUrl(activeScene.image_path);

    if (viewerRef.current) {
      try {
        viewerRef.current.destroy();
      } catch {
        /* ignore */
      }
      viewerRef.current = null;
      pluginsRef.current = {};
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const plugins: any[] = [
      [MarkersPlugin, { clickEventOnMarker: true }],
    ];

    if (useVirtualTour) {
      plugins.push([
        VirtualTourPlugin,
        {
          preload: true,
          // Land each node on its pan-start view (not a random leftover angle).
          transitionOptions: (toNode: { id: string }) => {
            const scene = scenesRef.current.find((s) => s.id === toNode.id);
            return scene ? transitionToSceneEntry(scene) : SCENE_TRANSITION;
          },
        },
      ]);
    }

    const entry = getSceneEntryView(activeScene);
    const viewer = new Viewer({
      container: containerRef.current,
      panorama: startPanoramaUrl,
      defaultYaw: entry.yaw,
      defaultPitch: entry.pitch,
      defaultZoomLvl: entry.zoom,
      minFov: limits.minFov,
      maxFov: limits.maxFov,
      navbar: false,
      caption: undefined,
      plugins,
      mousemove: true,
      mousewheel: true,
      loadingTxt: "",
    });

    viewerRef.current = viewer;
    currentPanoramaRef.current = activeScene.image_path;
    currentSceneIdRef.current = activeScene.id;

    const markers = viewer.getPlugin(MarkersPlugin) as MarkersPlugin;
    pluginsRef.current = { markers };

    if (useVirtualTour) {
      const vt = viewer.getPlugin(VirtualTourPlugin) as VirtualTourPlugin;
      pluginsRef.current.vt = vt;

      vt.addEventListener("node-changed", (e: { node: { id: string } }) => {
        const sceneId = e.node.id;
        const prevId = currentSceneIdRef.current;
        currentSceneIdRef.current = sceneId;
        const scene = scenesRef.current.find((s) => s.id === sceneId);
        if (scene?.image_path) {
          currentPanoramaRef.current = scene.image_path;
        }
        onSceneChangeRef.current?.(sceneId);
        if (!scene) return;

        applyViewerLimits(viewer, scene, clampCleanupRef);
        syncMarkers(markers, sceneId);

        // Same node while already panning â€” ignore duplicate setNodes events.
        if (prevId === sceneId && panRef.current.active) return;

        stopPanLoop(viewer, panRef);
        applySceneEntry(viewer, scene, panRef, true, (id) => {
          chainPanRef.current = true;
          onPanCompleteRef.current?.(id);
        });
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onMarkerSelect = (e: any) => {
      const targetId = e?.marker?.data?.targetSceneId as string | undefined;
      if (!targetId) return;
      if (
        modeRef.current === "navigate" &&
        viewerReadyRef.current &&
        pluginsRef.current.vt
      ) {
        try {
          const target = scenesRef.current.find((s) => s.id === targetId);
          pluginsRef.current.vt.setCurrentNode(
            targetId,
            target ? transitionToSceneEntry(target) : SCENE_TRANSITION
          );
        } catch {
          /* plugin not ready */
        }
      }
    };

    markers.addEventListener("select-marker", onMarkerSelect);

    const scheduleResize = () => {
      if (!containerEl) return;
      const { clientWidth: width, clientHeight: height } = containerEl;
      if (width < 1 || height < 1) return;
      try {
        viewer.resize({ width: `${width}px`, height: `${height}px` });
      } catch {
        /* viewer mid-dispose */
      }
    };

    viewer.addEventListener("ready", () => {
      viewerReadyRef.current = true;
      scheduleResize();
      requestAnimationFrame(() => {
        scheduleResize();
        requestAnimationFrame(scheduleResize);
      });
      window.setTimeout(scheduleResize, 120);
      window.setTimeout(scheduleResize, 400);

      const scene =
        scenesRef.current.find(
          (s) => s.id === (currentSceneIdRef.current ?? activeScene.id)
        ) ?? activeScene;

      applyViewerLimits(viewer, scene, clampCleanupRef);

      if (useVirtualTour && pluginsRef.current.vt) {
        const tourNodes = buildViewerNodes(scenesRef.current);
        if (tourNodes.length > 0) {
          const startId =
            currentSceneIdRef.current ??
            activeSceneId ??
            tourNodes[0]?.id;
          pluginsRef.current.vt.setNodes(tourNodes, startId ?? undefined);
          vtNodesKeyRef.current = orderKey;

          const pendingId = navigateToSceneIdRef.current;
          if (
            pendingId &&
            pendingId !== startId &&
            tourNodes.some((n) => n.id === pendingId)
          ) {
            pluginsRef.current.vt.setCurrentNode(
              pendingId,
              (() => {
                const target = scenesRef.current.find((s) => s.id === pendingId);
                return target ? transitionToSceneEntry(target) : SCENE_TRANSITION;
              })()
            );
          } else {
            // setNodes sometimes skips node-changed for the initial node.
            // Start pan once only if nothing else started it.
            window.setTimeout(() => {
              if (
                addHotspotRef.current ||
                modeRef.current !== "navigate" ||
                panRef.current.active
              ) {
                return;
              }
              const s =
                scenesRef.current.find(
                  (sc) =>
                    sc.id === (currentSceneIdRef.current ?? startId ?? scene.id)
                ) ?? scene;
              applySceneEntry(viewer, s, panRef, true, (id) => {
                chainPanRef.current = true;
                onPanCompleteRef.current?.(id);
              });
            }, 80);
          }
        }
      } else if (!addHotspotRef.current) {
        applySceneEntry(
          viewer,
          scene,
          panRef,
          modeRef.current === "navigate",
          (id) => {
            chainPanRef.current = true;
            onPanCompleteRef.current?.(id);
          }
        );
      }

      syncMarkers(markers, scene.id);
      onViewerReady?.({
        getPosition: () => {
          const p = viewer.getPosition();
          const z = viewer.getZoomLevel();
          return { yaw: p.yaw, pitch: p.pitch, zoom: z };
        },
        goToView: (yaw, pitch, zoom) => {
          stopPanLoop(viewer, panRef);
          viewer.stopAnimation();
          void viewer.animate({ yaw, pitch, zoom, speed: "8rpm" });
        },
        startPan: () => {
          const s =
            scenesRef.current.find(
              (sc) => sc.id === (currentSceneIdRef.current ?? activeScene.id)
            ) ?? activeScene;
          const once = Number(s.auto_advance_after_pan) === 1;
          void startPanLoop(viewer, s, panRef, {
            once,
            onComplete: once
              ? () => {
                  chainPanRef.current = true;
                  onPanCompleteRef.current?.(s.id);
                }
              : undefined,
          });
        },
        stopPan: () => stopPanLoop(viewer, panRef),
      });
    });

    const stopPanOnInteract = () => stopPanLoop(viewer, panRef);
    const containerEl = containerRef.current;
    containerEl?.addEventListener("pointerdown", stopPanOnInteract);
    containerEl?.addEventListener("wheel", stopPanOnInteract, { passive: true });

    viewer.addEventListener("click", ({ data }) => {
      if (!data || data.rightclick) return;
      if (data.marker) return;

      if (modeRef.current === "edit" && addHotspotRef.current) {
        onPlaceRef.current?.(data.yaw, data.pitch);
        return;
      }

      if (modeRef.current === "navigate" && clickToAdvanceRef.current) {
        const current = currentSceneIdRef.current;
        const next = getNextSceneId(scenesRef.current, current);
        if (
          next &&
          viewerReadyRef.current &&
          pluginsRef.current.vt &&
          next !== current
        ) {
          try {
            const target = scenesRef.current.find((s) => s.id === next);
            pluginsRef.current.vt.setCurrentNode(
              next,
              target ? transitionToSceneEntry(target) : SCENE_TRANSITION
            );
          } catch {
            /* plugin not ready */
          }
        }
      }
    });

    const ro =
      typeof ResizeObserver !== "undefined" && containerEl
        ? new ResizeObserver(() => scheduleResize())
        : null;
    ro?.observe(containerEl!);
    window.addEventListener("resize", scheduleResize);

    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", scheduleResize);
      viewerReadyRef.current = false;
      vtNodesKeyRef.current = null;
      clampCleanupRef.current?.();
      clampCleanupRef.current = null;
      panRef.current.active = false;
      panRef.current.token++;
      if (panRef.current.raf) cancelAnimationFrame(panRef.current.raf);
      panRef.current.raf = 0;
      containerEl?.removeEventListener("pointerdown", stopPanOnInteract);
      containerEl?.removeEventListener("wheel", stopPanOnInteract);
      markers.removeEventListener("select-marker", onMarkerSelect);
      pluginsRef.current = {};
      const instance = viewerRef.current;
      viewerRef.current = null;
      currentPanoramaRef.current = null;
      currentSceneIdRef.current = null;
      try {
        instance?.destroy();
      } catch {
        /* viewer may already be torn down */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourKey]);

  // Edit mode: swap panorama without recreating the viewer.
  useEffect(() => {
    if (mode !== "edit") return;
    const viewer = viewerRef.current;
    if (!viewer || !viewerReadyRef.current || !activeScene?.image_path) return;
    if (currentPanoramaRef.current === activeScene.image_path) {
      applyViewerLimits(viewer, activeScene, clampCleanupRef);
      return;
    }

    const url = resolvePanoramaUrl(activeScene.image_path);
    const scene = activeScene;
    const entry = getSceneEntryView(scene);
    viewer
      .setPanorama(url, {
        caption: scene.name,
        showLoader: false,
        position: { yaw: entry.yaw, pitch: entry.pitch },
        zoom: entry.zoom,
        transition: {
          effect: "fade",
          rotation: false,
          speed: 700,
        },
      })
      .then(() => {
        if (viewerRef.current !== viewer) return;
        currentPanoramaRef.current = scene.image_path;
        currentSceneIdRef.current = scene.id;
        const markers = pluginsRef.current.markers;
        applyViewerLimits(viewer, scene, clampCleanupRef);
        if (markers) syncMarkers(markers, scene.id);
        stopPanLoop(viewer, panRef);
        if (!addHotspotRef.current) {
          const chain = chainPanRef.current;
          chainPanRef.current = false;
          applySceneEntry(viewer, scene, panRef, chain, (id) => {
            chainPanRef.current = true;
            onPanCompleteRef.current?.(id);
          });
        }
      })
      .catch(() => {
        /* panorama swap aborted */
      });
  }, [mode, activeSceneId, activeScene?.image_path]);

  useEffect(() => {
    if (mode !== "navigate" || !viewerReadyRef.current) return;
    const vt = pluginsRef.current.vt;
    if (!vt) return;
    if (vtNodesKeyRef.current === orderKey) return;

    const nodes = buildViewerNodes(scenes);
    if (nodes.length === 0) return;
    const startId =
      currentSceneIdRef.current ?? activeSceneId ?? nodes[0]?.id;
    try {
      vt.setNodes(nodes, startId);
      vtNodesKeyRef.current = orderKey;
    } catch {
      /* ignore if plugin is mid-dispose */
    }
  }, [orderKey, mode, scenes, activeSceneId]);

  useEffect(() => {
    if (mode !== "navigate" || !navigateToSceneId || !viewerReadyRef.current) {
      return;
    }
    const vt = pluginsRef.current.vt;
    if (!vt || currentSceneIdRef.current === navigateToSceneId) return;
    try {
      const target = scenesRef.current.find((s) => s.id === navigateToSceneId);
      vt.setCurrentNode(
        navigateToSceneId,
        target ? transitionToSceneEntry(target) : SCENE_TRANSITION
      );
    } catch {
      /* plugin not ready */
    }
  }, [navigateToSceneId, mode]);

  useEffect(() => {
    const markers = pluginsRef.current.markers;
    const sceneId = currentSceneIdRef.current ?? activeSceneId;
    if (!markers || !sceneId) return;
    syncMarkers(markers, sceneId);
  }, [hotspots, activeSceneId, mode, addHotspotMode, scenes]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || mode !== "edit" || !activeScene) return;
    applyViewerLimits(viewer, activeScene, clampCleanupRef);
  }, [
    mode,
    activeScene?.min_fov,
    activeScene?.max_fov,
    activeScene?.min_pitch,
    activeScene?.max_pitch,
    activeScene?.min_yaw,
    activeScene?.max_yaw,
  ]);

  // áƒ áƒ”áƒ“áƒáƒ¥áƒ¢áƒ˜áƒ áƒ”áƒ‘áƒ˜áƒ¡ áƒ áƒ”áƒŸáƒ˜áƒ›áƒ¨áƒ˜ panning áƒžáƒáƒ áƒáƒ›áƒ”áƒ¢áƒ áƒ”áƒ‘áƒ˜áƒ¡ áƒ¨áƒ”áƒªáƒ•áƒšáƒ˜áƒ¡áƒáƒ¡ áƒ•áƒáƒ©áƒ”áƒ áƒ”áƒ‘áƒ— áƒ›áƒ˜áƒ›áƒ“áƒ˜áƒœáƒáƒ áƒ”
  // preview-áƒ¡, áƒ áƒáƒ› áƒ¬áƒ”áƒ áƒ¢áƒ˜áƒšáƒ”áƒ‘áƒ˜áƒ¡ áƒ“áƒáƒ›áƒáƒ¢áƒ”áƒ‘áƒ/áƒ áƒ”áƒ“áƒáƒ¥áƒ¢áƒ˜áƒ áƒ”áƒ‘áƒ áƒ›áƒ¨áƒ•áƒ˜áƒ“áƒáƒ“ áƒ›áƒáƒ®áƒ“áƒ”áƒ¡.
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || mode !== "edit") return;
    if (chainPanRef.current || panRef.current.active) return;
    stopPanLoop(viewer, panRef);
  }, [
    mode,
    addHotspotMode,
    activeScene?.pan_enabled,
    activeScene?.pan_keyframes_json,
    activeScene?.pan_speed_rpm,
    activeScene?.auto_advance_after_pan,
  ]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !activeScene || mode !== "edit") return;
    if (addHotspotMode) return;
    if (chainPanRef.current || panRef.current.active) return;
    stopPanLoop(viewer, panRef);
    applySceneEntry(viewer, activeScene, panRef, false);
  }, [
    mode,
    addHotspotMode,
    activeScene?.default_yaw,
    activeScene?.default_pitch,
    activeScene?.default_zoom,
    activeScene?.default_view_custom,
  ]);

  function syncMarkers(markers: MarkersPlugin, sceneId: string) {
    const editable = modeRef.current === "edit";
    const hotspotList = sceneMarkers(
      hotspotsRef.current,
      sceneId,
      editable,
      new Map(scenesRef.current.map((s) => [s.id, s.name]))
    );
    markers.setMarkers(hotspotList);
  }

  return (
    <div
      className={`relative h-full w-full ${className || "bg-zinc-950"}`}
    >
      <div
        ref={containerRef}
        className={`h-full w-full ${addHotspotMode ? "tour-viewer--placing" : ""} ${clickToAdvance && mode === "navigate" ? "tour-viewer--advance" : ""}`}
      />
      {addHotspotMode && placementHint && (
        <div className="pointer-events-none absolute inset-x-0 top-4 z-20 flex justify-center px-4">
          <div className="max-w-lg rounded-xl bg-amber-500 px-4 py-3 text-center text-sm font-medium text-black shadow-lg">
            {placementHint}
          </div>
        </div>
      )}
    </div>
  );
}

function applyViewerLimits(
  viewer: Viewer,
  scene: Scene,
  clampCleanupRef?: { current: (() => void) | null }
) {
  const limits = getViewerLimits(scene);
  viewer.setOptions({
    minFov: limits.minFov,
    maxFov: limits.maxFov,
  });
  if (clampCleanupRef) {
    clampCleanupRef.current?.();
    clampCleanupRef.current = null;
  }
}

/** Enter a scene: snap to pan-start view, then auto-pan when requested. */
function applySceneEntry(
  viewer: Viewer,
  scene: Scene,
  panRef: { current: PanController },
  autoPan: boolean,
  onPanComplete?: (sceneId: string) => void
) {
  viewer.stopAnimation();
  stopPanLoop(viewer, panRef);
  const entry = getSceneEntryView(scene);
  try {
    viewer.rotate({ yaw: entry.yaw, pitch: entry.pitch });
    viewer.zoom(entry.zoom);
  } catch {
    /* viewer may be mid-dispose */
  }
  if (autoPan && isPanningActive(scene)) {
    const once = Number(scene.auto_advance_after_pan) === 1;
    void startPanLoop(viewer, scene, panRef, {
      once,
      onComplete: once
        ? () => {
            onPanComplete?.(scene.id);
          }
        : undefined,
    });
  }
}

/** Stop the current panning loop */
function stopPanLoop(viewer: Viewer, panRef: { current: PanController }) {
  panRef.current.active = false;
  panRef.current.token++;
  if (panRef.current.raf) {
    cancelAnimationFrame(panRef.current.raf);
    panRef.current.raf = 0;
  }
  try {
    viewer.stopAnimation();
  } catch {
    /* viewer may be mid-dispose */
  }
}

/** Shortest yaw delta in (-pi..pi), with wrap-around */
function shortestAngle(from: number, to: number): number {
  const TWO_PI = Math.PI * 2;
  let d = (to - from) % TWO_PI;
  if (d > Math.PI) d -= TWO_PI;
  if (d < -Math.PI) d += TWO_PI;
  return d;
}

/**
 * Panning loop: default view -> point 1 -> point 2 -> ...
 * once=false: loops back to start within the scene.
 * once=true: one pass to the last point, then onComplete (next scene).
 */
function startPanLoop(
  viewer: Viewer,
  scene: Scene,
  panRef: { current: PanController },
  options?: { once?: boolean; onComplete?: () => void }
) {
  const keyframes = parsePanKeyframes(scene);
  if ((scene.pan_enabled ?? 0) !== 1 || keyframes.length === 0) return;

  stopPanLoop(viewer, panRef);
  const token = panRef.current.token;
  panRef.current.active = true;
  const once = options?.once === true;

  const waypoints: { yaw: number; pitch: number; zoom: number }[] = [];
  if (scene.default_view_custom === 1) {
    waypoints.push({
      yaw: scene.default_yaw,
      pitch: scene.default_pitch,
      zoom: scene.default_zoom,
    });
  }
  for (const kf of keyframes) {
    waypoints.push({ yaw: kf.yaw, pitch: kf.pitch, zoom: kf.zoom });
  }

  if (waypoints.length < 2) {
    try {
      viewer.rotate({ yaw: waypoints[0].yaw, pitch: waypoints[0].pitch });
      viewer.zoom(waypoints[0].zoom);
    } catch {
      /* ignore */
    }
    if (once) {
      panRef.current.active = false;
      options?.onComplete?.();
    }
    return;
  }

  const path = once ? [...waypoints] : [...waypoints, waypoints[0]];

  const segments = path.slice(0, -1).map((a, i) => {
    const b = path[i + 1];
    const dyaw = shortestAngle(a.yaw, b.yaw);
    const dpitch = b.pitch - a.pitch;
    const len = Math.hypot(dyaw, dpitch);
    return { a, b, dyaw, dpitch, dzoom: b.zoom - a.zoom, len };
  });

  const rpm = scene.pan_speed_rpm && scene.pan_speed_rpm > 0 ? scene.pan_speed_rpm : 1;
  const radPerMs = (rpm * 2 * Math.PI) / 60000;

  try {
    viewer.rotate({ yaw: path[0].yaw, pitch: path[0].pitch });
    viewer.zoom(path[0].zoom);
  } catch {
    /* ignore */
  }

  let seg = 0;
  let segProgress = 0;
  let lastZoom = path[0].zoom;
  let lastTime = performance.now();
  let finished = false;

  const finishOnce = () => {
    if (finished) return;
    finished = true;
    panRef.current.active = false;
    const last = path[path.length - 1];
    try {
      viewer.rotate({ yaw: last.yaw, pitch: last.pitch });
      viewer.zoom(last.zoom);
    } catch {
      /* ignore */
    }
    options?.onComplete?.();
  };

  const step = (now: number) => {
    if (!panRef.current.active || token !== panRef.current.token) return;
    const dt = now - lastTime;
    lastTime = now;

    let advance = radPerMs * dt;
  let guard = 0;
  while (advance > 0 && guard < segments.length + 2) {
    const s = segments[seg];
    if (s.len <= 1e-6) {
      if (once && seg >= segments.length - 1) {
        finishOnce();
        return;
      }
      if (once) {
        seg += 1;
        if (seg >= segments.length) {
          finishOnce();
          return;
        }
      } else {
        seg = (seg + 1) % segments.length;
      }
      segProgress = 0;
      guard++;
      continue;
    }
    const remaining = s.len - segProgress;
    if (advance < remaining) {
      segProgress += advance;
      advance = 0;
    } else {
      advance -= remaining;
      if (once && seg >= segments.length - 1) {
        finishOnce();
        return;
      }
      if (once) {
        seg += 1;
        if (seg >= segments.length) {
          finishOnce();
          return;
        }
      } else {
        seg = (seg + 1) % segments.length;
      }
      segProgress = 0;
    }
    guard++;
  }

  const s = segments[seg];
  const t = s.len > 1e-6 ? segProgress / s.len : 0;
  const yaw = s.a.yaw + s.dyaw * t;
  const pitch = s.a.pitch + s.dpitch * t;
  const zoom = s.a.zoom + s.dzoom * t;
  try {
    viewer.rotate({ yaw, pitch });
    if (Math.abs(zoom - lastZoom) > 0.05) {
      viewer.zoom(zoom);
      lastZoom = zoom;
    }
  } catch {
    /* viewer disposed */
  }

  panRef.current.raf = requestAnimationFrame(step);
};

  panRef.current.raf = requestAnimationFrame(step);
}
