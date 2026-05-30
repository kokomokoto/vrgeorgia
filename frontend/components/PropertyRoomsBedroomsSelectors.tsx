'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';

import { usePresetCountDraftInput } from '@/components/usePresetCountDraftInput';

const ROOM_BUTTONS = [1, 2, 3, 4, 5] as const;
const CUSTOM_ROOM_MIN = 6;

type Props = {
  roomCount: number | null;
  setRoomCount: (v: number | null) => void;
  bedroomCount: number | null;
  setBedroomCount: (v: number | null) => void;
};

export function PropertyRoomsBedroomsSelectors({
  roomCount,
  setRoomCount,
  bedroomCount,
  setBedroomCount,
}: Props) {
  const { t } = useTranslation();

  const applyRoomCount = (next: number | null) => {
    setRoomCount(next);
    if (next !== null && bedroomCount !== null && bedroomCount > next) {
      setBedroomCount(next);
    }
  };

  const isCustomRoom = roomCount !== null && roomCount >= CUSTOM_ROOM_MIN;
  const isCustomBedroom = bedroomCount !== null && bedroomCount >= CUSTOM_ROOM_MIN;
  const showBedroomCustom = roomCount === null || roomCount >= CUSTOM_ROOM_MIN;
  const bedroomCustomMax = roomCount ?? undefined;

  const roomCustom = usePresetCountDraftInput({
    value: roomCount,
    customMin: CUSTOM_ROOM_MIN,
    onCommit: applyRoomCount,
  });

  const bedroomCustom = usePresetCountDraftInput({
    value: bedroomCount,
    customMin: CUSTOM_ROOM_MIN,
    max: bedroomCustomMax,
    onCommit: (n) => {
      if (n === null) setBedroomCount(null);
      else setBedroomCount(n);
    },
  });

  const bedroomDisabled = (num: number) => {
    if (roomCount === null) return false;
    return num > roomCount;
  };

  const roomSelectedClass = (selected: boolean) =>
    `w-12 h-12 rounded-xl border-2 font-bold text-lg transition-all hover:scale-105 ${
      selected
        ? 'border-blue-500 bg-blue-500 text-white shadow-md'
        : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300'
    }`;

  const customRoomInputClass = `w-16 h-12 rounded-xl border-2 text-center font-bold text-lg transition-all focus:outline-none focus:ring-2 focus:ring-blue-300 ${
    isCustomRoom
      ? 'border-blue-500 bg-blue-500 text-white shadow-md'
      : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300'
  }`;

  const customBedroomInputClass = `w-16 h-12 rounded-xl border-2 text-center font-bold text-lg transition-all focus:outline-none focus:ring-2 focus:ring-blue-300 ${
    isCustomBedroom
      ? 'border-blue-500 bg-blue-500 text-white shadow-md'
      : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300'
  }`;

  return (
    <>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-3">🚪 {t('rooms_count_label')}</label>
        <div className="flex flex-wrap items-center gap-2">
          {ROOM_BUTTONS.map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => {
                const next = roomCount === num ? null : num;
                applyRoomCount(next);
              }}
              className={roomSelectedClass(roomCount === num)}
            >
              {num}
            </button>
          ))}
          <input
            type="text"
            inputMode="numeric"
            placeholder={String(CUSTOM_ROOM_MIN)}
            aria-label={t('rooms_count_custom') || t('rooms_count_label')}
            className={customRoomInputClass}
            {...roomCustom.inputProps}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-3 mt-5">🛏️ {t('bedrooms_count_label')}</label>
        <div className="flex flex-wrap items-center gap-2">
          {ROOM_BUTTONS.map((num) => (
            <button
              key={num}
              type="button"
              disabled={bedroomDisabled(num)}
              onClick={() => !bedroomDisabled(num) && setBedroomCount(bedroomCount === num ? null : num)}
              className={`${roomSelectedClass(bedroomCount === num)} ${
                bedroomDisabled(num) ? 'opacity-40 cursor-not-allowed' : ''
              }`}
            >
              {num}
            </button>
          ))}
          {showBedroomCustom && (
            <input
              type="text"
              inputMode="numeric"
              placeholder={String(CUSTOM_ROOM_MIN)}
              aria-label={t('bedrooms_count_custom') || t('bedrooms_count_label')}
              className={customBedroomInputClass}
              {...bedroomCustom.inputProps}
            />
          )}
        </div>
      </div>
    </>
  );
}
