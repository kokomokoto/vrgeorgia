/** Editable services catalog — defaults match previous i18n copy; DB overrides via /api/content/services */

export type ServicesLang = 'ka' | 'en' | 'ru';

export type LocalizedText = { ka: string; en: string; ru: string };

export type ServiceStyleKey =
  | 'arch'
  | 'docs'
  | 'planning'
  | 'interior'
  | 'landscape'
  | 'vis'
  | 'heritage'
  | 'consult';

export const SERVICE_STYLE_KEYS: ServiceStyleKey[] = [
  'arch',
  'docs',
  'planning',
  'interior',
  'landscape',
  'vis',
  'heritage',
  'consult',
];

export type ServiceSection = {
  id: string;
  styleKey: ServiceStyleKey;
  featured: boolean;
  /** true = არ ჩანს პუბლიკურ გვერდზე */
  hidden: boolean;
  /** Cloudinary URL; ცარიელი = შაბლონის აიქონი */
  imageUrl: string;
  title: LocalizedText;
  body: LocalizedText;
  /** რედაქტორის სტაბილური key (slug-ის შეცვლისას ფოკუსი რომ არ დაიკარგოს) */
  editKey?: string;
};

export type ServicesPageContent = {
  page: {
    title: LocalizedText;
    lead: LocalizedText;
    footerNote: LocalizedText;
  };
  sections: ServiceSection[];
  updatedAt?: string | null;
};

export function pickServicesLang(raw?: string): ServicesLang {
  const code = String(raw || 'ka').toLowerCase().slice(0, 2);
  if (code === 'en' || code === 'ru') return code;
  return 'ka';
}

export function servicesText(lang: ServicesLang, map: LocalizedText): string {
  return (map[lang] || map.ka || '').trim() || map.ka || '';
}

export function servicePath(id: string): string {
  return `/services/${id}`;
}

export function isServiceStyleKey(value: string): value is ServiceStyleKey {
  return (SERVICE_STYLE_KEYS as readonly string[]).includes(value);
}

