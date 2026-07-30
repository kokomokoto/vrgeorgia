'use client';

import React from 'react';
import { useHomeDesignOptional } from '@/components/home-design/HomeDesignContext';
import {
  DESIGNABLE_HINTS,
  DESIGNABLE_LABELS,
  HERO_TRANSITIONS,
  RAIL_HINT_FONT_DEFAULT,
  RAIL_LABEL_DEFAULT,
  RAIL_LABEL_FONT_DEFAULT,
  RAIL_RADIUS_CIRCLE,
  RAIL_RADIUS_ROUNDED,
  RAIL_RADIUS_SQUARE,
  clampFontSize,
  clampRailPercent,
  clampRailRadius,
  type DesignableId,
  type HeaderLayout,
  type HeroTransition,
  type RailItem,
  type ThemeModeId,
  type ThemePalette,
  type ThemePalettes,
} from '@/lib/homeDesignLayout';
import { hexToRgba, parseColorWithOpacity, MAP_TILE_OPTIONS } from '@/lib/themePalettes';
import type { MapTileStyle } from '@/lib/themePalettes';
import { useTheme } from '@/components/ThemeProvider';
import {
  MAX_HERO_IMAGES_PER_MODE,
  resolveHeroImageUrls,
  revokeHeroUrls,
} from '@/lib/heroImageStorage';

const SELECT_ORDER: DesignableId[] = [
  'header',
  'hero',
  'heroText',
  'search',
  'serviceRail',
  'map',
  'quickRail',
  'theme',
];

