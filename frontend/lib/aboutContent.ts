/** About page copy — ka / en / ru */

export type AboutLang = 'ka' | 'en' | 'ru';

export type AboutContent = {
  title: string;
  intro: string;
  sectionWhat: string;
  items: { href: string; label: string; desc: string }[];
  sectionWho: string;
  whoBody: string;
};

export const ABOUT_BY_LANG: Record<AboutLang, AboutContent> = {
  ka: {
    title: 'რა არის VR Georgia?',
    intro:
      'VR Georgia არის ონლაინ პლატფორმა უძრავი ქონების მოსაძებნად საქართველოში. აქ იკრიბება განცხადებები ბინებზე, სახლებზე, მიწაზე, კომერციულ ფართებსა და სხვა ტიპებზე — რუკით, ფილტრებით და ხშირად ვირტუალური / 3D ტურებით.',
    sectionWhat: 'რას ნახავთ საიტზე',
    items: [
      { href: '/', label: 'მთავარი ძიება', desc: 'ტიპი, ფასი, ფართობი, ქალაქი/უბანი' },
      { href: '/map', label: 'რუკა', desc: 'ობიექტები გეოგრაფიულად' },
      { href: '/agents', label: 'აგენტები', desc: 'პროფილები და მათი განცხადებები' },
      { href: '/services', label: 'მომსახურება', desc: 'არქიტექტურა და დიზაინი' },
      { href: '/faq', label: 'FAQ', desc: 'ხშირად დასმული კითხვები' },
    ],
    sectionWho: 'ვისთვისაა',
    whoBody:
      'მყიდველებისა და დამქირავებლებისთვის — სწრაფი ძიება და ვიზუალური მიმოხილვა. აგენტებისა და მფლობელებისთვის — განცხადებების განთავსება და კონტაქტი დაინტერესებულ პირებთან.',
  },
  en: {
    title: 'What is VR Georgia?',
    intro:
      'VR Georgia is an online platform for finding real estate in Georgia. Listings cover apartments, houses, land, commercial spaces and more — with maps, filters and often VR/3D tours.',
    sectionWhat: 'What you will find on the site',
    items: [
      { href: '/', label: 'Main search', desc: 'type, price, area, city/district' },
      { href: '/map', label: 'Map', desc: 'properties by location' },
      { href: '/agents', label: 'Agents', desc: 'profiles and their listings' },
      { href: '/services', label: 'Services', desc: 'architecture and design' },
      { href: '/faq', label: 'FAQ', desc: 'frequently asked questions' },
    ],
    sectionWho: 'Who it is for',
    whoBody:
      'For buyers and renters — fast search and visual browsing. For agents and owners — publishing listings and reaching interested people.',
  },
  ru: {
    title: 'Что такое VR Georgia?',
    intro:
      'VR Georgia — онлайн-платформа поиска недвижимости в Грузии. Здесь объявления о квартирах, домах, земле, коммерции и другом — с картой, фильтрами и часто VR/3D-турами.',
    sectionWhat: 'Что есть на сайте',
    items: [
      { href: '/', label: 'Главный поиск', desc: 'тип, цена, площадь, город/район' },
      { href: '/map', label: 'Карта', desc: 'объекты на карте' },
      { href: '/agents', label: 'Агенты', desc: 'профили и их объявления' },
      { href: '/services', label: 'Услуги', desc: 'архитектура и дизайн' },
      { href: '/faq', label: 'FAQ', desc: 'часто задаваемые вопросы' },
    ],
    sectionWho: 'Для кого',
    whoBody:
      'Для покупателей и арендаторов — быстрый поиск и визуальный обзор. Для агентов и владельцев — размещение объявлений и контакт с заинтересованными.',
  },
};

export function pickAboutLang(raw?: string | null): AboutLang {
  const base = String(raw || 'ka')
    .toLowerCase()
    .split(/[-_]/)[0];
  if (base === 'en' || base === 'ru') return base;
  return 'ka';
}