export const DEFAULT_SERVICES_CONTENT: ServicesPageContent = {
  page: {
    title: {
      ka: 'არქიტექტურული მომსახურება',
      en: 'Architecture & design services',
      ru: 'Архитектурные услуги',
    },
    lead: {
      ka: 'ქვემოთ მოცემულია მიმართულებები, რომლებიც ეხება პროექტირებას, გეგმარებას, ინტერიერის დიზაინს, ვიზუალიზაციას და მშენებლობისწინა მზადებას — ერთი სივრციდან შეგიძლიათ გაეცნოთ სერვისების სპექტრს.',
      en: 'Below is an overview of areas related to design, planning, interior design, visualization, and pre-construction preparation — so you can see the full spectrum of professional support in one place.',
      ru: 'Ниже — направления, связанные с проектированием, планировкой, дизайном интерьера, визуализацией и подготовкой к строительству: обзор спектра услуг на одной странице.',
    },
    footerNote: {
      ka: 'Vhome უძრავი ქონების განცხადებების პლატფორმაა; აღნიშნული მომსახურებების მიწოდება ხდება პროფესიონალებთან პირდაპირი შეთანხმებით.',
      en: 'Vhome is a real-estate listings platform; delivery of these services is agreed directly with qualified professionals.',
      ru: 'Vhome — платформа объявлений о недвижимости; оказание перечисленных услуг согласуется напрямую с квалифицированными специалистами.',
    },
  },
  sections: [
    {
      id: 'arch',
      styleKey: 'arch',
      featured: true,
      hidden: false,
      imageUrl: '',
      title: {
        ka: 'არქიტექტურული პროექტირება',
        en: 'Architectural design',
        ru: 'Архитектурное проектирование',
      },
      body: {
        ka: 'კერძო სახლის, ბინის, კომერციული ობიექტისა და საჯარო დანიშნულების შენობების იდეის განვითარება, მოცულობითი გადაწყვეტა, ფასადის კონცეფცია, არქიტექტურული ნახაზები და ესკიზები.',
        en: 'Concept development for houses, apartments, commercial buildings, and public facilities: massing, façade concept, drawings, and design development.',
        ru: 'Концепция для частных и многоквартирных домов, коммерческих и общественных зданий: объёмно-планировочное решение, фасад, архитектурные чертежи и эскизы.',
      },
    },
    {
      id: 'docs',
      styleKey: 'docs',
      featured: false,
      hidden: false,
      imageUrl: '',
      title: {
        ka: 'სამშენებლო დოკუმენტაცია და ტექნიკური პროექტი',
        en: 'Construction documentation & technical design',
        ru: 'Строительная документация и техпроект',
      },
      body: {
        ka: 'პროექტის სრული ან ეტაპობრივი ნაკვეთი, ტექნიკური პასპორტი, არსებულ შენობაზე ცვლილებები, ნებართვებთან შესაბამისობა და კოორდინაცია სპეციალისტებთან.',
        en: 'Full or phased drawing packages, technical passports, alterations to existing buildings, compliance with permits, and coordination with engineers.',
        ru: 'Полный или поэтапный комплект чертежей, технический паспорт, перепланировки, согласование с разрешениями и координация со смежными специалистами.',
      },
    },
    {
      id: 'planning',
      styleKey: 'planning',
      featured: false,
      hidden: false,
      imageUrl: '',
      title: {
        ka: 'გეგმარება და ტერიტორიის ანალიზი',
        en: 'Planning & site analysis',
        ru: 'Планирование и анализ участка',
      },
      body: {
        ka: 'ნაკვეთის პოტენციალი, ზონირება და შეზღუდვები, სიმძლავრე, ფუნქციური განაწილება, იდეის შემოწმება ინვესტიციამდე ან შესყიდვამდე.',
        en: 'Site potential, zoning and constraints, capacity, functional layout, and feasibility checks before purchase or investment.',
        ru: 'Потенциал участка, зонирование и ограничения, вместимость, функциональное зонирование, проверка идеи до покупки или инвестиций.',
      },
    },
    {
      id: 'interior',
      styleKey: 'interior',
      featured: true,
      hidden: false,
      imageUrl: '',
      title: {
        ka: 'ინტერიერის დიზაინი',
        en: 'Interior design',
        ru: 'Дизайн интерьера',
      },
      body: {
        ka: 'განლაგება, მასალებისა და ფერების პალიტრა, ავეჯის კონცეფცია, განათება, სანტექნიკა და ელექტრობა ერთი სტილის ფარგლებში, მშენებლობის ეტაპზე ზედამხედველობა.',
        en: 'Layouts, materials and colour palettes, furniture concept, lighting, sanitary and electrical coordination in one style, and site supervision during build-out.',
        ru: 'Планировки, материалы и палитра, концепция мебели, освещение, сантехника и электрика в едином стиле, авторский надзор на этапе отделки.',
      },
    },
    {
      id: 'landscape',
      styleKey: 'landscape',
      featured: false,
      hidden: false,
      imageUrl: '',
      title: {
        ka: 'ლანდშაფტის არქიტექტურა',
        en: 'Landscape architecture',
        ru: 'Ландшафтная архитектура',
      },
      body: {
        ka: 'ეზოს პროექტი, მწვანე ზონები, შემოსასვლელი, ტერასა, საფეხური და გარე განათება — ფუნქციისა და ესთეტიკის ბალანსი.',
        en: 'Garden design, green zones, entrances, terraces, paths, and outdoor lighting — balancing function and aesthetics.',
        ru: 'Проект двора, озеленение, входные группы, террасы, дорожки и наружное освещение — баланс функции и эстетики.',
      },
    },
    {
      id: 'vis',
      styleKey: 'vis',
      featured: true,
      hidden: false,
      imageUrl: '',
      title: {
        ka: 'ვიზუალიზაცია, 3D და ვირტუალური ტური',
        en: 'Visualization, 3D & virtual tours',
        ru: 'Визуализация, 3D и виртуальные туры',
      },
      body: {
        ka: 'ფოტორეალისტული რენდერები, ანიმაცია, ვირტუალური გასეირნება, ინვესტორის ან მყიდველისთვის პრეზენტაცია.',
        en: 'Photorealistic renders, animation, walkthroughs, and presentations for investors or buyers.',
        ru: 'Фотореалистичные рендеры, анимация, виртуальные прогулки и презентации для инвесторов или покупателей.',
      },
    },
    {
      id: 'heritage',
      styleKey: 'heritage',
      featured: false,
      hidden: false,
      imageUrl: '',
      title: {
        ka: 'რეკონსტრუქცია, გაძლიერება და მემკვიდრეობა',
        en: 'Renovation, strengthening & heritage',
        ru: 'Реконструкция, усиление и наследие',
      },
      body: {
        ka: 'არსებული კონსტრუქციის შეფასება, გამაგრება, ფუნქციის შეცვლა, ისტორიული ფასადის შენარჩუნება და ადაპტაცია თანამედროვე მოთხოვნებზე.',
        en: 'Assessment of existing structures, strengthening, change of use, retention of historic façades, and adaptation to modern requirements.',
        ru: 'Обследование несущих конструкций, усиление, смена назначения, сохранение исторических фасадов и адаптация к современным требованиям.',
      },
    },
    {
      id: 'consult',
      styleKey: 'consult',
      featured: false,
      hidden: false,
      imageUrl: '',
      title: {
        ka: 'კონსულტაცია',
        en: 'Consulting',
        ru: 'Консультации',
      },
      body: {
        ka: 'ერთჯერადი შეხვედრა ან ონლაინ ზარი: ბიუჯეტი, ეტაპები, კონტრაქტორის არჩევა, რისკები და რეგულაციების მოკლე მიმოხილვა.',
        en: 'One-off meeting or online call: budget, phasing, contractor selection, risks, and a concise overview of regulations.',
        ru: 'Разовая встреча или онлайн-звонок: бюджет, этапы, выбор подрядчика, риски и краткий обзор нормативов.',
      },
    },
  ],
};