/** Floating inspector — only visible in Design Mode on the home page */
export function DesignInspector() {
  const ctx = useHomeDesignOptional();
  const [saveFlash, setSaveFlash] = React.useState(false);

  if (!ctx?.designMode) return null;

  const {
    layout,
    selectedId,
    setSelectedId,
    selectedRailItemId,
    updateBox,
    updateHero,
    updateHeader,
    updateHeroText,
    addHeroImages,
    removeHeroImage,
    moveHeroImage,
    toggleHeroRotationImage,
    toggleHeroModeEnabled,
    updateThemePalette,
    resetThemePalette,
    updateServiceRail,
    updateQuickRail,
    addRailItem,
    removeRailItem,
    updateRailItem,
    setRailItemImage,
    removeRailItemImage,
    resetLayout,
    setDesignMode,
    isDirty,
    saveDesignChanges,
    discardDesignChanges,
    canUndo,
    canRedo,
    undo,
    redo,
  } = ctx;

  const onSave = async () => {
    await saveDesignChanges();
    setSaveFlash(true);
    window.setTimeout(() => setSaveFlash(false), 1600);
  };

  return (
    <div className="fixed bottom-4 right-4 z-[400] max-h-[min(85vh,720px)] w-[340px] overflow-y-auto rounded-xl border border-slate-300 bg-white p-3 shadow-2xl dark:border-zinc-600 dark:bg-zinc-900">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="text-sm font-bold text-slate-800 dark:text-zinc-100">Design Mode</div>
          {isDirty ? (
            <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-950/60 dark:text-amber-200">
              შეუნახავი
            </span>
          ) : (
            <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
              შენახული
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setDesignMode(false)}
          className="rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          დახურვა
        </button>
      </div>
      <p className="mb-2 text-[11px] leading-snug text-slate-500 dark:text-zinc-400">
        ეკრანზე დააკლიკე ელემენტს — გამოჩნდება მხოლოდ მისი ხელსაწყოები. Ctrl+S · Undo: Ctrl+Z
      </p>

      <div className="mb-3 flex gap-1">
        <button
          type="button"
          onClick={() => void onSave()}
          disabled={!isDirty}
          className="flex-[1.4] rounded-md bg-emerald-600 px-2 py-1.5 text-[11px] font-bold text-white shadow-sm enabled:hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
          title="Ctrl+S"
        >
          {saveFlash ? '✓ შენახულია' : 'შენახვა'}
        </button>
        <button
          type="button"
          onClick={() => void discardDesignChanges()}
          disabled={!isDirty}
          className="flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-[11px] font-semibold text-slate-700 enabled:hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-600 dark:text-zinc-200 dark:enabled:hover:bg-zinc-800"
        >
          გაუქმება
        </button>
      </div>

      <div className="mb-3 flex gap-1">
        <button
          type="button"
          onClick={undo}
          disabled={!canUndo}
          className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-700 enabled:hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-600 dark:text-zinc-200 dark:enabled:hover:bg-zinc-800"
          title="Ctrl+Z"
        >
          ↩ Undo
        </button>
        <button
          type="button"
          onClick={redo}
          disabled={!canRedo}
          className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-700 enabled:hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-600 dark:text-zinc-200 dark:enabled:hover:bg-zinc-800"
          title="Ctrl+Y / Ctrl+Shift+Z"
        >
          Redo ↪
        </button>
      </div>

      <div className="mb-3 flex flex-wrap gap-1">
        {SELECT_ORDER.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setSelectedId(id)}
            className={`rounded-md px-2 py-1 text-[11px] font-medium ${
              selectedId === id
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-zinc-800 dark:text-zinc-200'
            }`}
          >
            {DESIGNABLE_LABELS[id]}
          </button>
        ))}
      </div>

      {selectedId ? (
        <div className="mb-3 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-2 dark:border-blue-800 dark:bg-blue-950/40">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
            რედაქტირდება
          </div>
          <div className="text-sm font-bold text-blue-900 dark:text-blue-100">
            {DESIGNABLE_LABELS[selectedId]}
          </div>
          <p className="mt-0.5 text-[11px] leading-snug text-blue-800/80 dark:text-blue-200/80">
            {DESIGNABLE_HINTS[selectedId]}
          </p>
        </div>
      ) : (
        <p className="mb-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-2.5 py-2 text-[11px] text-slate-500 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-400">
          აირჩიე ბლოკი ზემოთ ან დააკლიკე ეკრანზე — გამოჩნდება მისი რედაქტორი.
        </p>
      )}

      {selectedId === 'header' ? (
        <HeaderEditor
          header={layout.header}
          palettes={layout.themePalettes}
          onUpdate={updateHeader}
          onUpdatePalette={updateThemePalette}
          onResetPalette={resetThemePalette}
        />
      ) : null}

      {selectedId === 'theme' ? (
        <ThemeEditor
          palettes={layout.themePalettes}
          onUpdatePalette={updateThemePalette}
          onResetPalette={resetThemePalette}
        />
      ) : null}

      {selectedId === 'hero' ? (
        <HeroEditor
          hero={layout.hero}
          onUpdate={updateHero}
          onAdd={addHeroImages}
          onRemove={removeHeroImage}
          onMove={moveHeroImage}
          onToggleRotation={toggleHeroRotationImage}
          onToggleModeEnabled={toggleHeroModeEnabled}
        />
      ) : null}

      {selectedId === 'heroText' ? (
        <div className="space-y-3">
          <NumGrid
            values={{
              x: layout.heroText.x,
              y: layout.heroText.y,
              w: layout.heroText.w,
              h: layout.heroText.h,
            }}
            onChange={(patch) => updateBox('heroText', patch)}
          />
          <TextField
            label="მთავარი სათაური"
            value={layout.heroText.title ?? ''}
            onCommit={(title) => updateHeroText({ title })}
          />
          <div className="grid grid-cols-2 gap-2">
            <NumField
              label="სათაურის ზომა"
              value={layout.heroText.titleFontSize}
              min={12}
              max={96}
              onCommit={(titleFontSize) => updateHeroText({ titleFontSize })}
            />
            <ColorField
              label="სათაურის ფერი"
              value={layout.heroText.titleColor}
              onChange={(titleColor) => updateHeroText({ titleColor })}
            />
          </div>
          <TextAreaField
            label="ქვესათაური"
            value={layout.heroText.subtitle ?? ''}
            onCommit={(subtitle) => updateHeroText({ subtitle })}
          />
          <div className="grid grid-cols-2 gap-2">
            <NumField
              label="ქვესათაურის ზომა"
              value={layout.heroText.subtitleFontSize}
              min={10}
              max={48}
              onCommit={(subtitleFontSize) => updateHeroText({ subtitleFontSize })}
            />
            <ColorField
              label="ქვესათაურის ფერი"
              value={layout.heroText.subtitleColor}
              onChange={(subtitleColor) => updateHeroText({ subtitleColor })}
            />
          </div>
        </div>
      ) : null}

      {selectedId === 'search' || selectedId === 'map' ? (
        <NumGrid
          values={{
            x: layout[selectedId].x,
            y: layout[selectedId].y,
            w: layout[selectedId].w,
            h: layout[selectedId].h,
          }}
          onChange={(patch) => updateBox(selectedId, patch)}
        />
      ) : null}

      {selectedId === 'serviceRail' ? (
        <div className="space-y-3">
          <TextField
            label="განყოფილების სათაური"
            value={layout.serviceRail.title}
            onCommit={(title) => updateServiceRail({ title })}
          />
          <div className="grid grid-cols-2 gap-2">
            <NumField label="X" value={layout.serviceRail.x} onCommit={(x) => updateServiceRail({ x })} />
            <NumField label="Y" value={layout.serviceRail.y} onCommit={(y) => updateServiceRail({ y })} />
            <NumField
              label="სიგანე (W)"
              value={layout.serviceRail.itemW}
              min={40}
              onCommit={(itemW) => updateServiceRail({ itemW })}
            />
            <NumField
              label="სიმაღლე (H)"
              value={layout.serviceRail.itemH}
              min={40}
              onCommit={(itemH) => updateServiceRail({ itemH })}
            />
            <NumField
              label="Gap"
              value={layout.serviceRail.gap}
              min={0}
              onCommit={(gap) => updateServiceRail({ gap })}
            />
          </div>
          <RailItemsEditor
            items={layout.serviceRail.items}
            focusItemId={selectedRailItemId}
            onAdd={() => addRailItem('serviceRail')}
            onRemove={(id) => removeRailItem('serviceRail', id)}
            onUpdate={(id, patch) => updateRailItem('serviceRail', id, patch)}
            onSetImage={(id, file) => setRailItemImage('serviceRail', id, file)}
            onRemoveImage={(id) => removeRailItemImage('serviceRail', id)}
            defaultRadius={RAIL_RADIUS_CIRCLE}
            circleRadiusHint={Math.ceil(Math.min(layout.serviceRail.itemW, layout.serviceRail.itemH) / 2)}
            showHint={false}
          />
        </div>
      ) : null}

      {selectedId === 'quickRail' ? (
        <div className="space-y-3">
          <TextField
            label="განყოფილების სათაური"
            value={layout.quickRail.title}
            onCommit={(title) => updateQuickRail({ title })}
          />
          <div className="grid grid-cols-2 gap-2">
            <NumField label="X" value={layout.quickRail.x} onCommit={(x) => updateQuickRail({ x })} />
            <NumField label="Y" value={layout.quickRail.y} onCommit={(y) => updateQuickRail({ y })} />
            <NumField
              label="სიგანე (W)"
              value={layout.quickRail.w}
              min={80}
              onCommit={(w) => updateQuickRail({ w })}
            />
            <NumField
              label="ბარათის H"
              value={layout.quickRail.itemH}
              min={40}
              onCommit={(itemH) => updateQuickRail({ itemH })}
            />
            <NumField
              label="Gap"
              value={layout.quickRail.gap}
              min={0}
              onCommit={(gap) => updateQuickRail({ gap })}
            />
          </div>
          <RailItemsEditor
            items={layout.quickRail.items}
            focusItemId={selectedRailItemId}
            onAdd={() => addRailItem('quickRail')}
            onRemove={(id) => removeRailItem('quickRail', id)}
            onUpdate={(id, patch) => updateRailItem('quickRail', id, patch)}
            onSetImage={(id, file) => setRailItemImage('quickRail', id, file)}
            onRemoveImage={(id) => removeRailItemImage('quickRail', id)}
            defaultRadius={RAIL_RADIUS_ROUNDED}
            circleRadiusHint={Math.ceil(Math.min(layout.quickRail.w, layout.quickRail.itemH) / 2)}
            showHint
          />
        </div>
      ) : null}

      <button
        type="button"
        onClick={resetLayout}
        className="mt-3 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
      >
        ნაგულისხმევზე დაბრუნება
      </button>
      <p className="mt-1.5 text-center text-[10px] text-slate-400">
        ნაგულისხმევიც საჭიროებს „შენახვას“, რომ დარჩეს.
      </p>
    </div>
  );
}

