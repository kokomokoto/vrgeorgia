import type { Metadata } from 'next';
import Link from 'next/link';
import { PropertyCard } from '@/components/PropertyCard';
import { DEFAULT_OG_IMAGE } from '@/lib/seoDefaults';
import { getRequestLang, getRequestNonce } from '@/lib/serverLang';
import { fetchTourListingsServer } from '@/lib/serverListings';
import { buildLanguageAlternates, localizedOpenGraph, SEO_WORDS } from '@/lib/seoI18n';
import { localizePath } from '@/lib/siteLang';
import { getSiteUrl, isNoIndexHost } from '@/lib/siteUrl';
import {
  buildBreadcrumbJsonLd,
  buildCollectionPageJsonLd,
  buildFaqPageJsonLd,
  buildListingItemListJsonLd,
  jsonLdScript,
} from '@/lib/structuredData';

const COPY = {
  ka: {
    h1: '3D ტურები უძრავ ქონებაზე საქართველოში',
    title: '3D ტურები და Gaussian Splatting | Vhome',
    description:
      'დაათვალიერეთ ბინები და სახლები თბილისში 3D ტურით — Gaussian Splatting, 360° პანორამა და ვირტუალური გასავლელი. Vhome.ge.',
    lead: 'Vhome-ის განსხვავება ქართულ პორტალებს შორის არის იმერსიული 3D ტური. Gaussian Splatting ტექნოლოგია ობიექტს ფოტორეალისტურ, თავისუფლად გასავლელ სივრცედ აქცევს — შეგიძლიათ ოთახებში იმოძრაოთ ბრაუზერიდან, სანამ ადგილზე მიხვალთ.',
    whatH: 'რა არის Gaussian Splatting ტური?',
    what: 'Gaussian Splatting (3DGS) არის თანამედროვე მეთოდი სცენის რეკონსტრუქციისთვის ფოტოებიდან. განსხვავებით ჩვეულებრივი 360° პანორამისგან, რომელიც ერთი წერტილიდან ტრიალებს, 3DGS გასავლელი მოდელი გაძლევთ სიღრმეს, მოცულობას და გადაადგილებას ოთახებში. Vhome-ზე ტური ჩანს განცხადების გვერდზე მედია ჩანართში; აგენტებს შეუძლიათ ტურის ატვირთვა საკუთარი ობიექტისთვის.',
    howH: 'როგორ ვიპოვო განცხადება ტურით?',
    how: 'მთავარ გვერდზე ან რუკაზე ჩართეთ ფილტრი „3D აქვს“, ან გახსენით ეს გალერეა — აქ მხოლოდ ის ობიექტებია, რომლებსაც აქვთ 3D/VR ტური ან 360° პანორამა. თითოეულ ბარათზე გადასვლით ტური იხსნება განცხადების გვერდზე.',
    agentsH: 'აგენტებისთვის',
    agents:
      '3D ტური ზრდის ნახვებს და ამცირებს უსარგებლო ჩვენებებს. თუ ხართ აგენტი, დაამატეთ ტურის ბმული განცხადების ატვირთვისას ან დაგვიკავშირდით — დაგეხმარებით გადაღებასა და განთავსებაში.',
    empty: 'ამ მომენტში ტურიანი განცხადება საჯარო ფიდში არ არის. ნახეთ ყველა განცხადება ან დაგვიკავშირდით ტურის დასამატებლად.',
    all: 'ყველა განცხადება',
    contact: 'დაგვიკავშირდით',
    gallery: 'განცხადებები 3D ტურით',
    faq: 'ხშირად დასმული კითხვები',
  },
  en: {
    h1: '3D property tours in Georgia',
    title: '3D tours and Gaussian Splatting | Vhome',
    description:
      'Walk apartments and houses in Tbilisi in 3D — Gaussian splatting, 360° panoramas and virtual walkthroughs on Vhome.ge.',
    lead: 'What sets Vhome apart among Georgian portals is the immersive 3D tour. Gaussian Splatting turns a property into a photorealistic space you can walk through in the browser before you visit.',
    whatH: 'What is a Gaussian Splatting tour?',
    what: 'Gaussian Splatting (3DGS) reconstructs a scene from photos. Unlike a 360° panorama that spins around a single point, a 3DGS walkthrough gives depth, volume and movement between rooms. On Vhome the tour sits in the media tab of the listing; agents can attach a tour when they publish.',
    howH: 'How do I find listings with a tour?',
    how: 'Turn on the “Has 3D” filter on the home page or map, or use this gallery — it only shows listings with a 3D/VR tour or 360° panorama. Open a card to play the tour on the listing page.',
    agentsH: 'For agents',
    agents:
      'A 3D tour raises views and cuts wasted viewings. Add a tour URL when you upload a listing, or contact us — we can help capture and publish it.',
    empty: 'No public listings currently carry a tour. Browse all listings or contact us to add one.',
    all: 'All listings',
    contact: 'Contact us',
    gallery: 'Listings with a 3D tour',
    faq: 'Frequently asked questions',
  },
  ru: {
    h1: '3D-туры по недвижимости в Грузии',
    title: '3D-туры и Gaussian Splatting | Vhome',
    description:
      'Квартиры и дома в Тбилиси в 3D — Gaussian Splatting, 360° панорамы и виртуальные прогулки на Vhome.ge.',
    lead: 'Отличие Vhome среди грузинских порталов — иммерсивный 3D-тур. Gaussian Splatting превращает объект в фотореалистичное пространство, по которому можно пройтись в браузере до визита.',
    whatH: 'Что такое тур Gaussian Splatting?',
    what: 'Gaussian Splatting (3DGS) восстанавливает сцену из фотографий. В отличие от 360° панорамы, которая крутится вокруг одной точки, прогулка 3DGS даёт глубину, объём и перемещение между комнатами. На Vhome тур в медиа-вкладке объявления; агент может прикрепить его при публикации.',
    howH: 'Как найти объявления с туром?',
    how: 'Включите фильтр «Есть 3D» на главной или карте — или откройте эту галерею: здесь только объекты с 3D/VR-туром или 360° панорамой. Карточка ведёт на страницу объявления с туром.',
    agentsH: 'Для агентов',
    agents:
      '3D-тур увеличивает просмотры и сокращает пустые показы. Добавьте ссылку на тур при загрузке объявления или напишите нам — поможем снять и опубликовать.',
    empty: 'Сейчас в публичной ленте нет объявлений с туром. Смотрите все объявления или напишите нам, чтобы добавить тур.',
    all: 'Все объявления',
    contact: 'Написать нам',
    gallery: 'Объявления с 3D-туром',
    faq: 'Частые вопросы',
  },
} as const;

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getRequestLang();
  const c = COPY[lang];
  const path = '/3d-tours';
  return {
    title: { absolute: c.title },
    description: c.description,
    keywords: ['3D tour', 'Gaussian Splatting', 'VR property', 'Tbilisi', 'Vhome'],
    alternates: buildLanguageAlternates(path, lang),
    robots: isNoIndexHost() ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: localizedOpenGraph(lang, {
      title: c.h1,
      description: c.description,
      path,
      images: [DEFAULT_OG_IMAGE],
    }),
  };
}

