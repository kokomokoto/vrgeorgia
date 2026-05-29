"use client";

import { useEffect, useState } from "react";
import {
  hasCustomDefaultView,
  parsePanKeyframes,
  panRpmToSlider,
  panSliderToRpm,
  radToDeg,
  serializePanKeyframes,
} from "@/lib/scene-settings";
import type { PanKeyframe, Scene } from "@/lib/types";
import type { ViewerApi } from "./PanoramaViewer";

const FOV_TRACK_MIN = 20;
const FOV_TRACK_MAX = 120;
const FOV_MIN_GAP = 5;

function fovToPercent(value: number): number {
  return (
    ((value - FOV_TRACK_MIN) / (FOV_TRACK_MAX - FOV_TRACK_MIN)) * 100
  );
}

function clampMinFov(value: number, maxFov: number): number {
  const hi = maxFov - FOV_MIN_GAP;
  return Math.min(hi, Math.max(FOV_TRACK_MIN, value));
}

function clampMaxFov(value: number, minFov: number): number {
  const lo = minFov + FOV_MIN_GAP;
  return Math.min(FOV_TRACK_MAX, Math.max(lo, value));
}

interface FovNumberInputProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onCommit: (value: number) => void;
}

function FovNumberInput({
  label,
  value,
  min,
  max,
  onCommit,
}: FovNumberInputProps) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  function commit() {
    const parsed = parseInt(draft, 10);
    if (!Number.isFinite(parsed)) {
      setDraft(String(value));
      return;
    }
    onCommit(Math.min(max, Math.max(min, parsed)));
  }

  return (
    <label className="flex items-center gap-1 text-xs tabular-nums">
      <span className="text-zinc-500">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        step={1}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
            (e.target as HTMLInputElement).blur();
          }
        }}
        className="w-[3.25rem] rounded bg-zinc-800 px-1.5 py-0.5 text-right font-medium text-zinc-100 ring-1 ring-zinc-600 focus:ring-1 focus:ring-blue-500"
      />
      <span className="text-zinc-400">°</span>
    </label>
  );
}

interface FovDualSliderProps {
  minFov: number;
  maxFov: number;
  onChange: (minFov: number, maxFov: number) => void;
}

function FovDualSlider({ minFov, maxFov, onChange }: FovDualSliderProps) {
  const fillLeft = fovToPercent(minFov);
  const fillWidth = fovToPercent(maxFov) - fillLeft;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <FovNumberInput
          label="Min"
          value={minFov}
          min={FOV_TRACK_MIN}
          max={maxFov - FOV_MIN_GAP}
          onCommit={(v) => onChange(clampMinFov(v, maxFov), maxFov)}
        />
        <FovNumberInput
          label="Max"
          value={maxFov}
          min={minFov + FOV_MIN_GAP}
          max={FOV_TRACK_MAX}
          onCommit={(v) => onChange(minFov, clampMaxFov(v, minFov))}
        />
      </div>
      <div className="fov-dual-range relative h-9 px-0.5">
        <div
          className="pointer-events-none absolute inset-x-0.5 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-zinc-700"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-blue-500"
          style={{ left: `${fillLeft}%`, width: `${fillWidth}%` }}
          aria-hidden
        />
        <input
          type="range"
          min={FOV_TRACK_MIN}
          max={FOV_TRACK_MAX}
          value={minFov}
          aria-label="Minimum field of view"
          onChange={(e) => {
            const v = parseInt(e.target.value, 10);
            onChange(clampMinFov(v, maxFov), maxFov);
          }}
          className="fov-dual-range__input fov-dual-range__input--min"
        />
        <input
          type="range"
          min={FOV_TRACK_MIN}
          max={FOV_TRACK_MAX}
          value={maxFov}
          aria-label="Maximum field of view"
          onChange={(e) => {
            const v = parseInt(e.target.value, 10);
            onChange(minFov, clampMaxFov(v, minFov));
          }}
          className="fov-dual-range__input fov-dual-range__input--max"
        />
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-zinc-600">
        <span>{FOV_TRACK_MIN}° · zoom in</span>
        <span>{FOV_TRACK_MAX}° · zoom out</span>
      </div>
    </div>
  );
}

interface SceneSettingsPanelProps {
  scene: Scene;
  onPatch: (data: Partial<Scene>) => void;
  viewerApi: ViewerApi | null;
  viewerReady: boolean;
}

