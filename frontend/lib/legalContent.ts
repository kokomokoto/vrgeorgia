import { SITE_CONTACT } from '@/lib/siteContact';
import type { SiteLang } from '@/lib/siteLang';

type Block = { h: string; p: string[] };

export type LegalDoc = {
  title: string;
  intro: string;
  sections: Block[];
};

export const TERMS: Record<SiteLang, LegalDoc> = {
  ka: {
    title: 'წესები და პირობები',
    intro: `ეს წესები არეგულირებს Vhome (${SITE_CONTACT.legalName}, vhome.ge) პლატფორმის გამოყენებას. საიტზე შესვლით ან განცხადების განთავსებით ეთანხმებით ქვემოთ ჩამოთვლილ პირობებს.`,
    sections: [
      {
        h: '1. პლატფორმა',
        p: [
          'Vhome არის უძრავი ქონების ონლაინ მარკეტპლეისი საქართველოში: განცხადებები იყიდება/ქირავდება/გირავდება, რუკა, აგენტების პროფილები და 3D/VR ტურები. ჩვენ ვაჩვენებთ ინფორმაციას, რომელსაც აგენტები და მფლობელები ატვირთავენ; გარიგების მხარეები თავად დებენ ხელშეკრულებას.',
        ],
      },
      {
        h: '2. ანგარიში და განცხადებები',
        p: [
          'აკრძალულია ყალბი ობიექტები, სხვისი ფოტოები ნებართვის გარეშე, დისკრიმინაციული ან უკანონო შინაარსი.',
          'Vhome-ს შეუძლია განცხადების დაფარვა, რედაქტირება ან წაშლა, თუ ის არღვევს წესებს ან შეცდომაში შეჰყავს მომხმარებელს.',
        ],
      },
      {
        h: '3. 3D ტურები და მედია',
        p: [
          '3D/Gaussian Splatting ტურები და პანორამები განკუთვნილია ობიექტის დისტანციური დათვალიერებისთვის. ისინი არ ცვლიან ადგილზე შემოწმებას და არ წარმოადგენენ იურიდიულ გარანტიას მდგომარეობაზე.',
        ],
      },
      {
        h: '4. პასუხისმგებლობა აგენტებზე',
        p: [
          'Vhome პასუხს აგებს საიტზე დარეგისტრირებულ თითოეულ აგენტზე და მის განცხადებაზე, მათ შორის ფასზე. აგენტი რჩება პლატფორმაზე მანამ, სანამ ამ წესებს იცავს. თუ აგენტის ქმედება ან მითითებული ფასი არასწორია, მოგვწერეთ — ჩვენ გავარკვევთ და გამოვასწორებთ.',
          'იპოთეკის კალკულატორი საინფორმაციოა და საბოლოო საბანკო შეთავაზებას არ ცვლის.',
        ],
      },
      {
        h: '5. კონტაქტი',
        p: [
          `კითხვებისთვის: ${SITE_CONTACT.email}, ${SITE_CONTACT.phoneDisplay}. მისამართი: ${SITE_CONTACT.cityKa}, საქართველო.`,
        ],
      },
    ],
  },
  en: {
    title: 'Terms of use',
    intro: `These terms govern use of Vhome (${SITE_CONTACT.legalName}, vhome.ge). By browsing the site or publishing a listing you agree to the conditions below.`,
    sections: [
      {
        h: '1. The platform',
        p: [
          'Vhome is a real-estate marketplace for Georgia: sale, rent and mortgage listings, a map, agent profiles and 3D/VR tours. We display information uploaded by agents and owners; the parties themselves conclude any transaction.',
        ],
      },
      {
        h: '2. Accounts and listings',
        p: [
          'Fake properties, photos used without permission, and discriminatory or illegal content are forbidden.',
          'Vhome may hide, edit or remove a listing that breaks these rules or misleads users.',
        ],
      },
      {
        h: '3. 3D tours and media',
        p: [
          '3D / Gaussian-splat tours and panoramas are for remote viewing. They do not replace an on-site inspection and are not a legal warranty of condition.',
        ],
      },
      {
        h: '4. Responsibility for agents',
        p: [
          'Vhome is responsible for every agent registered on the site and for their listing, including the price. An agent stays on the platform only while they follow these rules. If an agent’s conduct or a listed price is wrong, contact us — we will look into it and correct it.',
          'The mortgage calculator is informational and does not replace a bank’s final offer.',
        ],
      },
      {
        h: '5. Contact',
        p: [`Questions: ${SITE_CONTACT.email}, ${SITE_CONTACT.phoneDisplay}. Address: ${SITE_CONTACT.city}, Georgia.`],
      },
    ],
  },
  ru: {
    title: 'Условия использования',
    intro: `Эти условия регулируют использование Vhome (${SITE_CONTACT.legalName}, vhome.ge). Просматривая сайт или размещая объявление, вы соглашаетесь с ними.`,
    sections: [
      {
        h: '1. Платформа',
        p: [
          'Vhome — рынок недвижимости Грузии: продажа, аренда и залог, карта, профили агентов и 3D/VR-туры. Мы показываем данные, которые загружают агенты и владельцы; сделку стороны заключают сами.',
        ],
      },
      {
        h: '2. Аккаунт и объявления',
        p: [
          'Запрещены фейковые объекты, чужие фото без разрешения, дискриминационный или незаконный контент.',
          'Vhome может скрыть, изменить или удалить объявление, которое нарушает правила или вводит пользователей в заблуждение.',
        ],
      },
      {
        h: '3. 3D-туры и медиа',
        p: [
          '3D / Gaussian Splatting туры и панорамы нужны для удалённого осмотра. Они не заменяют визит на объект и не являются юридической гарантией состояния.',
        ],
      },
      {
        h: '4. Ответственность за агентов',
        p: [
          'Vhome отвечает за каждого агента, зарегистрированного на сайте, и за его объявление, включая цену. Агент остаётся на платформе, пока соблюдает эти правила. Если действие агента или указанная цена неверны, напишите нам — мы разберёмся и исправим.',
          'Ипотечный калькулятор носит справочный характер и не заменяет окончательное предложение банка.',
        ],
      },
      {
        h: '5. Контакт',
        p: [`Вопросы: ${SITE_CONTACT.email}, ${SITE_CONTACT.phoneDisplay}. Адрес: ${SITE_CONTACT.city}, Грузия.`],
      },
    ],
  },
};

