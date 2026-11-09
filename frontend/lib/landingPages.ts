/**
 * Crawlable SEO landing pages: city × (district) × property type × deal.
 *
 *   /tbilisi                                → city hub
 *   /tbilisi/apartments-for-sale            → segment page
 *   /tbilisi/saburtalo/apartments-for-rent  → district segment page
 *
 * Every page is server-rendered with live counts, median price / m², the
 * latest listings (real links), unique intro copy and an FAQ — in ka / en / ru.
 */

import type { PropertyType, DealType } from '@/lib/types';
import { TBILISI_ZONE_KEY_MAP, type TbilisiDistrictGroupKey } from '@/lib/tbilisiOfficialDistricts';
import type { SiteLang } from '@/lib/siteLang';

type L10n = Record<SiteLang, string>;

/* ------------------------------------------------------------------ */
/* Taxonomy                                                            */
/* ------------------------------------------------------------------ */

export type LandingCity = {
  slug: string;
  /** Exact `city` value stored on listings. */
  cityKa: string;
  region: string;
  name: L10n;
  /** Locative form used in sentences: "თბილისში", "in Tbilisi", "в Тбилиси". */
  inName: L10n;
  /** Short editorial note for unique copy. */
  blurb: L10n;
};

export const LANDING_CITIES: LandingCity[] = [
  {
    slug: 'tbilisi',
    cityKa: 'თბილისი',
    region: 'tbilisi',
    name: { ka: 'თბილისი', en: 'Tbilisi', ru: 'Тбилиси' },
    inName: { ka: 'თბილისში', en: 'in Tbilisi', ru: 'в Тбилиси' },
    blurb: {
      ka: 'დედაქალაქი — ქვეყნის უძრავი ქონების ბაზრის ცენტრი: ვაკე-საბურთალოს პრემიუმ სეგმენტიდან გლდანისა და ვარკეთილის ხელმისაწვდომ მიკრორაიონებამდე, ახალაშენებული კომპლექსებიდან ძველი თბილისის ისტორიულ სახლებამდე.',
      en: 'The capital is the centre of Georgia’s property market — from the premium Vake–Saburtalo belt to affordable micro-districts in Gldani and Varketili, and from new-build complexes to historic houses in Old Tbilisi.',
      ru: 'Столица — центр рынка недвижимости Грузии: от премиального пояса Ваке–Сабуртало до доступных микрорайонов Глдани и Варкетили, от новостроек до исторических домов Старого Тбилиси.',
    },
  },
  {
    slug: 'batumi',
    cityKa: 'ბათუმი',
    region: 'adjara',
    name: { ka: 'ბათუმი', en: 'Batumi', ru: 'Батуми' },
    inName: { ka: 'ბათუმში', en: 'in Batumi', ru: 'в Батуми' },
    blurb: {
      ka: 'შავი ზღვის მთავარი კურორტი — ზღვისპირა ახალაშენებები, საინვესტიციო აპარტამენტები და სეზონური გაქირავების მაღალი მოთხოვნა.',
      en: 'Georgia’s main Black Sea resort — seafront new-builds, investment apartments and strong seasonal rental demand.',
      ru: 'Главный курорт Чёрного моря — новостройки у моря, инвестиционные апартаменты и высокий сезонный спрос на аренду.',
    },
  },
  {
    slug: 'kutaisi',
    cityKa: 'ქუთაისი',
    region: 'imereti',
    name: { ka: 'ქუთაისი', en: 'Kutaisi', ru: 'Кутаиси' },
    inName: { ka: 'ქუთაისში', en: 'in Kutaisi', ru: 'в Кутаиси' },
    blurb: {
      ka: 'დასავლეთ საქართველოს ცენტრი საერთაშორისო აეროპორტით — ხელმისაწვდომი ფასები და მზარდი სტუდენტური/საქირავნო ბაზარი.',
      en: 'The hub of western Georgia with an international airport — affordable prices and a growing student and rental market.',
      ru: 'Центр Западной Грузии с международным аэропортом — доступные цены и растущий студенческий и арендный рынок.',
    },
  },
  {
    slug: 'rustavi',
    cityKa: 'რუსთავი',
    region: 'kvemo_kartli',
    name: { ka: 'რუსთავი', en: 'Rustavi', ru: 'Рустави' },
    inName: { ka: 'რუსთავში', en: 'in Rustavi', ru: 'в Рустави' },
    blurb: {
      ka: 'თბილისიდან 25 კმ-ში — დედაქალაქთან ყველაზე ახლოს მდებარე ხელმისაწვდომი ალტერნატივა ბინისა და სახლის შესაძენად.',
      en: '25 km from Tbilisi — the closest affordable alternative to the capital for buying an apartment or a house.',
      ru: 'В 25 км от Тбилиси — ближайшая доступная альтернатива столице для покупки квартиры или дома.',
    },
  },
  {
    slug: 'mtskheta',
    cityKa: 'მცხეთა',
    region: 'mtskheta',
    name: { ka: 'მცხეთა', en: 'Mtskheta', ru: 'Мцхета' },
    inName: { ka: 'მცხეთაში', en: 'in Mtskheta', ru: 'в Мцхете' },
    blurb: {
      ka: 'ძველი დედაქალაქი თბილისის შემოგარენში — სახლები, აგარაკები და მიწის ნაკვეთები ბუნებასთან ახლოს.',
      en: 'The ancient capital on Tbilisi’s doorstep — houses, cottages and land plots close to nature.',
      ru: 'Древняя столица рядом с Тбилиси — дома, дачи и земельные участки на природе.',
    },
  },
  {
    slug: 'gori',
    cityKa: 'გორი',
    region: 'shida_kartli',
    name: { ka: 'გორი', en: 'Gori', ru: 'Гори' },
    inName: { ka: 'გორში', en: 'in Gori', ru: 'в Гори' },
    blurb: {
      ka: 'შიდა ქართლის ცენტრი თბილისიდან ერთ საათში — სახლები და ბინები ხელმისაწვდომ ფასად.',
      en: 'The centre of Shida Kartli, an hour from Tbilisi — affordable houses and apartments.',
      ru: 'Центр Шида-Картли в часе езды от Тбилиси — доступные дома и квартиры.',
    },
  },
];

