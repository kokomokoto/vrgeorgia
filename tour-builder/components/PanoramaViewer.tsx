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
  applyDefaultView,
  getViewerLimits,
  isPanningActive,
  parsePanKeyframes,
} from "@/lib/scene-settings";
import { preloadPanoramas } from "@/lib/panorama-preload";
import type { Hotspot, Scene } from "@/lib/types";
import { buildViewerNodes, sceneMarkers } from "@/lib/viewer-utils";

export type ViewerMode = "edit" | "navigate";

const FAST_TRANSITION = {
  showLoader: false,
  effect: "fade" as const,
  rotation: false,
  speed: 350,
};

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
  onActiveSceneChange?: (sceneId: string) => void;
  onSceneChange?: (sceneId: string) => void;
  onPlaceHotspot?: (yaw: number, pitch: number) => void;
  onViewerReady?: (api: ViewerApi) => void;
  className?: string;
}

export interface ViewerApi {
  getPosition: () => { yaw: number; pitch: number; zoom: number };
  goToView: (yaw: number, pitch: number, zoom: number) => void;
  /** panning-ის გაშვება მიმდინარე სცენის პარამეტრებით (preview) */
  startPan: () => void;
  /** panning-ის გაჩერება */
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

  const scenesRef = useRef(scenes);
  const hotspotsRef = useRef(hotspots);
  const modeRef = useRef(mode);
  const addHotspotRef = useRef(addHotspotMode);
  const clickToAdvanceRef = useRef(clickToAdvance);
  const onPlaceRef = useRef(onPlaceHotspot);
  const onSceneChangeRef = useRef(onSceneChange ?? onActiveSceneChange);
  const navigateToSceneIdRef = useRef(navigateToSceneId);

  scenesRef.current = scenes;
  navigateToSceneIdRef.current = navigateToSceneId;
  hotspotsRef.current = hotspots;
  modeRef.current = mode;
  addHotspotRef.current = addHotspotMode;
  clickToAdvanceRef.current = clickToAdvance;
  onPlaceRef.current = onPlaceHotspot;
  onSceneChangeRef.current = onSceneChange ?? onActiveSceneChange;

  const activeScene = scenes.find((s) => s.id === activeSceneId);

  const tourKey = useMemo(() => tourViewerKey(scenes, mode), [scenes, mode]);
  const orderKey = useMemo(() => sceneOrderKey(scenes), [scenes]);

  useEffect(() => {
    const urls = scenes
      .map((s) => s.image_path)
      .filter((u): u is string => Boolean(u));
    preloadPanoramas(urls);
  }, [tourKey, scenes]);

