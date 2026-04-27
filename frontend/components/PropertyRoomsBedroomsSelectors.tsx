'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';

const ROOM_BUTTONS = [1, 2, 3, 4, 5] as const;
/** Same bucket as main filters: 6 means „6+“ */
const ROOMS_PLUS = 6;

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

  /** საძინებელი არ აღემატებოდეს ოთახებს (6+ ოთახი → ყველა საძინებელი დასაშვებია) */
  const bedroomDisabled = (bucket: number | typeof ROOMS_PLUS) => {
    if (roomCount === null) return false;
    if (roomCount >= ROOMS_PLUS) return false;
    if (bucket === ROOMS_PLUS) return true;
    return bucket > roomCount;
  };

  const roomSelectedClass = (selected: boolean) =>
    `w-12 h-12 rounded-xl border-2 font-bold text-lg transition-all hover:scale-105 ${
      selected
        ? 'border-blue-500 bg-blue-500 text-white shadow-md'
        : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300'
    }`;

  const plusSelectedClass = (selected: boolean) =>
    `px-4 h-12 rounded-xl border-2 font-bold transition-all hover:scale-105 ${
      selected
        ? 'border-blue-500 bg-blue-500 text-white shadow-md'
        : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300'
    }`;

  return (
    <>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-3">🚪 {t('rooms_count_label')}</label>
        <div className="flex flex-wrap gap-2">
          {ROOM_BUTTONS.map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => {
                const next = roomCount === num ? null : num;
                setRoomCount(next);
                if (next !== null && next < ROOMS_PLUS && bedroomCount !== null) {
                  if (bedroomCount >= ROOMS_PLUS || bedroomCount > next) {
                    setBedroomCount(next);
                  }
                }
              }}
              className={roomSelectedClass(roomCount === num)}
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              const next = roomCount === ROOMS_PLUS ? null : ROOMS_PLUS;
              setRoomCount(next);
            }}
            className={plusSelectedClass(roomCount === ROOMS_PLUS)}
          >
            6+
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-3 mt-5">🛏️ {t('bedrooms_count_label')}</label>
        <div className="flex flex-wrap gap-2">
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
          <button
            type="button"
            disabled={bedroomDisabled(ROOMS_PLUS)}
            onClick={() =>
              !bedroomDisabled(ROOMS_PLUS) &&
              setBedroomCount(bedroomCount === ROOMS_PLUS ? null : ROOMS_PLUS)
            }
            className={`${plusSelectedClass(bedroomCount === ROOMS_PLUS)} ${
              bedroomDisabled(ROOMS_PLUS) ? 'opacity-40 cursor-not-allowed' : ''
            }`}
          >
            6+
          </button>
        </div>
      </div>
    </>
  );
}
