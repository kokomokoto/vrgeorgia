import type { Metadata } from 'next';
import type { Property } from '@/lib/types';
import { getSiteUrl, SITE_NAME } from '@/lib/siteUrl';
import {
  DEFAULT_SITE_LANG,
  SITE_LANGS,
  localizePath,
  ogLocale,
  stripLangPrefix,
  type SiteLang,
} from '@/lib/siteLang';

type L10n = Record<SiteLang, string>;

export const TYPE_LABELS_I18N: Record<string, L10n> = {
  apartment: { ka: 'ბინა', en: 'Apartment', ru: 'Квартира' },
  house: { ka: 'სახლი', en: 'House', ru: 'Дом' },
  commercial: { ka: 'კომერციული ფართი', en: 'Commercial space', ru: 'Коммерческая площадь' },
  land: { ka: 'მიწის ნაკვეთი', en: 'Land plot', ru: 'Земельный участок' },
  cottage: { ka: 'აგარაკი', en: 'Cottage', ru: 'Дача' },
  hotel: { ka: 'სასტუმრო', en: 'Hotel', ru: 'Гостиница' },
  building: { ka: 'შენობა', en: 'Building', ru: 'Здание' },
  warehouse: { ka: 'საწყობი', en: 'Warehouse', ru: 'Склад' },
  parking: { ka: 'პარკინგი', en: 'Parking', ru: 'Парковка' },
  business: { ka: 'ბიზნესი', en: 'Business', ru: 'Бизнес' },
};

/** Plural type labels for hub / landing titles. */
export const TYPE_LABELS_PLURAL_I18N: Record<string, L10n> = {
  apartment: { ka: 'ბინები', en: 'Apartments', ru: 'Квартиры' },
  house: { ka: 'სახლები', en: 'Houses', ru: 'Дома' },
  commercial: { ka: 'კომერციული ფართები', en: 'Commercial spaces', ru: 'Коммерческие площади' },
  land: { ka: 'მიწის ნაკვეთები', en: 'Land plots', ru: 'Земельные участки' },
  cottage: { ka: 'აგარაკები', en: 'Cottages', ru: 'Дачи' },
  hotel: { ka: 'სასტუმროები', en: 'Hotels', ru: 'Гостиницы' },
  building: { ka: 'შენობები', en: 'Buildings', ru: 'Здания' },
  warehouse: { ka: 'საწყობები', en: 'Warehouses', ru: 'Склады' },
  parking: { ka: 'პარკინგები', en: 'Parking spaces', ru: 'Парковки' },
  business: { ka: 'ბიზნესები', en: 'Businesses', ru: 'Бизнесы' },
};

export const DEAL_LABELS_I18N: Record<string, L10n> = {
  sale: { ka: 'იყიდება', en: 'for sale', ru: 'продажа' },
  rent: { ka: 'ქირავდება', en: 'for rent', ru: 'аренда' },
  mortgage: { ka: 'გირავდება', en: 'for mortgage', ru: 'под залог' },
};

export const DEAL_SOLD_LABELS_I18N: Record<string, L10n> = {
  sale: { ka: 'გაიყიდა', en: 'sold', ru: 'продано' },
  rent: { ka: 'გაქირავდა', en: 'rented out', ru: 'сдано' },
  mortgage: { ka: 'გირავნობით გაიცა', en: 'mortgaged', ru: 'заложено' },
};

export const SEO_WORDS: Record<
  | 'home'
  | 'listings'
  | 'agents'
  | 'map'
  | 'realEstateGeorgia'
  | 'realEstate'
  | 'rooms'
  | 'sqm'
  | 'floor'
  | 'bedrooms'
  | 'viewListing'
  | 'tours3d'
  | 'about'
  | 'faq'
  | 'services'
  | 'mortgageCalculator'
  | 'terms'
  | 'privacy'
  | 'contact'
  | 'notFoundListing'
  | 'notFoundListingDesc',
  L10n
