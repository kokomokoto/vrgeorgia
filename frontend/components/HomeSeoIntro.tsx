import type { SiteLang } from '@/lib/siteLang';

const COPY: Record<SiteLang, { h2: string; p1: string; p2: string; p3: string }> = {
  ka: {
    h2: 'ბინები, სახლები და კომერციული ფართი იყიდება და ქირავდება თბილისში',
    p1: 'Vhome (vhome.ge) არის უძრავი ქონების პლატფორმა საქართველოში, სადაც მყიდველები და დამქირავებლები თბილისის, ბათუმის და სხვა ქალაქების ბინებს, სახლებს, მიწის ნაკვეთებსა და კომერციულ ფართებს სრულად იკვლევენ — რუკით, ფილტრებით და იმერსიული 3D ტურებით, მათ შორის Gaussian Splatting-ის გასავლელებით. აქტიური განცხადებები მოდის სანდო ადგილობრივი აგენტებისგან და მფლობელებისგან; თითოეულ ობიექტზე ნახავთ ფასს, მ²-ს, ოთახებს, უბანს, ფოტოებს და საკონტაქტო არხებს.',
    p2: 'ძიება მარტივია: აირჩიეთ გარიგება (იყიდება, ქირავდება ან გირავდება), ტიპი (ბინა, კერძო სახლი, აგარაკი, სასტუმრო, მიწა, კომერცია), ქალაქი ან თბილისის უბანი — საბურთალო, ვაკე, დიღომი, ძველი თბილისი, ისანი, გლდანი — და ფასის ან ფართობის დიაპაზონი. რუკა აჩვენებს ობიექტებს გეოგრაფიულად; 3D ტური კი საშუალებას გაძლევთ სახლი დათვალიეროთ დისტანციურად, სანამ ადგილზე მიხვალთ.',
    p3: 'Vhome 2024 წლიდან მუშაობს თბილისიდან. პლატფორმა აერთიანებს განცხადებების ბაზარს, აგენტების დირექტორიას, იპოთეკის კალკულატორს და არქიტექტურა-დიზაინის მომსახურებას. განცხადებები მოწმდება მოდერაციით: საკონტაქტო მონაცემები, ფოტოები და მისამართი სავალდებულოა, დუბლიკატები იფილტრება, ხოლო გაყიდული ობიექტები ქარხნულად აღარ ჩანს საჯარო ძიებაში.',
  },
  en: {
    h2: 'Apartments and houses for sale and rent in Tbilisi, Georgia',
    p1: 'Vhome (vhome.ge) is a real estate marketplace in Georgia where buyers and renters can explore properties in Tbilisi, Batumi and other cities through map search, filters and immersive 3D tours, including Gaussian-splat walkthroughs, alongside trusted local agents. Each listing shows price, floor area, rooms, district, photos and contact channels.',
    p2: 'Search by deal (sale, rent, mortgage), type (apartment, house, cottage, hotel, land, commercial), city or Tbilisi district — Saburtalo, Vake, Dighomi, Old Tbilisi, Isani, Gldani — and by price or size. The map places every object geographically; a 3D tour lets you walk the home remotely before you visit.',
    p3: 'Vhome has operated from Tbilisi since 2024. The platform combines a listings marketplace, an agents directory, a mortgage calculator and architecture/design services. Listings go through moderation: contact details, photos and an address are required, duplicates are filtered, and sold properties drop out of public search.',
  },
  ru: {
    h2: 'Квартиры и дома — продажа и аренда в Тбилиси, Грузия',
    p1: 'Vhome (vhome.ge) — рынок недвижимости в Грузии, где покупатели и арендаторы изучают квартиры, дома, землю и коммерцию в Тбилиси, Батуми и других городах: карта, фильтры и иммерсивные 3D-туры, в том числе Gaussian Splatting, плюс проверенные местные агенты. В каждом объявлении — цена, м², комнаты, район, фото и контакты.',
    p2: 'Ищите по сделке (продажа, аренда, залог), типу (квартира, дом, дача, отель, земля, коммерция), городу или району Тбилиси — Сабуртало, Ваке, Дигоми, Старый Тбилиси, Исани, Глдани — и по цене или площади. Карта показывает объекты географически; 3D-тур позволяет пройтись по дому удалённо до визита.',
    p3: 'Vhome работает из Тбилиси с 2024 года. Платформа объединяет витрину объявлений, каталог агентов, ипотечный калькулятор и услуги архитектуры и дизайна. Объявления проходят модерацию: контакты, фото и адрес обязательны, дубликаты отсеиваются, проданные объекты исчезают из публичного поиска.',
  },
};

/** Full-width footer copy. Links live in the search column, so this block stays short. */
export function HomeSeoIntro({ lang }: { lang: SiteLang }) {
  const c = COPY[lang];
  return (
    <section className="relative border-t border-white/10" aria-labelledby="footer-seo-heading">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-7">
        <h2 id="footer-seo-heading" className="text-sm font-semibold leading-snug text-white">
          {c.h2}
        </h2>
        <div className="mt-3 grid gap-4 text-sm leading-relaxed text-slate-400 md:grid-cols-3 md:gap-6">
          <p>{c.p1}</p>
          <p>{c.p2}</p>
          <p>{c.p3}</p>
        </div>
      </div>
    </section>
  );
}