export const revalidate = 300;

export default async function Tours3dPage() {
  const [lang, nonce] = await Promise.all([getRequestLang(), getRequestNonce()]);
  const c = COPY[lang];
  const listings = await fetchTourListingsServer(lang, 24);
  const site = getSiteUrl();
  const L = (p: string) => localizePath(p, lang);
  const pageUrl = `${site}${L('/3d-tours')}`;
  const faq = [
    { question: c.whatH, answer: c.what },
    { question: c.howH, answer: c.how },
    { question: c.agentsH, answer: c.agents },
  ];
  const jsonLd = [
    buildCollectionPageJsonLd({ url: pageUrl, name: c.h1, description: c.description, lang }),
    buildBreadcrumbJsonLd([
      { name: SEO_WORDS.home[lang], url: `${site}${L('/')}` },
      { name: SEO_WORDS.tours3d[lang], url: pageUrl },
    ]),
    buildFaqPageJsonLd(faq, pageUrl),
    ...(listings.properties.length
      ? [buildListingItemListJsonLd(pageUrl, c.gallery, listings.properties, lang)]
      : []),
  ];

  return (
    <article className="mx-auto w-full max-w-7xl px-3 py-8 sm:px-4">
      {jsonLd.map((d, i) => (
        <script key={i} type="application/ld+json" nonce={nonce} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: jsonLdScript(d) }} />
      ))}
      <header className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-zinc-50">{c.h1}</h1>
        <p className="mt-4 text-[15px] leading-relaxed text-slate-700 dark:text-zinc-300">{c.lead}</p>
      </header>

      <section className="mx-auto mt-8 max-w-3xl">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-zinc-50">{c.whatH}</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-slate-700 dark:text-zinc-300">{c.what}</p>
        <h2 className="mt-8 text-xl font-semibold text-slate-900 dark:text-zinc-50">{c.howH}</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-slate-700 dark:text-zinc-300">{c.how}</p>
        <h2 className="mt-8 text-xl font-semibold text-slate-900 dark:text-zinc-50">{c.agentsH}</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-slate-700 dark:text-zinc-300">{c.agents}</p>
        <p className="mt-4 text-sm">
          <Link className="text-blue-700 hover:underline dark:text-blue-400" href={L('/contact')}>
            {c.contact} →
          </Link>
        </p>
      </section>

      <section className="mt-10">
        <div className="mb-4 flex items-end justify-between gap-3">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-zinc-50">{c.gallery}</h2>
          <Link className="text-sm font-medium text-blue-700 hover:underline dark:text-blue-400" href={L('/')}>
            {c.all} →
          </Link>
        </div>
        {listings.properties.length ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {listings.properties.map((p, i) => (
              <PropertyCard key={p._id} p={p} compactPhoto priority={i < 4} />
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-sm text-slate-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
            {c.empty}
          </p>
        )}
      </section>
    </article>
  );
}