> = {
  home: { ka: 'მთავარი', en: 'Home', ru: 'Главная' },
  listings: { ka: 'განცხადებები', en: 'Listings', ru: 'Объявления' },
  agents: { ka: 'აგენტები', en: 'Agents', ru: 'Агенты' },
  map: { ka: 'რუკა', en: 'Map', ru: 'Карта' },
  realEstateGeorgia: {
    ka: 'უძრავი ქონება საქართველოში',
    en: 'Real estate in Georgia',
    ru: 'Недвижимость в Грузии',
  },
  realEstate: { ka: 'უძრავი ქონება', en: 'Real estate', ru: 'Недвижимость' },
  rooms: { ka: 'ოთახი', en: 'rooms', ru: 'комн.' },
  sqm: { ka: 'მ²', en: 'm²', ru: 'м²' },
  floor: { ka: 'სართული', en: 'Floor', ru: 'Этаж' },
  bedrooms: { ka: 'საძინებელი', en: 'bedrooms', ru: 'спальни' },
  viewListing: { ka: 'განცხადების ნახვა', en: 'View listing', ru: 'Смотреть объявление' },
  tours3d: { ka: '3D ტურები', en: '3D tours', ru: '3D-туры' },
  about: { ka: 'საიტის შესახებ', en: 'About Vhome', ru: 'О Vhome' },
  faq: { ka: 'ხშირად დასმული კითხვები', en: 'FAQ', ru: 'Частые вопросы' },
  services: { ka: 'მომსახურება', en: 'Services', ru: 'Услуги' },
  mortgageCalculator: {
    ka: 'იპოთეკის კალკულატორი',
    en: 'Mortgage calculator',
    ru: 'Ипотечный калькулятор',
  },
  terms: { ka: 'წესები და პირობები', en: 'Terms of use', ru: 'Условия использования' },
  privacy: { ka: 'კონფიდენციალურობის პოლიტიკა', en: 'Privacy policy', ru: 'Политика конфиденциальности' },
  contact: { ka: 'კონტაქტი', en: 'Contact', ru: 'Контакты' },
  notFoundListing: {
    ka: 'განცხადება ვერ მოიძებნა',
    en: 'Listing not found',
    ru: 'Объявление не найдено',
  },
  notFoundListingDesc: {
    ka: 'ეს განცხადება აღარ არის ხელმისაწვდომი ან წაშლილია.',
    en: 'This listing is no longer available or has been removed.',
    ru: 'Это объявление больше недоступно или удалено.',
  },
};

export function typeLabel(type: string | undefined, lang: SiteLang, plural = false): string {
  if (!type) return '';
  const map = plural ? TYPE_LABELS_PLURAL_I18N : TYPE_LABELS_I18N;
  return map[type]?.[lang] || map[type]?.ka || type;
}

export function dealLabel(
  dealType: string | undefined,
  lang: SiteLang,
  status?: Property['status']
): string {
  const map = status === 'sold' ? DEAL_SOLD_LABELS_I18N : DEAL_LABELS_I18N;
  const key = dealType || 'sale';
  return map[key]?.[lang] || map[key]?.ka || key;
}

/** Site-wide default title / description per language (keyword-aligned). */
export const SITE_META: Record<SiteLang, { title: string; description: string; shortTitle: string }> = {
  ka: {
    title: 'ბინები და სახლები იყიდება და ქირავდება თბილისში — 3D ტურები | Vhome',
    shortTitle: 'Vhome — უძრავი ქონება საქართველოში',
    description:
      'უძრავი ქონება საქართველოში: ბინები, სახლები, კომერციული ფართები და მიწა იყიდება და ქირავდება თბილისში, ბათუმსა და სხვა ქალაქებში. 3D ტურები, რუკაზე ძებნა და სანდო აგენტები — Vhome.ge.',
  },
  en: {
    title: 'Apartments & Houses for Sale and Rent in Tbilisi, Georgia — 3D Tours | Vhome',
    shortTitle: 'Vhome — Real Estate in Georgia',
    description:
      'Real estate in Georgia: apartments, houses, commercial space and land for sale and rent in Tbilisi, Batumi and beyond. Immersive 3D tours, map search and trusted local agents on Vhome.ge.',
  },
  ru: {
    title: 'Квартиры и дома — продажа и аренда в Тбилиси, Грузия — 3D-туры | Vhome',
    shortTitle: 'Vhome — недвижимость в Грузии',
    description:
      'Недвижимость в Грузии: квартиры, дома, коммерческие площади и земля — продажа и аренда в Тбилиси, Батуми и других городах. 3D-туры, поиск на карте и проверенные агенты на Vhome.ge.',
  },
};

/**
 * Canonical + hreflang alternates for a route, given the un-prefixed path.
 * Canonical always points at the current language version (self-canonical);
 * `x-default` is the Georgian URL.
 */
export function buildLanguageAlternates(
  path: string,
  lang: SiteLang
): NonNullable<Metadata['alternates']> {
  const site = getSiteUrl();
  const clean = stripLangPrefix(path || '/');
  const languages: Record<string, string> = {};
  for (const l of SITE_LANGS) {
    languages[l] = `${site}${localizePath(clean, l)}`;
  }
  languages['x-default'] = `${site}${localizePath(clean, DEFAULT_SITE_LANG)}`;
  return {
    canonical: `${site}${localizePath(clean, lang)}`,
    languages,
  };
}

/** Absolute URL of a path in a given language. */
export function absoluteLocalizedUrl(path: string, lang: SiteLang): string {
  return `${getSiteUrl()}${localizePath(path, lang)}`;
}

/** Minimal Open Graph block shared by localized pages. */
export function localizedOpenGraph(
  lang: SiteLang,
  input: { title: string; description: string; path: string; images?: Metadata['openGraph'] extends infer T ? (T extends { images?: infer I } ? I : never) : never; type?: 'website' | 'article' | 'profile' }
) {
  return {
    type: input.type || 'website',
    url: absoluteLocalizedUrl(input.path, lang),
    siteName: SITE_NAME,
    locale: ogLocale(lang),
    alternateLocale: SITE_LANGS.filter((l) => l !== lang).map(ogLocale),
    title: input.title,
    description: input.description,
    ...(input.images ? { images: input.images } : {}),
  } as NonNullable<Metadata['openGraph']>;
}
