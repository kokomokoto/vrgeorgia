/** FAQ კონტენტი — სერვერული HTML + JSON-LD (ka ძირითადი; en/ru UI-სთვის) */

export type FaqItem = {
  id: string;
  question: { ka: string; en: string; ru: string };
  answer: { ka: string; en: string; ru: string };
};

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'what-is',
    question: {
      ka: 'რა არის VR Georgia?',
      en: 'What is VR Georgia?',
      ru: 'Что такое VR Georgia?',
    },
    answer: {
      ka: 'VR Georgia არის უძრავი ქონების პლატფორმა საქართველოში. აქ ნახავთ ბინებს, სახლებს, მიწის ნაკვეთებსა და კომერციულ ფართებს, ხშირად 3D/VR ტურებით და რუკაზე ძიებით.',
      en: 'VR Georgia is a real-estate marketplace for Georgia. Browse apartments, houses, land and commercial spaces, often with 3D/VR tours and map search.',
      ru: 'VR Georgia — платформа недвижимости в Грузии. Здесь квартиры, дома, земля и коммерция, часто с 3D/VR-турами и поиском на карте.',
    },
  },
  {
    id: 'how-search',
    question: {
      ka: 'როგორ ვიპოვო ბინა ან სახლი თბილისში?',
      en: 'How do I find an apartment or house in Tbilisi?',
      ru: 'Как найти квартиру или дом в Тбилиси?',
    },
    answer: {
      ka: 'გახსენით მთავარი გვერდი ან რუკა, აირჩიეთ ტიპი (ბინა/სახლი), გარიგება (იყიდება/ქირავდება), ქალაქი ან უბანი და ფასის დიაპაზონი. შეგიძლიათ ძებნა მისამართით, აგენტის სახელით ან ტელეფონითაც.',
      en: 'Open the home page or map, choose property type, deal type (sale/rent), city or district and price range. You can also search by address, agent name or phone.',
      ru: 'Откройте главную или карту, выберите тип, сделку (продажа/аренда), город или район и цену. Можно искать по адресу, имени агента или телефону.',
    },
  },
  {
    id: 'vr-tour',
    question: {
      ka: 'რა არის ვირტუალური (VR/3D) ტური განცხადებაზე?',
      en: 'What is a VR/3D tour on a listing?',
      ru: 'Что такое VR/3D-тур в объявлении?',
    },
    answer: {
      ka: 'ვირტუალური ტური საშუალებას გაძლევთ ობიექტი დაათვალიეროთ დისტანციურად — 360° ფოტოებით ან 3D ტურით, სანამ ადგილზე მიხვალთ. თუ განცხადებას აქვს ტური, ის ჩანს ობიექტის გვერდზე მედია ჩანართებში.',
      en: 'A virtual tour lets you explore a property remotely with 360° photos or a 3D tour before visiting. If a listing has a tour, it appears in the media tabs on the property page.',
      ru: 'Виртуальный тур позволяет осмотреть объект удалённо — 360° фото или 3D — до визита. Если тур есть, он в медиа-вкладках на странице объекта.',
    },
  },
  {
    id: 'agents',
    question: {
      ka: 'როგორ ვიპოვო უძრავი ქონების აგენტი?',
      en: 'How do I find a real-estate agent?',
      ru: 'Как найти агента по недвижимости?',
    },
    answer: {
      ka: 'გადადით გვერდზე „აგენტები“, ნახეთ პროფილები და მათი განცხადებები. აგენტის გვერდზე შეგიძლიათ გაფილტროთ მხოლოდ მისი ობიექტები და დაუკავშირდეთ მითითებული ტელეფონით ან ელფოსტით.',
      en: 'Go to the Agents page, browse profiles and their listings. On an agent page you can filter only their properties and contact them via the listed phone or email.',
      ru: 'Откройте раздел «Агенты», смотрите профили и объекты. На странице агента можно фильтровать только его объявления и связаться по телефону или email.',
    },
  },
  {
    id: 'price-currency',
    question: {
      ka: 'ფასები დოლარშია თუ ლარში?',
      en: 'Are prices in USD or GEL?',
      ru: 'Цены в долларах или лари?',
    },
    answer: {
      ka: 'თითოეულ განცხადებას აქვს საკუთარი ვალუტა (USD ან GEL). საიტზე შეგიძლიათ ნახოთ სრული ფასი და კვადრატული მეტრის ფასი; ჩვენება შეიძლება გადაირთოს ვალუტებს შორის, სადაც კურსი ხელმისაწვდომია.',
      en: 'Each listing has its own currency (USD or GEL). You see total price and price per m²; display currency can be toggled where the exchange rate is available.',
      ru: 'У каждого объявления своя валюта (USD или GEL). Видны полная цена и цена за м²; отображение можно переключать, если доступен курс.',
    },
  },
  {
    id: 'land-status',
    question: {
      ka: 'რა განსხვავებაა სასოფლო და არასასოფლო მიწას შორის?',
      en: 'What is the difference between agricultural and non-agricultural land?',
      ru: 'Чем отличается сельхозземля от несельскохозяйственной?',
    },
    answer: {
      ka: 'სასოფლო სამეურნეო მიწა ძირითადად სოფლის მეურნეობისთვისაა განკუთვნილი; არასასოფლო — სხვა დანიშნულებისთვის (მაგ. სამშენებლო/კომერციული, რეგულაციების მიხედვით). მიწის კატეგორიის არჩევისას შეგიძლიათ ამ სტატუსით გაფილტვრა.',
      en: 'Agricultural land is mainly for farming; non-agricultural land is for other uses (e.g. construction/commercial, subject to regulations). When filtering land listings you can choose this status.',
      ru: 'Сельхозземля в основном для сельского хозяйства; несельскохозяйственная — для других целей (строительство/коммерция по правилам). В фильтре земли можно выбрать этот статус.',
    },
  },
  {
    id: 'free',
    question: {
      ka: 'საიტის გამოყენება უფასოა?',
      en: 'Is using the website free?',
      ru: 'Сайт бесплатный?',
    },
    answer: {
      ka: 'განცხადებების ძებნა, ნახვა და რუკის გამოყენება საჯაროდ ხელმისაწვდომია. განცხადების განთავსება ან აგენტის ფუნქციები შეიძლება მოითხოვდეს ანგარიშს — დეტალები ჩანს რეგისტრაციისა და ატვირთვის გვერდებზე.',
      en: 'Searching and viewing listings and the map is publicly available. Publishing a listing or agent features may require an account — see registration and upload pages for details.',
      ru: 'Поиск и просмотр объявлений и карты доступны публично. Размещение объявления или функции агента могут требовать аккаунт — см. регистрацию и загрузку.',
    },
  },
  {
    id: 'contact-owner',
    question: {
      ka: 'როგორ დავუკავშირდე განცხადების მფლობელს?',
      en: 'How do I contact a listing owner?',
      ru: 'Как связаться с владельцем объявления?',
    },
    answer: {
      ka: 'ობიექტის გვერდზე ჩანს საკონტაქტო ტელეფონი ან აგენტის პროფილი (თუ აგენტია). შეგიძლიათ პირდაპირ დარეკოთ ან აგენტის გვერდიდან ნახოთ ყველა მისი განცხადება.',
      en: 'The property page shows a contact phone or the agent profile when applicable. Call directly or open the agent page to see all their listings.',
      ru: 'На странице объекта указан телефон или профиль агента. Звоните напрямую или откройте страницу агента со всеми его объявлениями.',
    },
  },
];

export type FaqLang = 'ka' | 'en' | 'ru';

export function pickFaqLang(raw?: string | null): FaqLang {
  const base = String(raw || 'ka')
    .toLowerCase()
    .split(/[-_]/)[0];
  if (base === 'en' || base === 'ru') return base;
  return 'ka';
}
