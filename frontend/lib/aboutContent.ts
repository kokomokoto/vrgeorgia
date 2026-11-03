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
    title: 'რა არის Vhome?',
    intro:
      'Vhome (vhome.ge) არის უძრავი ქონების მარკეტპლეისი საქართველოში, დაარსებული 2024 წელს თბილისში. მყიდველები და დამქირავებლები თბილისის, ბათუმის და სხვა ქალაქების ბინებსა და სახლებს იკვლევენ რუკით, სანდო აგენტებით და იმერსიული 3D ტურებით — მათ შორის Gaussian Splatting-ის გასავლელებით.',
    sectionWhat: 'რას ნახავთ საიტზე',
    items: [
      { href: '/', label: 'მთავარი ძიება', desc: 'ტიპი, ფასი, ფართობი, ქალაქი/უბანი' },
      { href: '/map', label: 'რუკა', desc: 'ობიექტები გეოგრაფიულად' },
      { href: '/agents', label: 'აგენტები', desc: 'პროფილები და მათი განცხადებები' },
      { href: '/services', label: 'მომსახურება', desc: 'არქიტექტურა და დიზაინი' },
      { href: '/faq', label: 'FAQ', desc: 'ხშირად დასმული კითხვები' },
      { href: '/3d-tours', label: '3D ტურები', desc: 'Gaussian Splatting და 360°' },
      { href: '/contact', label: 'კონტაქტი', desc: 'ელ-ფოსტა და ტელეფონი' },
    ],
    sectionWho: 'ვისთვისაა და როგორ მოწმდება განცხადება',
    whoBody:
      'მყიდველებისა და დამქირავებლებისთვის — სწრაფი ძიება და ვიზუალური მიმოხილვა. აგენტებისა და მფლობელებისთვის — განცხადებების განთავსება და კონტაქტი დაინტერესებულ პირებთან. თითოეული საჯარო განცხადება გადის მოდერაციას: საკონტაქტო მონაცემები, ფოტოები და მისამართი სავალდებულოა, დუბლიკატები იფილტრება, გაყიდული ობიექტები საჯარო ძიებიდან იხსნება. კომპანია: Vhome (Virtual Home Georgia), თბილისი, 2024.',
  },
  en: {
    title: 'What is Vhome?',
    intro:
      'Vhome (vhome.ge) is a real-estate marketplace in Georgia, founded in Tbilisi in 2024. Buyers and renters explore apartments and houses in Tbilisi, Batumi and other cities through map search, trusted local agents and immersive 3D tours, including Gaussian-splat walkthroughs.',
    sectionWhat: 'What you will find on the site',
    items: [
      { href: '/', label: 'Main search', desc: 'type, price, area, city/district' },
      { href: '/map', label: 'Map', desc: 'properties by location' },
      { href: '/agents', label: 'Agents', desc: 'profiles and their listings' },
      { href: '/services', label: 'Services', desc: 'architecture and design' },
      { href: '/faq', label: 'FAQ', desc: 'frequently asked questions' },
      { href: '/3d-tours', label: '3D tours', desc: 'Gaussian Splatting and 360°' },
      { href: '/contact', label: 'Contact', desc: 'email and phone' },
    ],
    sectionWho: 'Who it is for, and how listings are verified',
    whoBody:
      'For buyers and renters — fast search and visual browsing. For agents and owners — publishing listings and reaching interested people. Every public listing is moderated: contact details, photos and an address are required, duplicates are filtered, and sold properties leave public search. Company: Vhome (Virtual Home Georgia), Tbilisi, since 2024.',
  },
  ru: {
    title: 'Что такое Vhome?',
    intro:
      'Vhome (vhome.ge) — рынок недвижимости в Грузии, основан в Тбилиси в 2024 году. Покупатели и арендаторы изучают квартиры и дома в Тбилиси, Батуми и других городах: карта, проверенные агенты и иммерсивные 3D-туры, включая Gaussian Splatting.',
    sectionWhat: 'Что есть на сайте',
    items: [
      { href: '/', label: 'Главный поиск', desc: 'тип, цена, площадь, город/район' },
      { href: '/map', label: 'Карта', desc: 'объекты на карте' },
      { href: '/agents', label: 'Агенты', desc: 'профили и их объявления' },
      { href: '/services', label: 'Услуги', desc: 'архитектура и дизайн' },
      { href: '/faq', label: 'FAQ', desc: 'часто задаваемые вопросы' },
      { href: '/3d-tours', label: '3D-туры', desc: 'Gaussian Splatting и 360°' },
      { href: '/contact', label: 'Контакты', desc: 'email и телефон' },
    ],
    sectionWho: 'Для кого и как проверяются объявления',
    whoBody:
      'Для покупателей и арендаторов — быстрый поиск и визуальный обзор. Для агентов и владельцев — размещение объявлений и контакт с заинтересованными. Каждое публичное объявление проходит модерацию: контакты, фото и адрес обязательны, дубликаты отсеиваются, проданные объекты исчезают из поиска. Компания: Vhome (Virtual Home Georgia), Тбилиси, с 2024 года.',
  },
};

export function pickAboutLang(raw?: string | null): AboutLang {
  const base = String(raw || 'ka')
    .toLowerCase()
    .split(/[-_]/)[0];
  if (base === 'en' || base === 'ru') return base;
  return 'ka';
}