export function SceneSettingsPanel({
  scene,
  onPatch,
  viewerApi,
  viewerReady,
}: SceneSettingsPanelProps) {
  const hasDefaultView = hasCustomDefaultView(scene);
  const canUseViewer = viewerReady && viewerApi !== null;

  function setDefaultView() {
    const pos = viewerApi?.getPosition();
    if (!pos) return;
    onPatch({
      default_yaw: pos.yaw,
      default_pitch: pos.pitch,
      default_zoom: pos.zoom,
      default_view_custom: 1,
    });
  }

  function previewDefaultView() {
    if (!hasDefaultView || !viewerApi) return;
    viewerApi.goToView(
      scene.default_yaw,
      scene.default_pitch,
      scene.default_zoom
    );
  }

  function setFovRange(minFov: number, maxFov: number) {
    onPatch({ min_fov: minFov, max_fov: maxFov });
  }

  // ─── Panning ───
  const panEnabled = (scene.pan_enabled ?? 0) === 1;
  const keyframes = parsePanKeyframes(scene);
  const panSpeedSlider = panRpmToSlider(scene.pan_speed_rpm ?? 1);

  function commitKeyframes(next: PanKeyframe[]) {
    onPatch({ pan_keyframes_json: serializePanKeyframes(next) });
  }

  function togglePan(enabled: boolean) {
    onPatch({ pan_enabled: enabled ? 1 : 0 });
  }

  function setPanSpeed(slider: number) {
    onPatch({ pan_speed_rpm: panSliderToRpm(slider) });
  }

  function addPanPoint() {
    const pos = viewerApi?.getPosition();
    if (!pos) return;
    commitKeyframes([
      ...keyframes,
      { yaw: pos.yaw, pitch: pos.pitch, zoom: pos.zoom },
    ]);
  }

  function removePanPoint(index: number) {
    commitKeyframes(keyframes.filter((_, i) => i !== index));
  }

  function movePanPoint(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= keyframes.length) return;
    const next = [...keyframes];
    [next[index], next[target]] = [next[target], next[index]];
    commitKeyframes(next);
  }

  function previewPanPoint(kf: PanKeyframe) {
    viewerApi?.goToView(kf.yaw, kf.pitch, kf.zoom);
  }

  return (
    <div className="space-y-5 text-sm">
      <section>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Default view
        </h4>
        <p className="mt-1 text-xs text-zinc-500">
          The angle visitors see when this scene opens in preview or the published
          tour.
        </p>

        {hasDefaultView ? (
          <div
            className="mt-2 rounded-lg border border-emerald-900/50 bg-emerald-950/30 px-2.5 py-2"
            role="status"
          >
            <p className="text-xs font-medium text-emerald-300">
              Default view is set
            </p>
            <p className="mt-1 text-[10px] text-emerald-200/80">
              To change it, rotate the panorama to a new angle and click Update
              default view.
            </p>
            <p className="mt-1.5 text-[10px] tabular-nums text-emerald-200/80">
              yaw {radToDeg(scene.default_yaw)}° · pitch{" "}
              {radToDeg(scene.default_pitch)}° · zoom{" "}
              {Math.round(scene.default_zoom)}
            </p>
          </div>
        ) : (
          <div
            className="mt-2 rounded-lg border border-amber-900/40 bg-amber-950/25 px-2.5 py-2"
            role="status"
          >
            <p className="text-xs font-medium text-amber-200">
              Default view is not set
            </p>
            <p className="mt-1 text-[10px] text-amber-200/90">
              Rotate the panorama to the opening angle you want, then click Set
              default view below.
            </p>
          </div>
        )}

        {!canUseViewer && scene.image_path && (
          <p className="mt-2 text-[10px] text-zinc-500">Loading viewer…</p>
        )}

        <div className="mt-2 flex flex-col gap-2">
          <button
            type="button"
            onClick={setDefaultView}
            disabled={!canUseViewer}
            className="w-full rounded-lg bg-blue-600 px-2 py-2 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-40"
          >
            {hasDefaultView ? "Update default view" : "Set default view"}
          </button>
          {hasDefaultView && (
            <button
              type="button"
              onClick={previewDefaultView}
              disabled={!canUseViewer}
              className="w-full rounded-lg border border-zinc-600 bg-zinc-800 px-2 py-2 text-xs font-medium text-zinc-100 hover:bg-zinc-700 disabled:opacity-40"
            >
              Preview default view
            </button>
          )}
        </div>
      </section>

      <section>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Field of view (FOV)
        </h4>
        <p className="mt-1 text-xs text-zinc-500">
          Drag the left thumb for closest zoom, right thumb for widest — blue
          band is the allowed range.
        </p>
        <div className="mt-3">
          <FovDualSlider
            minFov={scene.min_fov ?? 30}
            maxFov={scene.max_fov ?? 90}
            onChange={setFovRange}
          />
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Panning (auto camera)
          </h4>
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-zinc-300">
            <input
              type="checkbox"
              checked={panEnabled}
              onChange={(e) => togglePan(e.target.checked)}
              className="h-3.5 w-3.5 accent-blue-500"
            />
            {panEnabled ? "On" : "Off"}
          </label>
        </div>
        <p className="mt-1 text-xs text-zinc-500">
          When enabled, the scene opens at the default view, then the camera
          moves through the points below in order, looping. Speed is adjustable.
          With no points, only the default view is shown.
        </p>

        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-[10px] text-zinc-500">
            <span>Movement speed</span>
            <span className="tabular-nums text-zinc-400">
              {(scene.pan_speed_rpm ?? 1).toFixed(2)} rpm
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={panSpeedSlider}
            onChange={(e) => setPanSpeed(parseInt(e.target.value, 10))}
            className="w-full accent-blue-500"
            aria-label="Panning speed"
          />
          <div className="mt-0.5 flex justify-between text-[10px] text-zinc-600">
            <span>slow</span>
            <span>fast</span>
          </div>
        </div>

        <div className="mt-3">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wide text-zinc-500">
              Points ({keyframes.length})
            </span>
          </div>

          {keyframes.length === 0 ? (
            <p className="rounded-lg border border-zinc-700 bg-zinc-900/40 px-2.5 py-2 text-[10px] text-zinc-500">
              No points yet. Rotate the panorama to an angle and click “Add
              current view as point”.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {keyframes.map((kf, i) => (
                <li
                  key={i}
                  className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900/40 px-2 py-1.5"
                >
                  <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-blue-600 text-[10px] font-semibold text-white">
                    {i + 1}
                  </span>
                  <span className="flex-1 truncate text-[10px] tabular-nums text-zinc-400">
                    yaw {radToDeg(kf.yaw)}° · pitch {radToDeg(kf.pitch)}°
                  </span>
                  <button
                    type="button"
                    onClick={() => previewPanPoint(kf)}
                    disabled={!canUseViewer}
                    title="Preview point"
                    className="rounded px-1.5 py-0.5 text-[10px] text-zinc-300 hover:bg-zinc-700 disabled:opacity-40"
                  >
                    ▶
                  </button>
                  <button
                    type="button"
                    onClick={() => movePanPoint(i, -1)}
                    disabled={i === 0}
                    title="Move up"
                    className="rounded px-1 py-0.5 text-[10px] text-zinc-300 hover:bg-zinc-700 disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => movePanPoint(i, 1)}
                    disabled={i === keyframes.length - 1}
                    title="Move down"
                    className="rounded px-1 py-0.5 text-[10px] text-zinc-300 hover:bg-zinc-700 disabled:opacity-30"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => removePanPoint(i)}
                    title="Delete point"
                    className="rounded px-1.5 py-0.5 text-[10px] text-red-400 hover:bg-red-950/40"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-2 flex flex-col gap-2">
          <button
            type="button"
            onClick={addPanPoint}
            disabled={!canUseViewer}
            className="w-full rounded-lg bg-blue-600 px-2 py-2 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-40"
          >
            Add current view as point
          </button>
          {panEnabled && keyframes.length > 0 && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => viewerApi?.startPan()}
                disabled={!canUseViewer}
                className="flex-1 rounded-lg border border-zinc-600 bg-zinc-800 px-2 py-2 text-xs font-medium text-zinc-100 hover:bg-zinc-700 disabled:opacity-40"
              >
                Preview panning
              </button>
              <button
                type="button"
                onClick={() => viewerApi?.stopPan()}
                disabled={!canUseViewer}
                className="flex-1 rounded-lg border border-zinc-600 bg-zinc-800 px-2 py-2 text-xs font-medium text-zinc-100 hover:bg-zinc-700 disabled:opacity-40"
              >
                Stop
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