export function visibleServiceSections(sections: ServiceSection[]): ServiceSection[] {
  return sections.filter((s) => !s.hidden);
}

export function featuredServiceSections(sections: ServiceSection[]): ServiceSection[] {
  const visible = visibleServiceSections(sections);
  const marked = visible.filter((s) => s.featured);
  if (marked.length > 0) return marked.slice(0, 3);
  return visible.slice(0, 3);
}

let editKeySeq = 0;
export function nextServiceEditKey(): string {
  editKeySeq += 1;
  return `sek-${Date.now().toString(36)}-${editKeySeq}`;
}

export function emptyServiceSection(): ServiceSection {
  return {
    id: `service-${Date.now().toString(36)}`,
    styleKey: 'arch',
    featured: false,
    hidden: true,
    imageUrl: '',
    title: { ka: '', en: '', ru: '' },
    body: { ka: '', en: '', ru: '' },
    editKey: nextServiceEditKey(),
  };
}

export function normalizeServiceSection(raw: Partial<ServiceSection> & { id?: string }): ServiceSection {
  const out: ServiceSection = {
    id: String(raw.id || `service-${Date.now().toString(36)}`),
    styleKey: (raw.styleKey as ServiceStyleKey) || 'arch',
    featured: Boolean(raw.featured),
    hidden: Boolean(raw.hidden),
    imageUrl: String(raw.imageUrl || '').trim(),
    title: {
      ka: String(raw.title?.ka ?? ''),
      en: String(raw.title?.en ?? ''),
      ru: String(raw.title?.ru ?? ''),
    },
    body: {
      ka: String(raw.body?.ka ?? ''),
      en: String(raw.body?.en ?? ''),
      ru: String(raw.body?.ru ?? ''),
    },
  };
  if (raw.editKey) out.editKey = raw.editKey;
  return out;
}

/** API-ში გასაგზავნი — client-only editKey ამოიღება */
export function toServicesApiPayload(data: ServicesPageContent): {
  page: ServicesPageContent['page'];
  sections: Omit<ServiceSection, 'editKey'>[];
} {
  return {
    page: data.page,
    sections: data.sections.map((s) => {
      const { editKey: _editKey, ...rest } = normalizeServiceSection(s);
      return rest;
    }),
  };
}

export function cloneServicesContent(data: ServicesPageContent): ServicesPageContent {
  return {
    page: {
      title: { ...data.page.title },
      lead: { ...data.page.lead },
      footerNote: { ...data.page.footerNote },
    },
    sections: data.sections.map((s) =>
      normalizeServiceSection({
        ...s,
        editKey: s.editKey || nextServiceEditKey(),
      })
    ),
    updatedAt: data.updatedAt ?? null,
  };
}