function HeroEditor({
  hero,
  onUpdate,
  onAdd,
  onRemove,
  onMove,
  onToggleRotation,
  onToggleModeEnabled,
}: {
  hero: {
    h: number;
    enabledModes: Array<'day' | 'twilight' | 'night'>;
    dayImageIds: string[];
    dayRotationIds: string[];
    twilightImageIds: string[];
    twilightRotationIds: string[];
    nightImageIds: string[];
    nightRotationIds: string[];
    intervalSec: number;
    transition: HeroTransition;
  };
  onUpdate: (patch: {
    h?: number;
    intervalSec?: number;
    transition?: HeroTransition;
  }) => void;
  onAdd: (mode: 'day' | 'twilight' | 'night', files: File[]) => Promise<void>;
  onRemove: (mode: 'day' | 'twilight' | 'night', id: string) => Promise<void>;
  onMove: (mode: 'day' | 'twilight' | 'night', id: string, dir: -1 | 1) => void;
  onToggleRotation: (mode: 'day' | 'twilight' | 'night', id: string) => void;
  onToggleModeEnabled: (mode: 'day' | 'twilight' | 'night') => void;
}) {
  const { setTheme } = useTheme();
  const [expandedModes, setExpandedModes] = React.useState<Record<'day' | 'twilight' | 'night', boolean>>({
    day: true,
    twilight: false,
    night: false,
  });
  const [uploading, setUploading] = React.useState(false);
  const [uploadMode, setUploadMode] = React.useState<'day' | 'twilight' | 'night'>('day');
  const fileRef = React.useRef<HTMLInputElement>(null);

  const onPickFiles = async (list: FileList | null) => {
    if (!list?.length) return;
    setUploading(true);
    try {
      await onAdd(uploadMode, Array.from(list));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const modeCards: Array<{
    id: 'day' | 'twilight' | 'night';
    label: string;
    theme: 'light' | 'twilight' | 'dark';
    ids: string[];
    rotationIds: string[];
  }> = [
    {
      id: 'day',
      label: 'დღის რეჟიმი',
      theme: 'light',
      ids: hero.dayImageIds,
      rotationIds: hero.dayRotationIds,
    },
    {
      id: 'twilight',
      label: 'შუალედური რეჟიმი',
      theme: 'twilight',
      ids: hero.twilightImageIds,
      rotationIds: hero.twilightRotationIds,
    },
    {
      id: 'night',
      label: 'ღამის რეჟიმი',
      theme: 'dark',
      ids: hero.nightImageIds,
      rotationIds: hero.nightRotationIds,
    },
  ];

  return (
    <div className="space-y-3">
      <NumField
        label="სიმაღლე (H) — 1920×H"
        value={hero.h}
        min={160}
        onCommit={(h) => onUpdate({ h })}
      />

      <label className="block text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-zinc-400">
        ცვლის ინტერვალი (წამი)
        <input
          type="number"
          min={2}
          max={120}
          className="mt-0.5 w-full rounded-md border border-slate-200 px-2 py-1 text-sm text-slate-800 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
          value={hero.intervalSec}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (Number.isFinite(n)) onUpdate({ intervalSec: n });
          }}
        />
      </label>

      <label className="block text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-zinc-400">
        გადასვლის სტილი
        <select
          className="mt-0.5 w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm text-slate-800 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
          value={hero.transition}
          onChange={(e) => onUpdate({ transition: e.target.value as HeroTransition })}
        >
          {HERO_TRANSITIONS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </label>

      <div className="space-y-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => void onPickFiles(e.target.files)}
        />

        {modeCards.map((mode) => {
          const expanded = expandedModes[mode.id];
          const enabled = hero.enabledModes.includes(mode.id);
          const disableUncheck = enabled && hero.enabledModes.length === 1;
          return (
            <div
              key={mode.id}
              className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-zinc-700 dark:bg-zinc-950"
            >
              <div className="flex items-center gap-2 px-3 py-2">
                <input
                  type="checkbox"
                  checked={enabled}
                  disabled={disableUncheck}
                  onChange={() => onToggleModeEnabled(mode.id)}
                />
                <button
                  type="button"
                  onClick={() =>
                    setExpandedModes((prev) => ({ ...prev, [mode.id]: !prev[mode.id] }))
                  }
                  className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left"
                >
                  <span className="text-sm font-semibold text-slate-800 dark:text-zinc-100">
                    {mode.label}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-zinc-400">
                    {mode.ids.length} ფოტო {expanded ? '▲' : '▼'}
                  </span>
                </button>
              </div>

              {expanded ? (
                <div className="space-y-3 border-t border-slate-200 px-3 py-3 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setTheme(mode.theme)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200"
                  >
                    ამ რეჟიმის ცოცხალი გადახედვა
                  </button>

                  <button
                    type="button"
                    disabled={uploading || mode.ids.length >= MAX_HERO_IMAGES_PER_MODE}
                    onClick={() => {
                      setUploadMode(mode.id);
                      fileRef.current?.click();
                    }}
                    className="w-full rounded-lg bg-blue-600 px-2 py-2 text-[11px] font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {uploading
                      ? 'იტვირთება…'
                      : mode.ids.length >= MAX_HERO_IMAGES_PER_MODE
                        ? `ლიმიტი ${MAX_HERO_IMAGES_PER_MODE} ფოტო`
                        : `+ ფოტოს ატვირთვა (${mode.label})`}
                  </button>

                  <p className="text-[10px] leading-snug text-slate-400">
                    მონიშნე checkbox-ით, უნდა იყოს თუ არა ეს რეჟიმი აქტიური. მხოლოდ მონიშნული ფოტოები მოხვდება სლაიდშოუში.
                  </p>

                  <HeroGalleryThumbs
                    ids={mode.ids}
                    rotationIds={mode.rotationIds}
                    onRemove={(id) => void onRemove(mode.id, id)}
                    onMove={(id, dir) => onMove(mode.id, id, dir)}
                    onToggleRotation={(id) => onToggleRotation(mode.id, id)}
                  />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HeaderEditor({
  header,
  palettes,
  onUpdate,
  onUpdatePalette,
  onResetPalette,
}: {
  header: HeaderLayout;
  palettes: ThemePalettes;
  onUpdate: (patch: Partial<HeaderLayout>) => void;
  onUpdatePalette: (mode: ThemeModeId, patch: Partial<ThemePalette>) => void;
  onResetPalette: (mode: ThemeModeId) => void;
}) {
  const { theme, setTheme } = useTheme();
  const modes: Array<{ id: ThemeModeId; label: string; theme: 'light' | 'twilight' | 'dark' }> = [
    { id: 'day', label: 'დღე', theme: 'light' },
    { id: 'twilight', label: 'შუალედი', theme: 'twilight' },
    { id: 'night', label: 'ღამე', theme: 'dark' },
  ];
  const activeMode: ThemeModeId =
    theme === 'dark' ? 'night' : theme === 'twilight' ? 'twilight' : 'day';
  const palette = palettes[activeMode];
  const headerBg = parseColorWithOpacity(palette.headerBg, '#ffffff');
  const brandColor = header.brandColor || palette.accentColor;
  const navColor = header.navColor || palette.headerText;

  return (
    <div className="space-y-3">
      <NumField
        label="სიმაღლე (H)"
        value={header.h}
        min={44}
        max={120}
        onCommit={(h) => onUpdate({ h })}
      />
      <p className="text-[10px] leading-snug text-slate-400">
        ჰედერის ქვედა ლურჯ ზოლზე გადაათრიე — სიმაღლე იცვლება.
      </p>

      <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-zinc-700 dark:bg-zinc-950">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          ლოგო
        </div>
        <TextField
          label="ტექსტი (ცარიელი = Vhome)"
          value={header.brandLabel}
          onCommit={(brandLabel) => onUpdate({ brandLabel })}
        />
        <div className="grid grid-cols-2 gap-2">
          <NumField
            label="ზომა"
            value={header.brandFontSize}
            min={12}
            max={40}
            onCommit={(brandFontSize) => onUpdate({ brandFontSize })}
          />
          <ColorField
            label="ფერი"
            value={brandColor}
            onChange={(brandColor) => onUpdate({ brandColor })}
          />
        </div>
      </div>

      <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-zinc-700 dark:bg-zinc-950">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          ნავიგაციის ტექსტები
        </div>
        <div className="grid grid-cols-2 gap-2">
          <NumField
            label="ტექსტის ზომა"
            value={header.navFontSize}
            min={10}
            max={24}
            onCommit={(navFontSize) => onUpdate({ navFontSize })}
          />
          <ColorField
            label="ტექსტის ფერი"
            value={navColor}
            onChange={(navColor) => onUpdate({ navColor })}
          />
        </div>
        <TextField
          label="მომსახურება"
          value={header.servicesLabel}
          onCommit={(servicesLabel) => onUpdate({ servicesLabel })}
        />
        <TextField
          label="შესახებ"
          value={header.aboutLabel}
          onCommit={(aboutLabel) => onUpdate({ aboutLabel })}
        />
        <TextField
          label="აგენტები"
          value={header.agentsLabel}
          onCommit={(agentsLabel) => onUpdate({ agentsLabel })}
        />
        <TextField
          label="განცხადების დამატება"
          value={header.uploadLabel}
          onCommit={(uploadLabel) => onUpdate({ uploadLabel })}
        />
        <TextField
          label="ფავორიტები"
          value={header.favoritesLabel}
          onCommit={(favoritesLabel) => onUpdate({ favoritesLabel })}
        />
        <TextField
          label="შედარება"
          value={header.compareLabel}
          onCommit={(compareLabel) => onUpdate({ compareLabel })}
        />
        <TextField
          label="შესვლა"
          value={header.loginLabel}
          onCommit={(loginLabel) => onUpdate({ loginLabel })}
        />
        <p className="text-[10px] leading-snug text-slate-400">
          ცარიელი ველი = ენის თარგმანი. შევსებული ტექსტი ყველა ენაზე იგივე დარჩება.
        </p>
      </div>

      <div className="flex flex-wrap gap-1">
        {modes.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setTheme(m.theme)}
            className={`rounded-md px-2 py-1 text-[11px] font-semibold ${
              activeMode === m.id
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-zinc-800 dark:text-zinc-200'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>
      <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-2 dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            ჰედერის ფონი ({modes.find((m) => m.id === activeMode)?.label})
          </div>
          <button
            type="button"
            onClick={() => onResetPalette(activeMode)}
            className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            ნაგულისხმევი
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <ColorField
            label="ჰედერის ფონი"
            value={headerBg.hex}
            onChange={(hex) =>
              onUpdatePalette(activeMode, { headerBg: hexToRgba(hex, headerBg.opacity) })
            }
          />
          <ColorField
            label="რეჟიმის ნავიგაცია"
            value={palette.headerText}
            onChange={(headerText) => onUpdatePalette(activeMode, { headerText })}
          />
          <ColorField
            label="რეჟიმის აქცენტი"
            value={palette.accentColor}
            onChange={(accentColor) => onUpdatePalette(activeMode, { accentColor })}
          />
        </div>
        <OpacityField
          label="ჰედერის გამჭვირვალობა"
          value={headerBg.opacity}
          onChange={(opacity) =>
            onUpdatePalette(activeMode, { headerBg: hexToRgba(headerBg.hex, opacity) })
          }
        />
        <p className="text-[10px] leading-snug text-slate-400">
          რეჟიმის ფერები გამოიყენება, თუ ზემოთ ლოგო/ნავიგაციის ფერი ცარიელია.
        </p>
      </div>
    </div>
  );
}

function ThemeEditor({
  palettes,
  onUpdatePalette,
  onResetPalette,
}: {
  palettes: ThemePalettes;
  onUpdatePalette: (mode: ThemeModeId, patch: Partial<ThemePalette>) => void;
  onResetPalette: (mode: ThemeModeId) => void;
}) {
  const { theme, setTheme } = useTheme();
  const modes: Array<{ id: ThemeModeId; label: string; theme: 'light' | 'twilight' | 'dark' }> = [
    { id: 'day', label: 'დღე', theme: 'light' },
    { id: 'twilight', label: 'შუალედი', theme: 'twilight' },
    { id: 'night', label: 'ღამე', theme: 'dark' },
  ];
  const activeMode: ThemeModeId =
    theme === 'dark' ? 'night' : theme === 'twilight' ? 'twilight' : 'day';
  const palette = palettes[activeMode];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1">
        {modes.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setTheme(m.theme)}
            className={`rounded-md px-2 py-1 text-[11px] font-semibold ${
              activeMode === m.id
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-zinc-800 dark:text-zinc-200'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>
      <ModePaletteEditor
        palette={palette}
        onChange={(patch) => onUpdatePalette(activeMode, patch)}
        onReset={() => onResetPalette(activeMode)}
        variant="page"
      />
    </div>
  );
}

function ModePaletteEditor({
  palette,
  onChange,
  onReset,
  variant = 'page',
}: {
  palette: ThemePalette;
  onChange: (patch: Partial<ThemePalette>) => void;
  onReset: () => void;
  variant?: 'page' | 'all';
}) {
  const header = parseColorWithOpacity(palette.headerBg, '#ffffff');

  return (
    <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-2 dark:border-zinc-700 dark:bg-zinc-900">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          {variant === 'page' ? 'გვერდის ფერები' : 'რეჟიმის ფერები'}
        </div>
        <button
          type="button"
          onClick={onReset}
          className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          ნაგულისხმევი
        </button>
      </div>

      <div className="text-[10px] font-semibold text-slate-500">გვერდი</div>
      <div className="grid grid-cols-2 gap-2">
        <ColorField label="ფონი" value={palette.bodyBg} onChange={(bodyBg) => onChange({ bodyBg })} />
        <ColorField
          label="ტექსტი"
          value={palette.textColor}
          onChange={(textColor) => onChange({ textColor })}
        />
        <ColorField
          label="აქცენტი"
          value={palette.accentColor}
          onChange={(accentColor) => onChange({ accentColor })}
        />
      </div>

      {variant === 'all' ? (
        <>
          <div className="text-[10px] font-semibold text-slate-500">ჰედერი</div>
          <div className="grid grid-cols-2 gap-2">
            <ColorField
              label="ჰედერის ტექსტი"
              value={palette.headerText}
              onChange={(headerText) => onChange({ headerText })}
            />
            <ColorField
              label="ჰედერის ფონი"
              value={header.hex}
              onChange={(hex) => onChange({ headerBg: hexToRgba(hex, header.opacity) })}
            />
          </div>
          <OpacityField
            label="ჰედერის გამჭვირვალობა"
            value={header.opacity}
            onChange={(opacity) => onChange({ headerBg: hexToRgba(header.hex, opacity) })}
          />
        </>
      ) : null}

      <div className="text-[10px] font-semibold text-slate-500">ობიექტები / ბარათები</div>
      <div className="grid grid-cols-2 gap-2">
        <ColorField
          label="ბარათის ფონი"
          value={palette.surfaceBg}
          onChange={(surfaceBg) => onChange({ surfaceBg })}
        />
        <ColorField
          label="ბარათის ჩარჩო"
          value={palette.surfaceBorder}
          onChange={(surfaceBorder) => onChange({ surfaceBorder })}
        />
        <ColorField
          label="ფასი / სათაური"
          value={palette.priceColor}
          onChange={(priceColor) => onChange({ priceColor })}
        />
        <ColorField
          label="მეორადი ტექსტი"
          value={palette.mutedText}
          onChange={(mutedText) => onChange({ mutedText })}
        />
      </div>

      <div className="text-[10px] font-semibold text-slate-500">რუკა</div>
      <label className="block text-[10px] font-medium text-slate-500 dark:text-zinc-400">
        რუკის სტილი
        <select
          className="mt-0.5 w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm text-slate-800 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
          value={palette.mapTiles}
          onChange={(e) => onChange({ mapTiles: e.target.value as MapTileStyle })}
        >
          {MAP_TILE_OPTIONS.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>

      <div className="text-[10px] font-semibold text-slate-500">ატმოსფერო</div>
      <div className="grid grid-cols-2 gap-2">
        <ColorField
          label="გრადიენტი 1"
          value={palette.gradientFrom}
          onChange={(gradientFrom) => onChange({ gradientFrom })}
        />
        <ColorField
          label="გრადიენტი 2"
          value={palette.gradientMid}
          onChange={(gradientMid) => onChange({ gradientMid })}
        />
        <ColorField
          label="გრადიენტი 3"
          value={palette.gradientTo}
          onChange={(gradientTo) => onChange({ gradientTo })}
        />
        <ColorField
          label="ბადე"
          value={palette.gridColor}
          onChange={(gridColor) => onChange({ gridColor })}
        />
      </div>

      <OpacityField
        label="ბადის სიმკვრივე"
        value={palette.gridOpacity}
        onChange={(gridOpacity) => onChange({ gridOpacity })}
      />

      <GlowField
        label="ნათება 1"
        color={palette.glow1}
        opacity={palette.glow1Opacity}
        onColor={(glow1) => onChange({ glow1 })}
        onOpacity={(glow1Opacity) => onChange({ glow1Opacity })}
      />
      <GlowField
        label="ნათება 2"
        color={palette.glow2}
        opacity={palette.glow2Opacity}
        onColor={(glow2) => onChange({ glow2 })}
        onOpacity={(glow2Opacity) => onChange({ glow2Opacity })}
      />
      <GlowField
        label="ნათება 3"
        color={palette.glow3}
        opacity={palette.glow3Opacity}
        onColor={(glow3) => onChange({ glow3 })}
        onOpacity={(glow3Opacity) => onChange({ glow3Opacity })}
      />
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const safeValue = /^#[0-9a-fA-F]{6}$/.test(value) ? value : '#000000';
  const [textDraft, setTextDraft] = React.useState(safeValue);
  const focusedRef = React.useRef(false);

  React.useEffect(() => {
    if (!focusedRef.current) setTextDraft(safeValue);
  }, [safeValue]);

  return (
    <label className="block text-[10px] font-medium text-slate-500 dark:text-zinc-400">
      {label}
      <div className="mt-0.5 flex items-center gap-1.5">
        <input
          type="color"
          value={safeValue}
          onChange={(e) => {
            const next = e.target.value;
            setTextDraft(next);
            onChange(next);
          }}
          className="h-8 w-10 cursor-pointer rounded border border-slate-200 bg-white p-0.5 dark:border-zinc-600"
        />
        <input
          type="text"
          value={textDraft}
          onFocus={() => {
            focusedRef.current = true;
          }}
          onChange={(e) => setTextDraft(e.target.value)}
          onBlur={() => {
            focusedRef.current = false;
            const next = textDraft.trim();
            if (/^#[0-9a-fA-F]{6}$/.test(next)) {
              onChange(next);
            } else {
              setTextDraft(safeValue);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
          }}
          className="w-full rounded-md border border-slate-200 px-1.5 py-1 text-[11px] text-slate-800 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
        />
      </div>
    </label>
  );
}

function OpacityField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block text-[10px] font-medium text-slate-500 dark:text-zinc-400">
      {label} ({Math.round(value * 100)}%)
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full"
      />
    </label>
  );
}

function GlowField({
  label,
  color,
  opacity,
  onColor,
  onOpacity,
}: {
  label: string;
  color: string;
  opacity: number;
  onColor: (value: string) => void;
  onOpacity: (value: number) => void;
}) {
  return (
    <div className="rounded-md border border-slate-100 bg-slate-50 p-1.5 dark:border-zinc-800 dark:bg-zinc-950">
      <ColorField label={label} value={color} onChange={onColor} />
      <OpacityField label={`${label} სიძლიერე`} value={opacity} onChange={onOpacity} />
    </div>
  );
}

function HeroGalleryThumbs({
  ids,
  rotationIds,
  onRemove,
  onMove,
  onToggleRotation,
}: {
  ids: string[];
  rotationIds: string[];
  onRemove: (id: string) => void;
  onMove: (id: string, dir: -1 | 1) => void;
  onToggleRotation: (id: string) => void;
}) {
  const [thumbs, setThumbs] = React.useState<{ id: string; url: string }[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    let loaded: { id: string; url: string }[] = [];
    (async () => {
      loaded = await resolveHeroImageUrls(ids);
      if (!cancelled) setThumbs(loaded);
      else revokeHeroUrls(loaded);
    })();
    return () => {
      cancelled = true;
      revokeHeroUrls(loaded);
    };
  }, [ids.join('|')]); // eslint-disable-line react-hooks/exhaustive-deps

  if (ids.length === 0) {
    return <p className="text-[11px] text-slate-400">ფოტოები ჯერ არ არის ატვირთული.</p>;
  }

  return (
    <div className="space-y-2">
      {ids.map((id, index) => {
        const thumb = thumbs.find((t) => t.id === id);
        return (
          <div
            key={id}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-1.5 dark:border-zinc-700 dark:bg-zinc-950"
          >
            <div className="h-12 w-16 shrink-0 overflow-hidden rounded bg-slate-200 dark:bg-zinc-800">
              {thumb ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumb.url} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-[9px] text-slate-400">…</div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-medium text-slate-500">#{index + 1}</div>
              <label className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-600 dark:text-zinc-300">
                <input
                  type="checkbox"
                  checked={rotationIds.includes(id)}
                  onChange={() => onToggleRotation(id)}
                />
                სლაიდშოუში ჩართვა
              </label>
            </div>
            <div className="flex shrink-0 flex-col gap-0.5">
              <button
                type="button"
                disabled={index === 0}
                onClick={() => onMove(id, -1)}
                className="rounded px-1 text-[10px] font-bold text-slate-600 disabled:opacity-30 dark:text-zinc-300"
                title="ზემოთ"
              >
                ↑
              </button>
              <button
                type="button"
                disabled={index === ids.length - 1}
                onClick={() => onMove(id, 1)}
                className="rounded px-1 text-[10px] font-bold text-slate-600 disabled:opacity-30 dark:text-zinc-300"
                title="ქვემოთ"
              >
                ↓
              </button>
            </div>
            <button
              type="button"
              onClick={() => onRemove(id)}
              className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-red-600 hover:bg-red-50 dark:text-red-400"
            >
              წაშლა
            </button>
          </div>
        );
      })}
    </div>
  );
}

function RailItemsEditor({
  items,
  focusItemId,
  onAdd,
  onRemove,
  onUpdate,
  onSetImage,
  onRemoveImage,
  showHint,
  defaultRadius,
  circleRadiusHint,
}: {
  items: RailItem[];
  focusItemId?: string | null;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, patch: Partial<RailItem>) => void;
  onSetImage: (id: string, file: File) => Promise<void>;
  onRemoveImage: (id: string) => void;
  showHint: boolean;
  defaultRadius: number;
  circleRadiusHint: number;
}) {
  const imageIds = items.map((it) => it.imageId).filter(Boolean) as string[];
  const [thumbs, setThumbs] = React.useState<{ id: string; url: string }[]>([]);
  const fileRefs = React.useRef<Record<string, HTMLInputElement | null>>({});
  const itemRefs = React.useRef<Record<string, HTMLDivElement | null>>({});

  React.useEffect(() => {
    let cancelled = false;
    let loaded: { id: string; url: string }[] = [];
    void (async () => {
      loaded = await resolveHeroImageUrls(imageIds);
      if (!cancelled) setThumbs(loaded);
      else revokeHeroUrls(loaded);
    })();
    return () => {
      cancelled = true;
      revokeHeroUrls(loaded);
    };
  }, [imageIds.join('|')]); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    if (!focusItemId) return;
    const el = itemRefs.current[focusItemId];
    if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [focusItemId]);

  const thumbById = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const t of thumbs) map.set(t.id, t.url);
    return map;
  }, [thumbs]);

  return (
    <div className="space-y-2 border-t border-slate-200 pt-3 dark:border-zinc-700">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          ელემენტები ({items.length})
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="rounded-md bg-blue-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-blue-700"
        >
          + დამატება
        </button>
      </div>
      <p className="text-[10px] leading-snug text-slate-400">
        ეკრანზე დააკლიკე წრეს/ბარათს — ქვემოთ გაიხსნება მისი პარამეტრები.
      </p>
      {items.map((item, index) => {
        const previewUrl = item.imageId ? thumbById.get(item.imageId) : undefined;
        const radius = clampRailRadius(item.borderRadius, defaultRadius);
        const labelX = clampRailPercent(item.labelX, RAIL_LABEL_DEFAULT.x);
        const labelY = clampRailPercent(item.labelY, RAIL_LABEL_DEFAULT.y);
        const labelFontSize = clampFontSize(
          item.labelFontSize,
          RAIL_LABEL_FONT_DEFAULT,
          10,
          48
        );
        const hintFontSize = clampFontSize(
          item.hintFontSize,
          RAIL_HINT_FONT_DEFAULT,
          9,
          32
        );
        const labelColor = item.labelColor || '#1d4ed8';
        const focused = focusItemId === item.id;
        const hintColor = item.hintColor || '#64748b';
        return (
          <div
            key={item.id}
            ref={(el) => {
              itemRefs.current[item.id] = el;
            }}
            className={`space-y-1.5 rounded-lg border p-2 ${
              focused
                ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-400/40 dark:border-blue-400 dark:bg-blue-950/40'
                : 'border-slate-200 bg-slate-50 dark:border-zinc-700 dark:bg-zinc-950'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className={`text-[10px] font-medium ${focused ? 'text-blue-700 dark:text-blue-300' : 'text-slate-400'}`}>
                #{index + 1}
                {focused ? ' · არჩეული' : ''}
              </span>
              <button
                type="button"
                onClick={() => onRemove(item.id)}
                className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
              >
                წაშლა
              </button>
            </div>
            <TextField
              label="სახელი"
              value={item.label}
              onCommit={(label) => onUpdate(item.id, { label })}
            />
            {showHint ? (
              <TextField
                label="ქვესათაური"
                value={item.hint || ''}
                onCommit={(hint) => onUpdate(item.id, { hint })}
              />
            ) : null}
            <TextField
              label="ბმული (href)"
              value={item.href}
              onCommit={(href) => onUpdate(item.id, { href })}
            />

            <div className="space-y-1">
              <div className="text-[10px] font-medium text-slate-500">ტექსტის ზომა / ფერი</div>
              <div className="grid grid-cols-2 gap-2">
                <NumField
                  label="სახელის ზომა"
                  value={labelFontSize}
                  min={10}
                  max={48}
                  onCommit={(n) =>
                    onUpdate(item.id, { labelFontSize: clampFontSize(n, RAIL_LABEL_FONT_DEFAULT, 10, 48) })
                  }
                />
                <ColorField
                  label="სახელის ფერი"
                  value={labelColor}
                  onChange={(c) => onUpdate(item.id, { labelColor: c })}
                />
              </div>
              {showHint ? (
                <div className="grid grid-cols-2 gap-2">
                  <NumField
                    label="ქვესათაურის ზომა"
                    value={hintFontSize}
                    min={9}
                    max={32}
                    onCommit={(n) =>
                      onUpdate(item.id, {
                        hintFontSize: clampFontSize(n, RAIL_HINT_FONT_DEFAULT, 9, 32),
                      })
                    }
                  />
                  <ColorField
                    label="ქვესათაურის ფერი"
                    value={hintColor}
                    onChange={(c) => onUpdate(item.id, { hintColor: c })}
                  />
                </div>
              ) : null}
              {(item.labelColor || item.hintColor) && (
                <button
                  type="button"
                  onClick={() =>
                    onUpdate(item.id, {
                      labelColor: undefined,
                      hintColor: undefined,
                    })
                  }
                  className="rounded-md border border-slate-300 px-2 py-0.5 text-[10px] font-semibold text-slate-700 hover:bg-white dark:border-zinc-600 dark:text-zinc-200"
                >
                  ფერის ნაგულისხმევზე
                </button>
              )}
            </div>

            <div className="space-y-1">
              <div className="text-[10px] font-medium text-slate-500">ფორმა / მომრგვალება</div>
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => onUpdate(item.id, { borderRadius: RAIL_RADIUS_SQUARE })}
                  className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                    radius === RAIL_RADIUS_SQUARE
                      ? 'bg-blue-600 text-white'
                      : 'border border-slate-300 text-slate-700 dark:border-zinc-600 dark:text-zinc-200'
                  }`}
                >
                  კვადრატი
                </button>
                <button
                  type="button"
                  onClick={() => onUpdate(item.id, { borderRadius: RAIL_RADIUS_ROUNDED })}
                  className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                    radius === RAIL_RADIUS_ROUNDED
                      ? 'bg-blue-600 text-white'
                      : 'border border-slate-300 text-slate-700 dark:border-zinc-600 dark:text-zinc-200'
                  }`}
                >
                  მომრგვალებული
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onUpdate(item.id, {
                      borderRadius: Math.max(circleRadiusHint, RAIL_RADIUS_CIRCLE),
                    })
                  }
                  className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                    radius >= circleRadiusHint
                      ? 'bg-blue-600 text-white'
                      : 'border border-slate-300 text-slate-700 dark:border-zinc-600 dark:text-zinc-200'
                  }`}
                >
                  წრე / პილი
                </button>
              </div>
              <NumField
                label="Radius (px)"
                value={radius}
                min={0}
                onCommit={(borderRadius) => onUpdate(item.id, { borderRadius })}
              />
            </div>

            <div className="space-y-1">
              <div className="text-[10px] font-medium text-slate-500">წარწერის პოზიცია (%)</div>
              <div className="grid grid-cols-2 gap-2">
                <NumField
                  label="Label X"
                  value={labelX}
                  min={0}
                  max={100}
                  onCommit={(x) => onUpdate(item.id, { labelX: clampRailPercent(x, 50) })}
                />
                <NumField
                  label="Label Y"
                  value={labelY}
                  min={0}
                  max={100}
                  onCommit={(y) => onUpdate(item.id, { labelY: clampRailPercent(y, 50) })}
                />
              </div>
              <button
                type="button"
                onClick={() =>
                  onUpdate(item.id, {
                    labelX: RAIL_LABEL_DEFAULT.x,
                    labelY: RAIL_LABEL_DEFAULT.y,
                  })
                }
                className="rounded-md border border-slate-300 px-2 py-0.5 text-[10px] font-semibold text-slate-700 hover:bg-white dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                ცენტრში
              </button>
            </div>

            <div className="space-y-1">
              <div className="text-[10px] font-medium text-slate-500">სურათი</div>
              <div className="flex items-center gap-2">
                <div
                  className="h-12 w-12 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-200 dark:border-zinc-600 dark:bg-zinc-800"
                  style={
                    previewUrl
                      ? {
                          backgroundImage: `url(${previewUrl})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }
                      : undefined
                  }
                />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <input
                    ref={(el) => {
                      fileRefs.current[item.id] = el;
                    }}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      if (file) void onSetImage(item.id, file);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileRefs.current[item.id]?.click()}
                    className="rounded-md border border-slate-300 px-2 py-1 text-[10px] font-semibold text-slate-700 hover:bg-white dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    {item.imageId ? 'შეცვლა' : 'ატვირთვა'}
                  </button>
                  {item.imageId ? (
                    <button
                      type="button"
                      onClick={() => onRemoveImage(item.id)}
                      className="rounded-md px-2 py-0.5 text-[10px] font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                    >
                      სურათის წაშლა
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        );
      })}
      {items.length === 0 ? (
        <p className="text-[11px] text-slate-400">ცარიელია — დააჭირე „დამატება“.</p>
      ) : null}
    </div>
  );
}

function NumGrid({
  values,
  onChange,
}: {
  values: { x: number; y: number; w: number; h: number };
  onChange: (patch: Partial<{ x: number; y: number; w: number; h: number }>) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <NumField label="X" value={values.x} onCommit={(x) => onChange({ x })} />
      <NumField label="Y" value={values.y} onCommit={(y) => onChange({ y })} />
      <NumField label="W" value={values.w} min={40} onCommit={(w) => onChange({ w })} />
      <NumField label="H" value={values.h} min={40} onCommit={(h) => onChange({ h })} />
    </div>
  );
}

function NumField({
  label,
  value,
  onCommit,
  min,
  max,
}: {
  label: string;
  value: number;
  onCommit: (n: number) => void;
  min?: number;
  max?: number;
}) {
  const [draft, setDraft] = React.useState(String(Math.round(value)));
  const [focused, setFocused] = React.useState(false);

  React.useEffect(() => {
    if (!focused) setDraft(String(Math.round(value)));
  }, [value, focused]);

  const commitFromRaw = (raw: string) => {
    const parsed = Number(raw.trim());
    let next = Number.isFinite(parsed) ? parsed : value;
    if (min !== undefined) next = Math.max(min, next);
    if (max !== undefined) next = Math.min(max, next);
    next = Math.round(next);
    setDraft(String(next));
    if (next !== Math.round(value)) onCommit(next);
  };

  return (
    <label className="block text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-zinc-400">
      {label}
      <input
        type="text"
        inputMode="numeric"
        className="mt-0.5 w-full rounded-md border border-slate-200 px-2 py-1 text-sm text-slate-800 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
        value={draft}
        onFocus={() => setFocused(true)}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === '' || raw === '-' || /^-?\d*$/.test(raw)) setDraft(raw);
        }}
        onBlur={(e) => {
          setFocused(false);
          commitFromRaw(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
        }}
      />
    </label>
  );
}

function TextField({
  label,
  value,
  onCommit,
}: {
  label: string;
  value: string;
  onCommit: (v: string) => void;
}) {
  const safeValue = value ?? '';
  const [draft, setDraft] = React.useState(safeValue);
  const focusedRef = React.useRef(false);
  const onCommitRef = React.useRef(onCommit);
  onCommitRef.current = onCommit;

  React.useEffect(() => {
    if (!focusedRef.current) setDraft(safeValue);
  }, [safeValue]);

  const commitDraft = (raw: string) => {
    const next = raw;
    setDraft(next);
    if (next !== safeValue) onCommitRef.current(next);
  };

  return (
    <label className="block text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-zinc-400">
      {label}
      <input
        type="text"
        className="mt-0.5 w-full rounded-md border border-slate-200 px-2 py-1 text-sm text-slate-800 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
        value={draft}
        onFocus={() => {
          focusedRef.current = true;
        }}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={(e) => {
          focusedRef.current = false;
          commitDraft(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
        }}
      />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onCommit,
}: {
  label: string;
  value: string;
  onCommit: (v: string) => void;
}) {
  const safeValue = value ?? '';
  const [draft, setDraft] = React.useState(safeValue);
  const focusedRef = React.useRef(false);
  const onCommitRef = React.useRef(onCommit);
  onCommitRef.current = onCommit;

  React.useEffect(() => {
    if (!focusedRef.current) setDraft(safeValue);
  }, [safeValue]);

  const commitDraft = (raw: string) => {
    const next = raw;
    setDraft(next);
    if (next !== safeValue) onCommitRef.current(next);
  };

  return (
    <label className="block text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-zinc-400">
      {label}
      <textarea
        rows={3}
        className="mt-0.5 w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm text-slate-800 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
        value={draft}
        onFocus={() => {
          focusedRef.current = true;
        }}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={(e) => {
          focusedRef.current = false;
          commitDraft(e.target.value);
        }}
      />
    </label>
  );
}