  useEffect(() => {
    if (!containerRef.current || !activeScene?.image_path) return;

    const isNavigate = mode === "navigate";
    const nodes = buildViewerNodes(scenes);
    // VirtualTour პლაგინი საჭიროა მხოლოდ მაშინ, როცა რამდენიმე სცენაა და
    // მათ შორის ნავიგაციაა საჭირო. ერთსცენიან ტურზე ვაჩვენებთ პანორამას პირდაპირ.
    const useVirtualTour = isNavigate && nodes.length > 1;
    const limits = getViewerLimits(activeScene);

    const existing = viewerRef.current;
    if (
      existing &&
      isNavigate &&
      useVirtualTour &&
      currentPanoramaRef.current &&
      pluginsRef.current.vt
    ) {
      return;
    }

    if (
      existing &&
      isNavigate &&
      !useVirtualTour &&
      currentPanoramaRef.current === activeScene.image_path
    ) {
      applyViewerLimits(existing, activeScene, clampCleanupRef);
      return;
    }

    if (
      existing &&
      !isNavigate &&
      currentPanoramaRef.current === activeScene.image_path
    ) {
      applyViewerLimits(existing, activeScene, clampCleanupRef);
      return;
    }

    if (
      existing &&
      !isNavigate &&
      currentPanoramaRef.current !== activeScene.image_path
    ) {
      existing
        .setPanorama(activeScene.image_path, {
          caption: activeScene.name,
          showLoader: false,
          transition: { effect: "fade", rotation: false, speed: 300 },
        })
        .then(() => {
          currentPanoramaRef.current = activeScene.image_path;
          currentSceneIdRef.current = activeScene.id;
          const markers = pluginsRef.current.markers!;
          applyViewerLimits(existing, activeScene, clampCleanupRef);
          syncMarkers(markers, activeScene.id);
          stopPanLoop(existing, panRef);
          if (!addHotspotRef.current) {
            applySceneEntry(existing, activeScene, panRef, false);
          }
        });
      return;
    }

    if (existing) {
      existing.destroy();
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
          transitionOptions: FAST_TRANSITION,
        },
      ]);
    }

    const viewer = new Viewer({
      container: containerRef.current,
      panorama: activeScene.image_path,
      defaultYaw: activeScene.default_yaw,
      defaultPitch: activeScene.default_pitch,
      defaultZoomLvl: activeScene.default_zoom,
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
        currentSceneIdRef.current = sceneId;
        onSceneChangeRef.current?.(sceneId);
        const scene = scenesRef.current.find((s) => s.id === sceneId);
        if (scene) {
          applyViewerLimits(viewer, scene, clampCleanupRef);
          stopPanLoop(viewer, panRef);
          applySceneEntry(viewer, scene, panRef, true);
          syncMarkers(markers, sceneId);
        }
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
          pluginsRef.current.vt.setCurrentNode(targetId, FAST_TRANSITION);
        } catch {
          /* plugin not ready */
        }
      }
    };

    markers.addEventListener("select-marker", onMarkerSelect);

    viewer.addEventListener("ready", () => {
      viewerReadyRef.current = true;

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
            pendingId !== currentSceneIdRef.current &&
            tourNodes.some((n) => n.id === pendingId)
          ) {
            pluginsRef.current.vt.setCurrentNode(pendingId, FAST_TRANSITION);
          }
        }
      } else if (!addHotspotRef.current) {
        applySceneEntry(viewer, scene, panRef, modeRef.current === "navigate");
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
          void startPanLoop(viewer, s, panRef);
        },
        stopPan: () => stopPanLoop(viewer, panRef),
      });
    });

    // მომხმარებლის ხელით ჩარევისას (გადათრევა/zoom) panning ჩერდება
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
            pluginsRef.current.vt.setCurrentNode(next, FAST_TRANSITION);
          } catch {
            /* plugin not ready */
          }
        }
      }
    });

    return () => {
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
  }, [tourKey, activeScene?.image_path]);

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
      vt.setCurrentNode(navigateToSceneId, FAST_TRANSITION);
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

  // რედაქტირების რეჟიმში panning პარამეტრების შეცვლისას ვაჩერებთ მიმდინარე
  // preview-ს, რომ წერტილების დამატება/რედაქტირება მშვიდად მოხდეს.
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || mode !== "edit") return;
    stopPanLoop(viewer, panRef);
  }, [
    mode,
    addHotspotMode,
    activeScene?.pan_enabled,
    activeScene?.pan_keyframes_json,
    activeScene?.pan_speed_rpm,
  ]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !activeScene || mode !== "edit") return;
    if (addHotspotMode) return;
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
    const scene = scenesRef.current.find((s) => s.id === sceneId);
    markers.setMarkers(hotspotList);
  }

  return (
    <div className={`relative h-full w-full bg-zinc-950 ${className}`}>
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
  // 360°-ით თავისუფალი დატრიალება — pitch/yaw შეზღუდვები მოხსნილია,
  // რომ მომხმარებელმა სრულად დაატრიალოს სურათი ნებისმიერი მიმართულებით.
  if (clampCleanupRef) {
    clampCleanupRef.current?.();
    clampCleanupRef.current = null;
  }
}

/**
 * სცენაში შესვლა: ჯერ ვტვირთავთ default view-ს, შემდეგ (თუ navigate რეჟიმია და
 * panning ჩართულია) ვიწყებთ წერტილებზე მოძრაობას.
 */
function applySceneEntry(
  viewer: Viewer,
  scene: Scene,
  panRef: { current: PanController },
  autoPan: boolean
) {
  viewer.stopAnimation();
  stopPanLoop(viewer, panRef);
  if (scene.default_view_custom === 1) {
    applyDefaultView(viewer, scene);
  }
  if (autoPan && isPanningActive(scene)) {
    void startPanLoop(viewer, scene, panRef);
  }
}

