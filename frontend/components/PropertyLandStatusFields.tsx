'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { LAND_STATUS_OPTIONS } from '@/lib/propertyTypeUi';
import type { LandStatus } from '@/lib/types';

export function PropertyLandStatusFields({
  landStatus,
  setLandStatus,
}: {
  landStatus: LandStatus | string;
  setLandStatus: (v: LandStatus | string) => void;
}) {
  const { t } = useTranslation();

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-3">
        🌾 {t('land_status_label')}
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {LAND_STATUS_OPTIONS.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() =>
              setLandStatus(landStatus === item.value ? '' : item.value)
            }
            className={`px-3 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
              landStatus === item.value
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300'
            }`}
          >
            {t(item.labelKey)}
          </button>
        ))}
      </div>
    </div>
  );
}
