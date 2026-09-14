/** Default social / Open Graph image (absolute via metadataBase). */
export const DEFAULT_OG_IMAGE = {
  url: '/images/home-hero.jpg',
  width: 1200,
  height: 630,
  alt: 'Vhome — უძრავი ქონება საქართველოში',
};

/** Georgian titles/descriptions for /services/[slug] metadata. */
export const SERVICE_SEO: Record<
  string,
  { title: string; description: string }
> = {
  arch: {
    title: 'არქიტექტურული პროექტირება',
    description:
      'კერძო სახლის, ბინის და კომერციული ობიექტის არქიტექტურული პროექტირება — იდეა, ფასადი, ნახაზები.',
  },
  docs: {
    title: 'სამშენებლო დოკუმენტაცია',
    description: 'სამშენებლო დოკუმენტაცია, ტექნიკური პროექტი და ნებართვებთან შესაბამისობა.',
  },
  planning: {
    title: 'გეგმარება და ტერიტორიის ანალიზი',
    description: 'ნაკვეთის პოტენციალი, ზონირება, ფუნქციური განაწილება ინვესტიციამდე.',
  },
  interior: {
    title: 'ინტერიერის დიზაინი',
    description: 'ინტერიერის დიზაინი: განლაგება, მასალები, განათება და სტილი.',
  },
  landscape: {
    title: 'ლანდშაფტის არქიტექტურა',
    description: 'ეზოს და გარე სივრცის ლანდშაფტური პროექტირება.',
  },
  vis: {
    title: 'ვიზუალიზაცია, 3D და ვირტუალური ტური',
    description: 'ფოტორეალისტური რენდერები, 3D და ვირტუალური ტურები პრეზენტაციისთვის.',
  },
  heritage: {
    title: 'რეკონსტრუქცია და მემკვიდრეობა',
    description: 'არსებული შენობის გამაგრება, რეკონსტრუქცია და მემკვიდრეობის შენარჩუნება.',
  },
  consult: {
    title: 'კონსულტაცია',
    description: 'არქიტექტურული და სამშენებლო კონსულტაცია: ბიუჯეტი, ეტაპები, რისკები.',
  },
};