export type LandingDistrict = {
  slug: string;
  citySlug: 'tbilisi';
  name: L10n;
  inName: L10n;
  blurb: L10n;
  /** Either a whole official district group … */
  districtGroup?: TbilisiDistrictGroupKey;
  /** … or a set of official sub-district keys (filtered by their Georgian names). */
  subdistrictKeys?: string[];
};

export const LANDING_DISTRICTS: LandingDistrict[] = [
  {
    slug: 'vake-saburtalo',
    citySlug: 'tbilisi',
    districtGroup: 'vake_saburtalo',
    name: { ka: 'ვაკე-საბურთალო', en: 'Vake–Saburtalo', ru: 'Ваке–Сабуртало' },
    inName: { ka: 'ვაკე-საბურთალოში', en: 'in Vake–Saburtalo', ru: 'в Ваке–Сабуртало' },
    blurb: {
      ka: 'თბილისის ყველაზე მოთხოვნადი რაიონი — უნივერსიტეტები, ბიზნეს-ცენტრები, პარკები და ქალაქის ყველაზე მაღალი ფასი კვადრატულზე.',
      en: 'Tbilisi’s most sought-after district — universities, business centres, parks and the city’s highest price per square metre.',
      ru: 'Самый востребованный район Тбилиси — университеты, бизнес-центры, парки и самая высокая цена за квадратный метр в городе.',
    },
  },
  {
    slug: 'saburtalo',
    citySlug: 'tbilisi',
    subdistrictKeys: ['sub_vedzisi_yazbegi_gotua_saburtalo', 'sub_kostava_baxtrioni_dolize_xiliani', 'sub_vazha_pshavela', 'sub_nutsubidze_mikro'],
    name: { ka: 'საბურთალო', en: 'Saburtalo', ru: 'Сабуртало' },
    inName: { ka: 'საბურთალოზე', en: 'in Saburtalo', ru: 'на Сабуртало' },
    blurb: {
      ka: 'მეტროსა და უნივერსიტეტების რაიონი — ბევრი ახალაშენებული კომპლექსი, სტუდენტური და საოჯახო ქირა, სტაბილური ლიკვიდობა.',
      en: 'The metro-and-universities district — many new-build complexes, student and family rentals, steady liquidity.',
      ru: 'Район метро и университетов — много новостроек, студенческая и семейная аренда, стабильная ликвидность.',
    },
  },
  {
    slug: 'vake',
    citySlug: 'tbilisi',
    subdistrictKeys: ['sub_vake_bagebi'],
    name: { ka: 'ვაკე', en: 'Vake', ru: 'Ваке' },
    inName: { ka: 'ვაკეში', en: 'in Vake', ru: 'в Ваке' },
    blurb: {
      ka: 'პრემიუმ სეგმენტი ვაკის პარკთან და ჭავჭავაძის გამზირთან — ძველი „სტალინკები“, ახალი ელიტური სახლები და ბაგები.',
      en: 'The premium segment around Vake Park and Chavchavadze Avenue — classic Stalin-era buildings, new upscale homes and Bagebi.',
      ru: 'Премиальный сегмент у парка Ваке и проспекта Чавчавадзе — «сталинки», новые элитные дома и Багеби.',
    },
  },
  {
    slug: 'dighomi',
    citySlug: 'tbilisi',
    subdistrictKeys: ['sub_dighomi_vashlijvari', 'sub_dighmis_masivi'],
    name: { ka: 'დიღომი', en: 'Dighomi', ru: 'Дигоми' },
    inName: { ka: 'დიღომში', en: 'in Dighomi', ru: 'в Дигоми' },
    blurb: {
      ka: 'დიდი დიღომი, დიღმის მასივი და ვაშლიჯვარი — ახალაშენებული კორპუსები, ფართო ეზოები და ყველაზე სწრაფად მზარდი უბანი.',
      en: 'Didi Dighomi, Dighmis Masivi and Vashlijvari — new blocks, wide courtyards and the fastest-growing area of the city.',
      ru: 'Диди Дигоми, Дигомский массив и Вашлиджвари — новые корпуса, просторные дворы и самый быстрорастущий район города.',
    },
  },
  {
    slug: 'old-tbilisi',
    citySlug: 'tbilisi',
    districtGroup: 'old_tbilisi',
    name: { ka: 'ძველი თბილისი', en: 'Old Tbilisi', ru: 'Старый Тбилиси' },
    inName: { ka: 'ძველ თბილისში', en: 'in Old Tbilisi', ru: 'в Старом Тбилиси' },
    blurb: {
      ka: 'მთაწმინდა, სოლოლაკი, ვერა — ისტორიული სახლები, ტურისტული ნაკადი და მოკლევადიანი გაქირავების საუკეთესო ლოკაცია.',
      en: 'Mtatsminda, Sololaki and Vera — historic houses, tourist footfall and the best location for short-term rentals.',
      ru: 'Мтацминда, Сололаки, Вера — исторические дома, туристический поток и лучшая локация для краткосрочной аренды.',
    },
  },
  {
    slug: 'isani-samgori',
    citySlug: 'tbilisi',
    districtGroup: 'isani_samgori',
    name: { ka: 'ისანი-სამგორი', en: 'Isani–Samgori', ru: 'Исани–Самгори' },
    inName: { ka: 'ისანი-სამგორში', en: 'in Isani–Samgori', ru: 'в Исани–Самгори' },
    blurb: {
      ka: 'ავლაბარი, ვარკეთილი, ვაზისუბანი, აეროპორტის მიმდებარე — ხელმისაწვდომი ფასები და მეტროს ორი ხაზი.',
      en: 'Avlabari, Varketili, Vazisubani and the airport side — affordable prices and two metro lines.',
      ru: 'Авлабари, Варкетили, Вазисубани и район аэропорта — доступные цены и две линии метро.',
    },
  },
  {
    slug: 'didube-chughureti',
    citySlug: 'tbilisi',
    districtGroup: 'didube_chughureti',
    name: { ka: 'დიდუბე-ჩუღურეთი', en: 'Didube–Chughureti', ru: 'Дидубе–Чугурети' },
    inName: { ka: 'დიდუბე-ჩუღურეთში', en: 'in Didube–Chughureti', ru: 'в Дидубе–Чугурети' },
    blurb: {
      ka: 'მარჯანიშვილი, დიდუბე, დიღმის მასივი — ცენტრალური ლოკაცია მტკვრის მარცხენა სანაპიროზე, სატრანსპორტო კვანძები.',
      en: 'Marjanishvili, Didube and Dighmis Masivi — a central location on the left bank of the Mtkvari with major transport hubs.',
      ru: 'Марджанишвили, Дидубе, Дигомский массив — центральная локация на левом берегу Куры и крупные транспортные узлы.',
    },
  },
  {
    slug: 'gldani-nadzaladevi',
    citySlug: 'tbilisi',
    districtGroup: 'gldani_nadzaladevi',
    name: { ka: 'გლდანი-ნაძალადევი', en: 'Gldani–Nadzaladevi', ru: 'Глдани–Надзаладеви' },
    inName: { ka: 'გლდანი-ნაძალადევში', en: 'in Gldani–Nadzaladevi', ru: 'в Глдани–Надзаладеви' },
    blurb: {
      ka: 'გლდანის მიკრორაიონები, მუხიანი, თემქა — ქალაქის ყველაზე ხელმისაწვდომი ბინები მეტროსთან ახლოს.',
      en: 'The Gldani micro-districts, Mukhiani and Temka — the most affordable apartments in the city, close to the metro.',
      ru: 'Микрорайоны Глдани, Мухиани, Темка — самые доступные квартиры в городе рядом с метро.',
    },
  },
  {
    slug: 'krtsanisi',
    citySlug: 'tbilisi',
    districtGroup: 'krtsanisi',
    name: { ka: 'კრწანისი', en: 'Krtsanisi', ru: 'Крцаниси' },
    inName: { ka: 'კრწანისში', en: 'in Krtsanisi', ru: 'в Крцаниси' },
    blurb: {
      ka: 'ორთაჭალა, კალა, კრწანისის სამთავრობო რეზიდენციების ზონა — მწვანე, წყნარი უბნები ცენტრთან ახლოს.',
      en: 'Ortachala, Kala and the Krtsanisi residential zone — green, quiet neighbourhoods close to the centre.',
      ru: 'Ортачала, Кала, зона резиденций Крцаниси — зелёные тихие кварталы рядом с центром.',
    },
  },
];

