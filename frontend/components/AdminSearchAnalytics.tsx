'use client';

type StatRow = { _id: string; count: number };

export type SearchAnalyticsData = {
  totalSearches: number;
  uniqueSearchers: number;
  sourceStats: StatRow[];
  dealTypeStats: StatRow[];
  typeStats: StatRow[];
  searchCityStats: StatRow[];
  regionStats: StatRow[];
  textQueryStats: StatRow[];
  roomsStats: StatRow[];
  bedroomsStats: StatRow[];
  amenitiesStats: StatRow[];
  tbilisiDistrictStats: StatRow[];
  tbilisiSubdistrictStats: StatRow[];
  buildingProjectStats: StatRow[];
  renovationStatusStats: StatRow[];
  balconiesStats: StatRow[];
  dailySearches: { _id: string; count: number }[];
  priceScaleStats: StatRow[];
  pricePerSqmScaleStats: StatRow[];
  sqmScaleStats: StatRow[];
  featureStats: {
    has3d: number;
    hasPhotos: number;
    priceFilter: number;
    sqmFilter: number;
    constructionYearFilter: number;
    renovationYearFilter: number;
    propertyIdSearch: number;
  };
};

const SOURCE_LABELS: Record<string, string> = {
  home: 'მთავარი გვერდი',
  map: 'რუკა',
  agent: 'აგენტის პროფილი',
  admin_tours: '3D ტურები (ადმინ)',
  admin_properties: 'განცხადებები (ადმინ)',
};

const DEAL_LABELS: Record<string, string> = {
  sale: '💰 ყიდვა',
  rent: '🔑 ქირაობა',
  mortgage: '🏦 გირავნობა',
};

const TYPE_LABELS: Record<string, string> = {
  apartment: '🏢 ბინა',
  house: '🏠 სახლი',
  commercial: '🏪 კომერციული',
  land: '🌍 მიწა',
  cottage: '🏡 კოტეჯი',
  hotel: '🏨 სასტუმრო',
  building: '🏗️ შენობა',
  warehouse: '📦 საწყობი',
  parking: '🚗 პარკინგი',
  business: '💼 ბიზნესი',
};

const AMENITY_LABELS: Record<string, string> = {
  elevator: 'ლიფტი',
  furniture: 'ავეჯი',
  internet: 'ინტერნეტი',
  airConditioner: 'კონდიციონერი',
  centralHeating: 'ცენტრალური გათბობა',
  naturalGas: 'ბუნებრივი გაზი',
  garage: 'ავტოფარეხი',
  security: 'დაცვა',
  pool: 'აუზი',
  garden: 'ბაღი',
  terrace: 'ტერასა',
  isolatedKitchen: 'იზოლირებული სამზარეულო',
  heatingCooling: 'გათბობა/გაგრილება',
  basement: 'სარდაფი',
  storage: 'სათავსო',
  electricity: 'ელექტროენერგია',
  water: 'წყალი',
  fireplace: 'ბუხარი',
};

function labelFor(category: string, value: string): string {
  if (category === 'dealType') return DEAL_LABELS[value] || value;
  if (category === 'type') return TYPE_LABELS[value] || value;
  if (category === 'source') return SOURCE_LABELS[value] || value;
  if (category === 'amenity') return AMENITY_LABELS[value] || value;
  if (category === 'rooms' || category === 'bedrooms' || category === 'balconies') {
    return value === '6' ? `${value}+` : value;
  }
  return value;
}

