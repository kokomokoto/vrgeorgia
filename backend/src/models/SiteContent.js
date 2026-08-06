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

const siteContentSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      enum: ['faq', 'about', 'home-design'],
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
    /** Homepage Design Mode layout (JSON) */
    layout: { type: mongoose.Schema.Types.Mixed, default: undefined },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

export const SiteContent = mongoose.model('SiteContent', siteContentSchema);