export const PRIVACY: Record<SiteLang, LegalDoc> = {
  ka: {
    title: 'კონფიდენციალობის პოლიტიკა',
    intro:
      'ეს პოლიტიკა აღწერს, რა მონაცემებს ვაგროვებთ Vhome-ზე, რისთვის ვიყენებთ და როგორ შეგიძლიათ მართოთ ისინი. ვმუშაობთ საქართველოს პერსონალურ მონაცემთა დაცვის კანონმდებლობის შესაბამისად.',
    sections: [
      {
        h: '1. რა მონაცემებს ვაგროვებთ',
        p: [
          'ანგარიში: სახელი, ელ-ფოსტა, ტელეფონი, პაროლის ჰეში. განცხადება: მისამართი, ფასი, ფოტოები, აღწერა, საკონტაქტო არხები. თუ ჩართულია ანალიტიკა (GA4), Google აყენებს cookie-ს მხოლოდ იმისთვის, რომ დავთვალოთ რამდენი ადამიანი შემოვიდა და საიდან. სახელსა და ტელეფონს არ ინახავს.',
        ],
      },
      {
        h: '2. რისთვის',
        p: [
          'სერვისის მიწოდება (განცხადებები, შეტყობინებები, აგენტის პროფილი), უსაფრთხოება და ბოროტად გამოყენების აღკვეთა, პროდუქტის გაუმჯობესება, კანონით გათვალისწინებული ვალდებულებები. მარკეტინგული წერილები მხოლოდ თანხმობით.',
        ],
      },
      {
        h: '3. გაზიარება',
        p: [
          'საჯარო განცხადების ველი (ფასი, მისამართი, ფოტო) ჩანს ყველას. შიდა ველები (მოდერაციის ისტორია, წაშლის მონაცემები) საჯარო API-ში არ გადის. ჰოსტინგი და CDN: Render, Cloudflare, Cloudinary. სამართალდამცავებისთვის — მხოლოდ კანონიერი მოთხოვნით.',
        ],
      },
      {
        h: '4. შენახვა და უფლებები',
        p: [
          `მონაცემებს ვინახავთ, სანამ ანგარიში აქტიურია, ან კანონით გათვალისწინებული ვადით. წაშლა/გასწორება: ${SITE_CONTACT.email}. Cookie-ების მართვა ბრაუზერის პარამეტრებით.`,
        ],
      },
    ],
  },
  en: {
    title: 'Privacy policy',
    intro:
      'This policy explains what data Vhome collects, why, and how you can control it. We operate under Georgia’s personal-data protection law.',
    sections: [
      {
        h: '1. What we collect',
        p: [
          'Account: name, email, phone, password hash. Listing: address, price, photos, description, contact channels. If analytics (GA4) is enabled, Google sets a cookie only to count visits and see where people came from. It does not store a name or phone number.',
        ],
      },
      {
        h: '2. Why',
        p: [
          'To provide the service (listings, messages, agent profile), security and abuse prevention, product improvement, and legal duties. Marketing email only with consent.',
        ],
      },
      {
        h: '3. Sharing',
        p: [
          'Public listing fields (price, address, photos) are visible to everyone. Internal fields (moderation history, deletion records) are not exposed on the public API. Hosting/CDN: Render, Cloudflare, Cloudinary. Law-enforcement access only on a lawful request.',
        ],
      },
      {
        h: '4. Retention and rights',
        p: [
          `We keep data while the account is active or as required by law. Deletion/correction: ${SITE_CONTACT.email}. Manage cookies in your browser settings.`,
        ],
      },
    ],
  },
  ru: {
    title: 'Политика конфиденциальности',
    intro:
      'Эта политика объясняет, какие данные собирает Vhome, зачем и как ими управлять. Мы работаем в соответствии с законодательством Грузии о персональных данных.',
    sections: [
      {
        h: '1. Какие данные',
        p: [
          'Аккаунт: имя, email, телефон, хеш пароля. Объявление: адрес, цена, фото, описание, контакты. Если включена аналитика (GA4), Google ставит cookie только чтобы посчитать визиты и увидеть, откуда пришёл человек. Имя и телефон он не сохраняет.',
        ],
      },
      {
        h: '2. Зачем',
        p: [
          'Оказание сервиса (объявления, сообщения, профиль агента), безопасность, улучшение продукта и законные обязанности. Маркетинговые письма — только с согласия.',
        ],
      },
      {
        h: '3. Передача',
        p: [
          'Публичные поля объявления (цена, адрес, фото) видны всем. Внутренние поля (история модерации, удаления) в публичный API не попадают. Хостинг/CDN: Render, Cloudflare, Cloudinary. Правоохранительным органам — только по законному запросу.',
        ],
      },
      {
        h: '4. Хранение и права',
        p: [
          `Храним данные, пока аккаунт активен, или столько, сколько требует закон. Удаление/исправление: ${SITE_CONTACT.email}. Cookie настраиваются в браузере.`,
        ],
      },
    ],
  },
};
