'use client';

import { useTranslation } from 'react-i18next';
import {
  applyFloorChange,
  applyTotalFloorsChange,
  finalizeFloorAfterTotalChange,
  getFloorInputMax,
} from '@/lib/propertyDetailValidation';

/** ტიპები, სადაც მთლიანი ობიექტი იყიდება — საკმარისია სართულიანობა */
export function isWholeBuildingPropertyType(type: string): boolean {
  return type === 'house' || type === 'cottage';
}

type Props = {
  type: string;
  floor: string;
  totalFloors: string;
  setFloor: (v: string) => void;
  setTotalFloors: (v: string) => void;
};

export function PropertyFloorFields({
  type,
  floor,
  totalFloors,
  setFloor,
  setTotalFloors,
}: Props) {
  const { t } = useTranslation();
  const wholeBuilding = isWholeBuildingPropertyType(type);
  const floorMax = getFloorInputMax(totalFloors);

  const onTotalFloorsChange = (value: string) => {
    const next = applyTotalFloorsChange(value, floor);
    setTotalFloors(next.totalFloors);
  };

  const onTotalFloorsBlur = () => {
    const next = finalizeFloorAfterTotalChange(totalFloors, floor);
    setTotalFloors(next.totalFloors);
    setFloor(next.floor);
  };

  return (
    <div>
      <label className="mb-3 block text-sm font-medium text-slate-700">
        🏢 {wholeBuilding ? t('house_storeys') : t('floor_label')}{' '}
        <span className="font-normal text-slate-400">({t('cadastral_optional')})</span>
      </label>

      {wholeBuilding ? (
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs text-slate-500">{t('total_floors')}</label>
            <input
              type="number"
              min={1}
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              placeholder={t('house_storeys_example')}
              value={totalFloors}
              onChange={(e) => onTotalFloorsChange(e.target.value)}
              onBlur={onTotalFloorsBlur}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">
              {t('which_floor')}{' '}
              <span className="font-normal text-slate-400">({t('cadastral_optional')})</span>
            </label>
            <input
              type="number"
              min={1}
              max={floorMax}
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              placeholder={t('floor_example')}
              value={floor}
              onChange={(e) => setFloor(applyFloorChange(e.target.value, totalFloors))}
            />
            <p className="mt-1.5 text-xs text-slate-500">{t('house_which_floor_hint')}</p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs text-slate-500">{t('total_floors')}</label>
              <input
                type="number"
                min={1}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                placeholder={t('total_floors_example')}
                value={totalFloors}
                onChange={(e) => onTotalFloorsChange(e.target.value)}
                onBlur={onTotalFloorsBlur}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">{t('which_floor')}</label>
              <input
                type="number"
                min={1}
                max={floorMax}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                placeholder={t('floor_example')}
                value={floor}
                onChange={(e) => setFloor(applyFloorChange(e.target.value, totalFloors))}
              />
            </div>
          </div>
          {floorMax !== undefined && (
            <p className="mt-2 text-xs text-slate-500">{t('floor_max_hint', { max: floorMax })}</p>
          )}
        </>
      )}
    </div>
  );
}