export type LandingType = {
  slug: string;
  type: PropertyType;
  /** Plural noun: "ბინები" / "Apartments" / "Квартиры". */
  plural: L10n;
  singular: L10n;
};

export const LANDING_TYPES: LandingType[] = [
  { slug: 'apartments', type: 'apartment', plural: { ka: 'ბინები', en: 'Apartments', ru: 'Квартиры' }, singular: { ka: 'ბინა', en: 'apartment', ru: 'квартира' } },
  { slug: 'houses', type: 'house', plural: { ka: 'სახლები', en: 'Houses', ru: 'Дома' }, singular: { ka: 'სახლი', en: 'house', ru: 'дом' } },
  { slug: 'commercial', type: 'commercial', plural: { ka: 'კომერციული ფართები', en: 'Commercial properties', ru: 'Коммерческая недвижимость' }, singular: { ka: 'კომერციული ფართი', en: 'commercial property', ru: 'коммерческое помещение' } },
  { slug: 'land', type: 'land', plural: { ka: 'მიწის ნაკვეთები', en: 'Land plots', ru: 'Земельные участки' }, singular: { ka: 'მიწის ნაკვეთი', en: 'land plot', ru: 'земельный участок' } },
  { slug: 'cottages', type: 'cottage', plural: { ka: 'აგარაკები', en: 'Cottages', ru: 'Дачи' }, singular: { ka: 'აგარაკი', en: 'cottage', ru: 'дача' } },
];

export type LandingDeal = {
  slug: string;
  deal: DealType;
  /** "იყიდება" / "for sale" / "продажа" */
  label: L10n;
  verb: L10n;
};

export const LANDING_DEALS: LandingDeal[] = [
  { slug: 'for-sale', deal: 'sale', label: { ka: 'იყიდება', en: 'for sale', ru: 'продажа' }, verb: { ka: 'ყიდვა', en: 'buy', ru: 'купить' } },
  { slug: 'for-rent', deal: 'rent', label: { ka: 'ქირავდება', en: 'for rent', ru: 'аренда' }, verb: { ka: 'ქირაობა', en: 'rent', ru: 'снять' } },
];

/* ------------------------------------------------------------------ */
/* Lookups                                                             */
/* ------------------------------------------------------------------ */

export type LandingSegment = {
  city: LandingCity;
  district: LandingDistrict | null;
  type: LandingType;
  deal: LandingDeal;
};

