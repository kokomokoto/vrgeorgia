import mongoose from 'mongoose';

const localizedStringSchema = {
  ka: { type: String, default: '' },
  en: { type: String, default: '' },
  ru: { type: String, default: '' },
};

const faqItemSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, trim: true },
    question: localizedStringSchema,
    answer: localizedStringSchema,
  },
  { _id: false }
);

const aboutLinkSchema = new mongoose.Schema(
  {
    href: { type: String, default: '/' },
    label: { type: String, default: '' },
    desc: { type: String, default: '' },
  },
  { _id: false }
);

const aboutLangSchema = new mongoose.Schema(
  {
    title: { type: String, default: '' },
    intro: { type: String, default: '' },
    sectionWhat: { type: String, default: '' },
    items: { type: [aboutLinkSchema], default: [] },
    sectionWho: { type: String, default: '' },
    whoBody: { type: String, default: '' },
  },
  { _id: false }
);

const servicesSectionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, trim: true },
    styleKey: { type: String, default: 'arch', trim: true },
    featured: { type: Boolean, default: false },
    /** დამალული — პუბლიკურ გვერდზე არ ჩანს; ადმინი რედაქტირებაში ხედავს */
    hidden: { type: Boolean, default: false },
    /** სერვისის ფოტო (Cloudinary URL); ცარიელი = სტილის შაბლონის აიქონი */
    imageUrl: { type: String, default: '', trim: true },
    title: localizedStringSchema,
    body: localizedStringSchema,
  },
  { _id: false }
);

const servicesPageSchema = new mongoose.Schema(
  {
    title: localizedStringSchema,
    lead: localizedStringSchema,
    footerNote: localizedStringSchema,
  },
  { _id: false }
);

const brandingSchema = new mongoose.Schema(
  {
    /** Cloudinary URL; ცარიელი = დეფოლტი /images/vhome-icon.png */
    logoUrl: { type: String, default: '', trim: true },
  },
  { _id: false }
);

const siteContentSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      enum: ['faq', 'about', 'home-design', 'services', 'branding'],
      trim: true,
    },
    /** FAQ */
    faqItems: { type: [faqItemSchema], default: undefined },
    /** About — by language */
    aboutByLang: {
      type: {
        ka: aboutLangSchema,
        en: aboutLangSchema,
        ru: aboutLangSchema,
      },
      default: undefined,
    },
    /** Services page */
    servicesPage: { type: servicesPageSchema, default: undefined },
    servicesSections: { type: [servicesSectionSchema], default: undefined },
    /** Site logo / branding */
    branding: { type: brandingSchema, default: undefined },
    /** Homepage Design Mode layout (JSON) */
    layout: { type: mongoose.Schema.Types.Mixed, default: undefined },
    /** Named layout presets (admin-only; multiple “defaults”) */
    presets: { type: mongoose.Schema.Types.Mixed, default: undefined },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

export const SiteContent = mongoose.model('SiteContent', siteContentSchema);