function StatTable({
  title,
  items,
  category,
  emptyText = 'მონაცემები არ არის',
  preserveOrder = false,
}: {
  title: string;
  items: StatRow[];
  category?: string;
  emptyText?: string;
  preserveOrder?: boolean;
}) {
  if (!items.length) {
    return (
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h3 className="mb-3 text-base font-semibold text-gray-800">{title}</h3>
        <p className="text-sm text-gray-400">{emptyText}</p>
      </div>
    );
  }

  const displayItems = preserveOrder
    ? items
    : [...items].sort((a, b) => b.count - a.count);
  const max = Math.max(...displayItems.map((i) => i.count), 1);

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm">
      <h3 className="mb-3 text-base font-semibold text-gray-800">{title}</h3>
      <div className="space-y-2.5">
        {displayItems.map((item, i) => (
          <div key={`${title}-${item._id}-${i}`}>
            <div className="mb-1 flex items-center justify-between gap-2 text-sm">
              <span className="truncate font-medium text-gray-800">
                {category ? labelFor(category, item._id) : item._id}
              </span>
              <span className="shrink-0 text-gray-500">{item.count}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-100">
              <div
                className="h-2 rounded-full bg-indigo-500 transition-all"
                style={{ width: `${Math.max(4, (item.count / max) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminSearchAnalytics({ data }: { data: SearchAnalyticsData }) {
  const featureItems = [
    { label: '🎯 3D ტური', count: data.featureStats.has3d },
    { label: '📷 ფოტოები', count: data.featureStats.hasPhotos },
    { label: '💵 ფასის ფილტრი', count: data.featureStats.priceFilter },
    { label: '📐 ფართობის ფილტრი', count: data.featureStats.sqmFilter },
    { label: '🏗️ აშენების წელი', count: data.featureStats.constructionYearFilter },
    { label: '🔧 რემონტის წელი', count: data.featureStats.renovationYearFilter },
    { label: '🔢 ID-ით ძებნა', count: data.featureStats.propertyIdSearch },
  ].filter((x) => x.count > 0);

  const maxDaily = Math.max(...data.dailySearches.map((d) => d.count), 1);

  return (
    <div className="mb-8">
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">სულ ძიება</p>
          <p className="text-3xl font-bold text-gray-800">{data.totalSearches.toLocaleString()}</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">უნიკალური მომძებნე</p>
          <p className="text-3xl font-bold text-gray-800">{data.uniqueSearchers.toLocaleString()}</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">ყველაზე ხშირი გარიგება</p>
          <p className="text-lg font-bold text-indigo-700">
            {data.dealTypeStats[0]
              ? labelFor('dealType', data.dealTypeStats[0]._id)
              : '—'}
          </p>
          {data.dealTypeStats[0] && (
            <p className="text-sm text-gray-500">{data.dealTypeStats[0].count} ძიება</p>
          )}
        </div>
      </div>

      {data.dailySearches.length > 0 && (
        <div className="mb-6 rounded-xl bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-gray-800">ძიებები დღეების მიხედვით</h3>
          <div className="flex h-40 items-end gap-1">
            {data.dailySearches.map((day) => (
              <div key={day._id} className="flex flex-1 flex-col items-center gap-1" title={`${day._id}: ${day.count}`}>
                <span className="text-xs text-gray-500">{day.count}</span>
                <div
                  className="w-full rounded-t bg-indigo-500 transition-all"
                  style={{ height: `${(day.count / maxDaily) * 120}px`, minHeight: day.count > 0 ? 4 : 0 }}
                />
                <span className="text-xs text-gray-500">{day._id.slice(5)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {(data.priceScaleStats.length > 0 ||
        data.pricePerSqmScaleStats.length > 0 ||
        data.sqmScaleStats.length > 0) && (
        <div className="mb-6 rounded-xl bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800">💵 ფასი და 📐 ფართობი — რას ეძებენ</h3>
          <p className="mt-1 mb-4 text-sm text-gray-500">
            min/max ფილტრის საშუალო მნიშვნელობით ჯგუფდება დიაპაზონში. GEL ფასები USD-ში გადაყვანილია (~2.75).
          </p>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <StatTable title="საერთო ფასი (USD)" items={data.priceScaleStats} preserveOrder />
            <StatTable title="ფასი მ²-ზე (USD)" items={data.pricePerSqmScaleStats} preserveOrder />
            <StatTable title="ფართობი (მ²)" items={data.sqmScaleStats} preserveOrder />
          </div>
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <StatTable title="💰 გარიგების ტიპი" items={data.dealTypeStats} category="dealType" />
        <StatTable title="🏠 ობიექტის ტიპი" items={data.typeStats} category="type" />
        <StatTable title="📍 სად (ქალაქი)" items={data.searchCityStats} />
        <StatTable title="🗺️ რეგიონი" items={data.regionStats} />
        <StatTable title="🏙️ თბილისის უბანი" items={data.tbilisiDistrictStats} />
        <StatTable title="📌 თბილისის ქვეუბანი" items={data.tbilisiSubdistrictStats} />
        <StatTable title="🔤 ტექსტური ძიება" items={data.textQueryStats} />
        <StatTable title="🛏️ ოთახები" items={data.roomsStats} category="rooms" />
        <StatTable title="🛌 საძინებლები" items={data.bedroomsStats} category="bedrooms" />
        <StatTable title="🌿 აივანი" items={data.balconiesStats} category="balconies" />
        <StatTable title="✨ კომფორტი" items={data.amenitiesStats} category="amenity" />
        <StatTable title="🏗️ პროექტი" items={data.buildingProjectStats} />
        <StatTable title="🔧 რემონტი" items={data.renovationStatusStats} />
        <StatTable title="📱 საიდან ეძებენ" items={data.sourceStats} category="source" />
      </div>

      {featureItems.length > 0 && (
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-base font-semibold text-gray-800">დამატებითი ფილტრები</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {featureItems.map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
                <span className="text-sm font-medium text-gray-700">{item.label}</span>
                <span className="text-sm font-bold text-indigo-600">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.totalSearches === 0 && (
        <p className="mt-4 text-center text-sm text-gray-400">
          სერჩის მონაცემები გამოჩნდება, როცა მომხმარებლები დაიწყებენ ფილტრების გამოყენებას.
        </p>
      )}
    </div>
  );
}