export function findLandingCity(slug: string): LandingCity | null {
  return LANDING_CITIES.find((c) => c.slug === slug.toLowerCase()) ?? null;
}

export function findLandingDistrict(citySlug: string, slug: string): LandingDistrict | null {
  return (
    LANDING_DISTRICTS.find((d) => d.citySlug === citySlug.toLowerCase() && d.slug === slug.toLowerCase()) ??
    null
  );
}

/** "apartments-for-sale" → { type, deal } */
export function parseLandingSegment(segment: string): { type: LandingType; deal: LandingDeal } | null {
  const s = segment.toLowerCase();
  for (const deal of LANDING_DEALS) {
    if (!s.endsWith(`-${deal.slug}`)) continue;
    const typeSlug = s.slice(0, -(deal.slug.length + 1));
    const type = LANDING_TYPES.find((t) => t.slug === typeSlug);
    if (type) return { type, deal };
  }
  return null;
}

export function segmentSlug(type: LandingType, deal: LandingDeal): string {
  return `${type.slug}-${deal.slug}`;
}

export function landingPath(city: LandingCity, type: LandingType, deal: LandingDeal, district?: LandingDistrict | null): string {
  return district
    ? `/${city.slug}/${district.slug}/${segmentSlug(type, deal)}`
    : `/${city.slug}/${segmentSlug(type, deal)}`;
}

export function cityHubPath(city: LandingCity): string {
  return `/${city.slug}`;
}

export function districtsOfCity(citySlug: string): LandingDistrict[] {
  return LANDING_DISTRICTS.filter((d) => d.citySlug === citySlug);
}

/** Public list rows omit fields and type deal/type as plain strings. */
type LandingListing = {
  city?: string;
  type?: string;
  dealType?: string;
  tbilisiDistrict?: string;
  tbilisiSubdistricts?: string[];
};

/**
 * Paths that have at least one public listing: city hub, city × type × deal,
 * and the district page when the listing maps to one. Empty segments stay out
 * of the sitemap because those pages are noindex.
 */
export function indexableLandingPaths(properties: LandingListing[]): Set<string> {
  const paths = new Set<string>();
  for (const property of properties) {
    const city = LANDING_CITIES.find((c) => c.cityKa === (property.city || '').trim());
    const type = LANDING_TYPES.find((t) => t.type === property.type);
    const deal = LANDING_DEALS.find((d) => d.deal === property.dealType);
    if (!city || !type || !deal) continue;
    paths.add(cityHubPath(city));
    paths.add(landingPath(city, type, deal));
    const href = landingHrefForProperty(property);
    if (href) paths.add(href);
  }
  return paths;
}

/** Best matching hub for a listing (used by breadcrumbs / "more like this"). */
export function landingHrefForProperty(p: LandingListing): string | null {
  const city = LANDING_CITIES.find((c) => c.cityKa === (p.city || '').trim());
  const type = LANDING_TYPES.find((t) => t.type === p.type);
  const deal = LANDING_DEALS.find((d) => d.deal === p.dealType);
  if (!city || !type || !deal) return null;
  let district: LandingDistrict | null = null;
  if (city.slug === 'tbilisi') {
    const subs = (p.tbilisiSubdistricts || []).map((s) => String(s).trim());
    district =
      LANDING_DISTRICTS.find(
        (d) => d.subdistrictKeys && d.subdistrictKeys.some((k) => subs.includes(TBILISI_ZONE_KEY_MAP[k]?.ka))
      ) ??
      LANDING_DISTRICTS.find((d) => d.districtGroup && d.districtGroup === p.tbilisiDistrict) ??
      null;
  }
  return landingPath(city, type, deal, district);
}

/* ------------------------------------------------------------------ */
/* API query for a segment                                             */
/* ------------------------------------------------------------------ */

export function landingApiQuery(seg: LandingSegment): Record<string, string> {
  const q: Record<string, string> = {
    city: seg.city.cityKa,
    type: JSON.stringify([seg.type.type]),
    dealType: JSON.stringify([seg.deal.deal]),
  };
  if (seg.district?.districtGroup) q.tbilisiDistrict = seg.district.districtGroup;
  if (seg.district?.subdistrictKeys?.length) {
    q.tbilisiSubdistricts = JSON.stringify(
      seg.district.subdistrictKeys.map((k) => TBILISI_ZONE_KEY_MAP[k]?.ka).filter(Boolean)
    );
  }
  return q;
}

/** Equivalent search on the interactive map / home filters. */
export function landingSearchHref(seg: LandingSegment, base: '/' | '/map' = '/map'): string {
  const params = new URLSearchParams();
  params.set('city', seg.city.cityKa);
  params.set('region', seg.city.region);
  params.set('type', JSON.stringify([seg.type.type]));
  params.set('dealType', JSON.stringify([seg.deal.deal]));
  if (seg.district?.districtGroup) params.set('tbilisiDistrict', seg.district.districtGroup);
  if (seg.district?.subdistrictKeys?.length) {
    params.set(
      'tbilisiSubdistricts',
      JSON.stringify(seg.district.subdistrictKeys.map((k) => TBILISI_ZONE_KEY_MAP[k]?.ka).filter(Boolean))
    );
  }
  return `${base}?${params.toString()}`;
}

/* ------------------------------------------------------------------ */
/* Copy                                                                */
/* ------------------------------------------------------------------ */

export type LandingStats = {
  count: number;
  with3d: number;
  currency: 'USD';
  usdToGel: number | null;
  price: { median: number | null; avg: number | null; min: number | null; max: number | null };
  pricePerSqm: { median: number | null; avg: number | null; min: number | null; max: number | null };
  area: { median: number | null; avg: number | null };
  rooms: Record<string, number>;
  typeCounts: Record<string, number>;
  dealCounts: Record<string, number>;
  newestAt: string | null;
  generatedAt: string;
};