/** მიმდინარე panning loop-ის გაჩერება */
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

/** yaw-ის უმოკლესი კუთხური სხვაობა (-π..π) — wrap-around-ის გათვალისწინებით */
function shortestAngle(from: number, to: number): number {
  const TWO_PI = Math.PI * 2;
  let d = (to - from) % TWO_PI;
  if (d > Math.PI) d -= TWO_PI;
  if (d < -Math.PI) d += TWO_PI;
  return d;
}

/**
 * panning loop: default view → წერტილი 1 → წერტილი 2 → ... → უკან საწყისზე (ციკლი).
 *
 * იყენებს ერთიან requestAnimationFrame ციკლს მუდმივი კუთხური სიჩქარით —
 * წერტილებს შორის გადასვლა არ ჩერდება და სიჩქარე არ იცვლება (smooth).
 * სიჩქარე scene.pan_speed_rpm-დან. ჩერდება stopPanLoop()-ით ან ახალი token-ით.
 */
function startPanLoop(
  viewer: Viewer,
  scene: Scene,
  panRef: { current: PanController }
) {
  const keyframes = parsePanKeyframes(scene);
  if ((scene.pan_enabled ?? 0) !== 1 || keyframes.length === 0) return;

  // წინა loop-ის გაუქმება და ახალი token
  stopPanLoop(viewer, panRef);
  const token = panRef.current.token;
  panRef.current.active = true;

  // წერტილების სია: default view (თუ მითითებულია) + keyframes
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

  // ერთი წერტილი — უბრალოდ დავაყენოთ ხედი, მოძრაობა არ არის
  if (waypoints.length < 2) {
    try {
      viewer.rotate({ yaw: waypoints[0].yaw, pitch: waypoints[0].pitch });
      viewer.zoom(waypoints[0].zoom);
    } catch {
      /* ignore */
    }
    return;
  }

  // ჩაკეტილი ციკლი — ბოლო წერტილიდან საწყისზე ბრუნდება
  const path = [...waypoints, waypoints[0]];

  // თითო სეგმენტის წინასწარ დათვლა (კუთხური სიგრძე, delta-ები)
  const segments = path.slice(0, -1).map((a, i) => {
    const b = path[i + 1];
    const dyaw = shortestAngle(a.yaw, b.yaw);
    const dpitch = b.pitch - a.pitch;
    const len = Math.hypot(dyaw, dpitch);
    return { a, b, dyaw, dpitch, dzoom: b.zoom - a.zoom, len };
  });

  // rpm → რადიანი / ms (1 rpm = 2π რად 60000 ms-ში)
  const rpm = scene.pan_speed_rpm && scene.pan_speed_rpm > 0 ? scene.pan_speed_rpm : 1;
  const radPerMs = (rpm * 2 * Math.PI) / 60000;

  // საწყის წერტილზე დაყენება
  try {
    viewer.rotate({ yaw: path[0].yaw, pitch: path[0].pitch });
    viewer.zoom(path[0].zoom);
  } catch {
    /* ignore */
  }

  let seg = 0;
  let segProgress = 0; // უკვე გავლილი კუთხე მიმდინარე სეგმენტში (რად)
  let lastZoom = path[0].zoom;
  let lastTime = performance.now();

  const step = (now: number) => {
    if (!panRef.current.active || token !== panRef.current.token) return;
    const dt = now - lastTime;
    lastTime = now;

    let advance = radPerMs * dt;
    // სეგმენტებზე გადასვლა (ნულოვანი სიგრძის სეგმენტებს ვტოვებთ)
    let guard = 0;
    while (advance > 0 && guard < segments.length + 2) {
      const s = segments[seg];
      const remaining = s.len - segProgress;
      if (s.len <= 1e-6) {
        // zoom- only ან იდენტური წერტილი — გადავახტეთ
        seg = (seg + 1) % segments.length;
        segProgress = 0;
        guard++;
        continue;
      }
      if (advance < remaining) {
        segProgress += advance;
        advance = 0;
      } else {
        advance -= remaining;
        seg = (seg + 1) % segments.length;
        segProgress = 0;
      }
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