function placeName(seg: LandingSegment, lang: SiteLang): string {
  return seg.district ? `${seg.district.name[lang]}, ${seg.city.name[lang]}` : seg.city.name[lang];
}

function placeIn(seg: LandingSegment, lang: SiteLang): string {
  return seg.district ? seg.district.inName[lang] : seg.city.inName[lang];
}

export function landingH1(seg: LandingSegment, lang: SiteLang): string {
  const type = seg.type.plural[lang];
  const deal = seg.deal.label[lang];
  const where = placeIn(seg, lang);
  if (lang === 'ka') return `${type} ${deal} ${where}`;
  if (lang === 'ru') return `${type} — ${deal} ${where}`;
  return `${type} ${deal} ${where}`;
}

export function landingTitle(seg: LandingSegment, lang: SiteLang, stats?: LandingStats | null): string {
  const h1 = landingH1(seg, lang);
  const n = stats?.count ? ` (${stats.count})` : '';
  const tail = lang === 'ka' ? '3D ტურები, ფასები, რუკა' : lang === 'ru' ? '3D-туры, цены, карта' : '3D tours, prices, map';
  return `${h1}${n} — ${tail}`;
}

export function fmtUsd(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

export function landingDescription(seg: LandingSegment, lang: SiteLang, stats?: LandingStats | null): string {
  const type = seg.type.plural[lang];
  const deal = seg.deal.label[lang];
  const where = placeIn(seg, lang);
  const count = stats?.count ?? 0;
  const med = stats?.price.median;
  const sqm = stats?.pricePerSqm.median;
  const perSqm = seg.type.type !== 'land' && sqm ? ` ${fmtUsd(sqm)}/m²` : '';
  if (lang === 'ka') {
    return `${count} ${type.toLowerCase()} ${deal} ${where} — მედიანური ფასი ${fmtUsd(med)}${perSqm ? `, ${perSqm.trim()}` : ''}. ფოტოები, 3D ტურები, ფასები და მფლობელის კონტაქტი. განახლებულია ყოველდღე — Vhome.ge.`;
  }
  if (lang === 'ru') {
    return `${count} ${type.toLowerCase()} — ${deal} ${where}. Медианная цена ${fmtUsd(med)}${perSqm ? `, ${perSqm.trim()}` : ''}. Фото, 3D-туры, цены и контакты владельцев. Обновляется ежедневно — Vhome.ge.`;
  }
  return `${count} ${type.toLowerCase()} ${deal} ${where}. Median price ${fmtUsd(med)}${perSqm ? `, ${perSqm.trim()}` : ''}. Photos, 3D tours, prices and direct owner contacts. Updated daily on Vhome.ge.`;
}

export type LandingParagraphs = string[];

/** 250–400 words of unique, data-driven intro copy. */
export function landingIntro(seg: LandingSegment, lang: SiteLang, stats: LandingStats | null): LandingParagraphs {
  const type = seg.type.plural[lang];
  const typeLower = type.toLowerCase();
  const single = seg.type.singular[lang];
  const deal = seg.deal.label[lang];
  const where = placeIn(seg, lang);
  const place = placeName(seg, lang);
  const count = stats?.count ?? 0;
  const med = stats?.price.median;
  const min = stats?.price.min;
  const max = stats?.price.max;
  const sqm = stats?.pricePerSqm.median;
  const area = stats?.area.median;
  const with3d = stats?.with3d ?? 0;
  const isLand = seg.type.type === 'land';
  const isRent = seg.deal.deal === 'rent';
  const blurb = seg.district ? seg.district.blurb[lang] : seg.city.blurb[lang];
  const roomsEntries = Object.entries(stats?.rooms ?? {}).sort((a, b) => b[1] - a[1]).slice(0, 3);

  if (lang === 'ka') {
    const p1 = `${type} ${deal} ${where} — Vhome.ge-ზე ამჟამად ${count} აქტიური განცხადებაა. ${blurb}`;
    const p2 =
      count > 0
        ? `ფასების სურათი: მედიანური ფასი ${fmtUsd(med)}${isRent ? ' თვეში' : ''}, დიაპაზონი ${fmtUsd(min)}–${fmtUsd(max)}.${
            !isLand && sqm ? ` კვადრატული მეტრის მედიანური ღირებულება ${fmtUsd(sqm)}/მ²${area ? `, ტიპური ფართობი კი ${area} მ²` : ''}.` : ''
          }${
            roomsEntries.length
              ? ` ყველაზე ხშირად გვხვდება ${roomsEntries.map(([r, c]) => `${r}-ოთახიანი (${c})`).join(', ')} ვარიანტები.`
              : ''
          } ფასები USD-შია; ლარში გადაყვანა ხდება ეროვნული ბანკის მიმდინარე კურსით${stats?.usdToGel ? ` (1 USD ≈ ${stats.usdToGel} GEL)` : ''}.`
        : `ამ სეგმენტში ახალი განცხადებები რეგულარულად ემატება — შეინახეთ გვერდი ან გამოიყენეთ რუკაზე ძებნა მეზობელი უბნებისთვის.`;
    const p3 = `რით განსხვავდება Vhome: ${with3d > 0 ? `${with3d} განცხადებას აქვს ინტერაქტიული 3D ტური (Gaussian splatting ან 360° პანორამა), ` : ''}ყველა ობიექტს აქვს ზუსტი მდებარეობა რუკაზე, ფოტოები, ${isLand ? 'ფართობი და სტატუსი (სასოფლო/არასასოფლო)' : 'ფართობი, ოთახები და სართული'}, ასევე მფლობელის ან აგენტის პირდაპირი კონტაქტი — შუამავლის გარეშე. განცხადებები ქვეყნდება მოდერაციის შემდეგ, დუბლიკატები კი ავტომატურად იფილტრება.`;
    const p4 = `როგორ ${isRent ? 'ვიქირაოთ' : 'ვიყიდოთ'} ${single} ${where}: დაიწყეთ ფასის და ფართობის ფილტრით, შეადარეთ რამდენიმე ვარიანტი „შედარების“ ფუნქციით, ნახეთ 3D ტური ვიზიტამდე და დაუკავშირდით განმთავსებელს ტელეფონით ან WhatsApp-ით. ${
      isRent
        ? 'გრძელვადიანი ქირისთვის ჩვეულებრივ 1 თვის დეპოზიტი მოითხოვება; მოკლევადიანი ქირა ცენტრალურ უბნებში 20–40%-ით ძვირია.'
        : 'ყიდვისას გადაამოწმეთ საკადასტრო კოდი საჯარო რეესტრში და გამოიყენეთ ჩვენი იპოთეკის კალკულატორი ყოველთვიური გადასახადის დასათვლელად.'
    }`;
    return [p1, p2, p3, p4];
  }

  if (lang === 'ru') {
    const p1 = `${type} — ${deal} ${where}: на Vhome.ge сейчас ${count} активных объявлений. ${blurb}`;
    const p2 =
      count > 0
        ? `Картина цен: медианная цена ${fmtUsd(med)}${isRent ? ' в месяц' : ''}, диапазон ${fmtUsd(min)}–${fmtUsd(max)}.${
            !isLand && sqm ? ` Медианная стоимость квадратного метра — ${fmtUsd(sqm)}/м²${area ? `, типичная площадь — ${area} м²` : ''}.` : ''
          }${
            roomsEntries.length
              ? ` Чаще всего встречаются ${roomsEntries.map(([r, c]) => `${r}-комнатные (${c})`).join(', ')} варианты.`
              : ''
          } Цены указаны в USD; пересчёт в лари — по текущему курсу Нацбанка${stats?.usdToGel ? ` (1 USD ≈ ${stats.usdToGel} GEL)` : ''}.`
        : `Новые объявления в этом сегменте появляются регулярно — сохраните страницу или воспользуйтесь поиском на карте по соседним районам.`;
    const p3 = `Чем отличается Vhome: ${with3d > 0 ? `у ${with3d} объявлений есть интерактивный 3D-тур (Gaussian splatting или 360°-панорама), ` : ''}у каждого объекта точная геолокация на карте, фотографии, ${isLand ? 'площадь и статус (сельхоз/несельхоз)' : 'площадь, комнаты и этаж'}, а также прямой контакт владельца или агента — без посредников. Объявления публикуются после модерации, дубликаты фильтруются автоматически.`;
    const p4 = `Как ${isRent ? 'снять' : 'купить'} ${single} ${where}: начните с фильтра по цене и площади, сравните несколько вариантов функцией «Сравнить», посмотрите 3D-тур до визита и свяжитесь с автором объявления по телефону или WhatsApp. ${
      isRent
        ? 'При долгосрочной аренде обычно требуется депозит в размере месячной платы; краткосрочная аренда в центральных районах дороже на 20–40%.'
        : 'При покупке проверьте кадастровый код в Публичном реестре и рассчитайте ежемесячный платёж в нашем ипотечном калькуляторе.'
    }`;
    return [p1, p2, p3, p4];
  }

  const p1 = `${type} ${deal} ${where}: Vhome.ge currently lists ${count} active ${count === 1 ? 'property' : 'properties'} in ${place}. ${blurb}`;
  const p2 =
    count > 0
      ? `Price snapshot: the median asking price is ${fmtUsd(med)}${isRent ? ' per month' : ''}, with listings ranging from ${fmtUsd(min)} to ${fmtUsd(max)}.${
          !isLand && sqm ? ` The median price per square metre is ${fmtUsd(sqm)}/m²${area ? `, and the typical size is ${area} m²` : ''}.` : ''
        }${
          roomsEntries.length
            ? ` The most common layouts are ${roomsEntries.map(([r, c]) => `${r}-room (${c})`).join(', ')}.`
            : ''
        } Prices are quoted in USD; GEL conversion uses the National Bank’s current rate${stats?.usdToGel ? ` (1 USD ≈ ${stats.usdToGel} GEL)` : ''}.`
      : `New listings in this segment are added regularly — bookmark this page or use the map search to explore neighbouring areas.`;
  const p3 = `What makes Vhome different: ${with3d > 0 ? `${with3d} of these listings include an interactive 3D tour (Gaussian splatting or 360° panorama), ` : ''}every property has an exact map location, photos, ${isLand ? 'plot size and status (agricultural / non-agricultural)' : 'floor area, rooms and floor'}, plus a direct phone or WhatsApp contact for the owner or agent — no middlemen. Listings go live after moderation and duplicates are filtered automatically.`;
  const p4 = `How to ${isRent ? 'rent' : 'buy'} a ${single} ${where}: start with the price and area filters, shortlist a few options with the Compare tool, walk through the 3D tour before visiting and contact the lister directly. ${
    isRent
      ? 'Long-term rentals usually require a one-month deposit; short-term rates in central districts run 20–40% higher.'
      : 'Before buying, verify the cadastral code in the Public Registry and use our mortgage calculator to estimate the monthly payment.'
  }`;
  return [p1, p2, p3, p4];
}

export function landingFaq(seg: LandingSegment, lang: SiteLang, stats: LandingStats | null): { question: string; answer: string }[] {
  const type = seg.type.plural[lang];
  const typeLower = type.toLowerCase();
  const single = seg.type.singular[lang];
  const where = placeIn(seg, lang);
  const med = fmtUsd(stats?.price.median);
  const sqm = fmtUsd(stats?.pricePerSqm.median);
  const isRent = seg.deal.deal === 'rent';
  const isLand = seg.type.type === 'land';
  const count = stats?.count ?? 0;

  if (lang === 'ka') {
    return [
      {
        question: `რა ღირს ${single} ${where}?`,
        answer: `Vhome.ge-ზე განთავსებული ${count} განცხადების მიხედვით მედიანური ფასი ${med}${isRent ? ' თვეში' : ''}${!isLand && stats?.pricePerSqm.median ? `, ხოლო კვადრატული მეტრი — ${sqm}` : ''}. ფასი დამოკიდებულია მდგომარეობაზე (შავი/თეთრი კარკასი, გარემონტებული), სართულზე, პროექტსა და მეტროსთან სიახლოვეზე.`,
      },
      {
        question: `არის თუ არა ფასები USD-ში თუ ლარში?`,
        answer: `განცხადებები ძირითადად დოლარშია, ნაწილი — ლარში. საიტი ავტომატურად ითვლის ორივე ვალუტას ეროვნული ბანკის მიმდინარე კურსით${stats?.usdToGel ? ` (1 USD ≈ ${stats.usdToGel} GEL)` : ''}, ფილტრებიც ამავე კურსით მუშაობს.`,
      },
      {
        question: `შემიძლია ობიექტი ვიზიტამდე ვნახო?`,
        answer: `დიახ — ${stats?.with3d ? `${stats.with3d} განცხადებას` : 'ბევრ განცხადებას'} აქვს ინტერაქტიული 3D ტური ან 360° პანორამა, რომლითაც სივრცეს ტელეფონიდანვე დაათვალიერებთ. ყველა ობიექტს აქვს ფოტოები და ზუსტი მდებარეობა რუკაზე.`,
      },
      {
        question: isRent ? `რა დოკუმენტებია საჭირო ქირაობისთვის?` : `როგორ გადავამოწმო ${single} ყიდვამდე?`,
        answer: isRent
          ? `სტანდარტულად საკმარისია პირადობის მოწმობა და წერილობითი ხელშეკრულება; მფლობელები ხშირად ითხოვენ 1 თვის დეპოზიტს. უცხოელი ქირავნობისას იგივე წესები მოქმედებს.`
          : `მოითხოვეთ საკადასტრო კოდი და გადაამოწმეთ საჯარო რეესტრში (napr.gov.ge) მესაკუთრე და ყადაღები. ახალაშენებულზე შეამოწმეთ დეველოპერის ნებართვა და ჩაბარების ვადა. უცხოელებს შეუძლიათ ბინისა და არასასოფლო მიწის შეძენა შეზღუდვის გარეშე.`,
      },
      {
        question: `როგორ დავუკავშირდე განმთავსებელს?`,
        answer: `თითოეული განცხადების გვერდზე არის ტელეფონის ნომერი, WhatsApp/Viber ღილაკები და აგენტის პროფილი. Vhome არ იღებს საკომისიოს მყიდველისგან ან დამქირავებლისგან.`,
      },
    ];
  }

  if (lang === 'ru') {
    return [
      {
        question: `Сколько стоит ${single} ${where}?`,
        answer: `По ${count} объявлениям на Vhome.ge медианная цена — ${med}${isRent ? ' в месяц' : ''}${!isLand && stats?.pricePerSqm.median ? `, квадратный метр — ${sqm}` : ''}. Цена зависит от состояния (чёрный/белый каркас, с ремонтом), этажа, проекта дома и близости к метро.`,
      },
      {
        question: `Цены указаны в долларах или в лари?`,
        answer: `Большинство объявлений — в USD, часть — в GEL. Сайт автоматически пересчитывает обе валюты по текущему курсу Нацбанка${stats?.usdToGel ? ` (1 USD ≈ ${stats.usdToGel} GEL)` : ''}; фильтры работают по тому же курсу.`,
      },
      {
        question: `Можно ли посмотреть объект до визита?`,
        answer: `Да — ${stats?.with3d ? `у ${stats.with3d} объявлений` : 'у многих объявлений'} есть интерактивный 3D-тур или 360°-панорама, которые можно открыть прямо с телефона. У всех объектов есть фото и точная локация на карте.`,
      },
      {
        question: isRent ? `Какие документы нужны для аренды?` : `Как проверить ${single} перед покупкой?`,
        answer: isRent
          ? `Обычно достаточно удостоверения личности и письменного договора; владельцы часто просят депозит в размере месячной платы. Для иностранцев правила те же.`
          : `Запросите кадастровый код и проверьте собственника и обременения в Публичном реестре (napr.gov.ge). В новостройке проверьте разрешение застройщика и срок сдачи. Иностранцы могут покупать квартиры и несельскохозяйственную землю без ограничений.`,
      },
      {
        question: `Как связаться с автором объявления?`,
        answer: `На странице каждого объявления есть телефон, кнопки WhatsApp/Viber и профиль агента. Vhome не берёт комиссию с покупателя или арендатора.`,
      },
    ];
  }

  return [
    {
      question: `How much does a ${single} cost ${where}?`,
      answer: `Across ${count} listings on Vhome.ge the median asking price is ${med}${isRent ? ' per month' : ''}${!isLand && stats?.pricePerSqm.median ? `, or ${sqm} per square metre` : ''}. Prices vary with condition (black/white frame vs renovated), floor, building project and distance to the metro.`,
    },
    {
      question: `Are prices in USD or GEL?`,
      answer: `Most listings are priced in USD, some in GEL. The site converts both ways using the National Bank of Georgia’s current rate${stats?.usdToGel ? ` (1 USD ≈ ${stats.usdToGel} GEL)` : ''}, and the filters use the same rate.`,
    },
    {
      question: `Can I view a property before visiting?`,
      answer: `Yes — ${stats?.with3d ? `${stats.with3d} listings` : 'many listings'} include an interactive 3D tour or 360° panorama you can explore from your phone. Every property has photos and an exact map location.`,
    },
    {
      question: isRent ? `What documents do I need to rent?` : `How do I verify a ${single} before buying?`,
      answer: isRent
        ? `An ID document and a written contract are normally enough; owners often ask for a one-month deposit. The same rules apply to foreign tenants.`
        : `Ask for the cadastral code and check the owner and any liens in the Public Registry (napr.gov.ge). For new builds, confirm the developer’s permit and completion date. Foreigners can buy apartments and non-agricultural land without restrictions.`,
    },
    {
      question: `How do I contact the lister?`,
      answer: `Each listing page shows a phone number, WhatsApp/Viber buttons and the agent’s profile. Vhome charges no commission to buyers or tenants.`,
    },
  ];
}

/** Hub copy for /{city}. */
export function cityHubText(city: LandingCity, lang: SiteLang) {
  if (lang === 'ka') {
    return {
      h1: `უძრავი ქონება ${city.inName.ka}`,
      title: `უძრავი ქონება ${city.inName.ka} — ბინები, სახლები, კომერციული ფართი | Vhome`,
      description: `${city.name.ka}: ბინები და სახლები იყიდება და ქირავდება, კომერციული ფართები და მიწა. ლაივ ფასები უბნების მიხედვით, 3D ტურები და რუკა — Vhome.ge.`,
      intro: city.blurb.ka,
      segmentsTitle: 'რას ეძებთ?',
      districtsTitle: 'უბნების მიხედვით',
    };
  }
  if (lang === 'ru') {
    return {
      h1: `Недвижимость ${city.inName.ru}`,
      title: `Недвижимость ${city.inName.ru} — квартиры, дома, коммерция | Vhome`,
      description: `${city.name.ru}: квартиры и дома — продажа и аренда, коммерческие площади и земля. Актуальные цены по районам, 3D-туры и карта — Vhome.ge.`,
      intro: city.blurb.ru,
      segmentsTitle: 'Что вы ищете?',
      districtsTitle: 'По районам',
    };
  }
  return {
    h1: `Real estate ${city.inName.en}`,
    title: `Real estate ${city.inName.en} — apartments, houses, commercial | Vhome`,
    description: `${city.name.en}: apartments and houses for sale and rent, commercial space and land. Live prices by district, 3D tours and map search on Vhome.ge.`,
    intro: city.blurb.en,
    segmentsTitle: 'What are you looking for?',
    districtsTitle: 'By district',
  };
}

/** All indexable segment paths (for sitemap / footer). */
export function allLandingSegments(): LandingSegment[] {
  const out: LandingSegment[] = [];
  for (const city of LANDING_CITIES) {
    for (const type of LANDING_TYPES) {
      for (const deal of LANDING_DEALS) {
        out.push({ city, district: null, type, deal });
      }
    }
    for (const district of districtsOfCity(city.slug)) {
      for (const type of LANDING_TYPES.filter((t) => t.type === 'apartment' || t.type === 'house' || t.type === 'commercial')) {
        for (const deal of LANDING_DEALS) {
          out.push({ city, district, type, deal });
        }
      }
    }
  }
  return out;
}

/** Featured hubs for the homepage / footer (high-intent combinations). */
export const FEATURED_LANDING_PATHS: Array<{ path: string; label: L10n }> = [
  { path: '/tbilisi/apartments-for-sale', label: { ka: 'ბინები იყიდება თბილისში', en: 'Apartments for sale in Tbilisi', ru: 'Купить квартиру в Тбилиси' } },
  { path: '/tbilisi/apartments-for-rent', label: { ka: 'ბინები ქირავდება თბილისში', en: 'Apartments for rent in Tbilisi', ru: 'Снять квартиру в Тбилиси' } },
  { path: '/tbilisi/houses-for-sale', label: { ka: 'სახლები იყიდება თბილისში', en: 'Houses for sale in Tbilisi', ru: 'Купить дом в Тбилиси' } },
  { path: '/tbilisi/commercial-for-sale', label: { ka: 'კომერციული ფართი თბილისში', en: 'Commercial property in Tbilisi', ru: 'Коммерческая недвижимость в Тбилиси' } },
  { path: '/tbilisi/saburtalo/apartments-for-sale', label: { ka: 'ბინები საბურთალოზე', en: 'Apartments in Saburtalo', ru: 'Квартиры на Сабуртало' } },
  { path: '/tbilisi/vake/apartments-for-sale', label: { ka: 'ბინები ვაკეში', en: 'Apartments in Vake', ru: 'Квартиры в Ваке' } },
  { path: '/tbilisi/dighomi/apartments-for-sale', label: { ka: 'ბინები დიღომში', en: 'Apartments in Dighomi', ru: 'Квартиры в Дигоми' } },
  { path: '/tbilisi/old-tbilisi/apartments-for-rent', label: { ka: 'ქირა ძველ თბილისში', en: 'Rentals in Old Tbilisi', ru: 'Аренда в Старом Тбилиси' } },
  { path: '/batumi/apartments-for-sale', label: { ka: 'ბინები იყიდება ბათუმში', en: 'Apartments for sale in Batumi', ru: 'Купить квартиру в Батуми' } },
  { path: '/tbilisi/land-for-sale', label: { ka: 'მიწის ნაკვეთები თბილისში', en: 'Land plots in Tbilisi', ru: 'Земельные участки в Тбилиси' } },
];
