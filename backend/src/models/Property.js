import mongoose from 'mongoose';

const propertySchema = new mongoose.Schema(
  {
    numericId: { type: Number, unique: true, sparse: true },
    title: { type: String, required: true, trim: true },
    desc: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    priceCurrency: { type: String, enum: ['USD', 'GEL'], default: 'USD' },
    priceType: { type: String, enum: ['total', 'per_sqm'], default: 'total' },

    city: { type: String, default: '' },
    /** ქუჩა / სრული მისამართის ხაზი (რუკიდან ან ძებნიდან) */
    street: { type: String, default: '' },
    region: { type: String, default: '' },
    
    // თბილისის სპეციფიკური ველები
    tbilisiDistrict: { type: String, default: '' }, // ვაკე-საბურთალო, ისანი-სამგორი და ა.შ.
    tbilisiSubdistricts: [{ type: String }], // კონკრეტული უბნები

    sqm: { type: Number, default: 0 },
    /** სახლის ფართობი (კვ.მ) — მიწის/საერთო ფართობის (sqm) გარდა */
    houseSqm: { type: Number, default: 0 },
    rooms: { type: Number, default: 0 },
    bedrooms: { type: Number, default: 0 },
    
    // დეტალური ინფორმაცია
    roomCount: { type: Number, default: 0 },
    floor: { type: Number, default: 0 },
    totalFloors: { type: Number, default: 0 },
    balcony: { type: Number, default: 0 },
    loggia: { type: Number, default: 0 },
    bathroom: { type: Number, default: 0 },
    constructionYear: { type: Number, default: null },
    renovationYear: { type: Number, default: null },
    cadastralCode: { type: String, default: '', trim: true },
    /** true = საკადასტრო არ ჩანს სიაში/ობიექტის გვერდზე და არ მოძებნება ტექსტური q-ით */
    cadastralHidden: { type: Boolean, default: false },
    
    // ბინის პროექტის ტიპი (მხოლოდ apartment-ისთვის)
    buildingProject: { type: String, enum: ['', 'czech', 'khrushchev', 'urban', 'lvov', 'budapest', 'kiev', 'moscow', 'new_build', 'tbilisi', 'other'], default: '' },
    renovationStatus: { type: String, enum: ['', 'green_frame', 'white_frame', 'black_frame', 'renovated', 'to_renovate'], default: '' },
    
    // კომფორტი და კომუნიკაციები
    amenities: {
      basement: { type: Boolean, default: false },
      elevator: { type: Boolean, default: false },
      furniture: { type: Boolean, default: false },
      garage: { type: Boolean, default: false },
      centralHeating: { type: Boolean, default: false },
      naturalGas: { type: Boolean, default: false },
      storage: { type: Boolean, default: false },
      internet: { type: Boolean, default: false },
      electricity: { type: Boolean, default: false },
      water: { type: Boolean, default: false },
      security: { type: Boolean, default: false },
      airConditioner: { type: Boolean, default: false },
      fireplace: { type: Boolean, default: false },
      pool: { type: Boolean, default: false },
      garden: { type: Boolean, default: false },
      balcony: { type: Boolean, default: false },
      terrace: { type: Boolean, default: false },
      isolatedKitchen: { type: Boolean, default: false },
      heatingCooling: { type: Boolean, default: false }
    },

    location: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true }
    },

    type: { type: String, enum: ['apartment', 'house', 'commercial', 'land', 'cottage', 'hotel', 'building', 'warehouse', 'parking', 'business'], required: true },
    dealType: { type: String, enum: ['sale', 'rent', 'mortgage'], required: true },

    photos: [{ type: String }],
    /** 360° equirectangular ფოტოების URL-ები (photos-ის ქვემნიჯვანეობა) */
    panoramaPhotos: [{ type: String }],
    mainPhoto: { type: Number, default: 0 }, // photos მასივში მთავარი ფოტოს ინდექსი
    threeDLink: { type: String, default: '' }, // ძველი ველი - ბექვორდ კომპატიბილობისთვის
    exteriorLink: { type: String, default: '' }, // 3D ექსტერიერი
    interiorLink: { type: String, default: '' }, // 3D ინტერიერი
    tourLink: { type: String, default: '' }, // VR 360° ტური (tour-builder /v/...)
    
    // მედია ლინკები (YouTube, Facebook, TikTok და ა.შ.)
    mediaLinks: [{
      url: { type: String, required: true },
      type: { type: String, enum: ['youtube', 'facebook', 'tiktok', 'instagram', 'other'], default: 'other' },
      title: { type: String, default: '' }
    }],

    contact: {
      phone: { type: String, default: '' },
      email: { type: String, default: '' }
    },

    views: { type: Number, default: 0 },
    /** საჯარო სია/რუკა: public | unlisted (მხოლოდ ლინკით) | private (მხოლოდ მფლობელი) */
    listingVisibility: {
      type: String,
      enum: ['public', 'unlisted', 'private'],
      default: 'public',
    },
    /** unlisted რეჟიმისთვის — კერძო ლინკი ?t= */
    shareToken: { type: String, trim: true, default: undefined },

    status: { type: String, enum: ['pending', 'active', 'rejected', 'sold'], default: 'pending' },
    moderationHistory: [
      {
        status: { type: String, enum: ['pending', 'active', 'rejected', 'sold'], required: true },
        reason: { type: String, default: '' },
        adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        createdAt: { type: Date, default: Date.now }
      }
    ],

    // პირადი ჩანაწერი - მხოლოდ მფლობელისთვის ხილული
    privateNotes: { type: String, default: '' },

    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    agentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent', default: null },

    // ადმინის მიერ აპინული ობიექტი — მთავარ გვერდზე პირველ რიგში ჩანს
    pinned: { type: Boolean, default: false },
    pinnedAt: { type: Date, default: null },

    // Optional translated fields cache, keyed by language code.
    // Example: { en: { title: '...', desc: '...' }, ru: { ... } }
    translations: {
      type: Map,
      of: new mongoose.Schema(
        {
          title: { type: String },
          desc: { type: String }
        },
        { _id: false }
      ),
      default: undefined
    }
  },
  { timestamps: true }
);

propertySchema.index({ title: 'text', desc: 'text', city: 'text', region: 'text' });
propertySchema.index({ shareToken: 1 }, { unique: true, sparse: true });

// კატეგორიის მიხედვით ID-ის დიაპაზონები (100 000 თითოეულისთვის)
const TYPE_RANGES = {
  apartment:  { min: 100000, max: 199999 },
  house:      { min: 200000, max: 299999 },
  commercial: { min: 300000, max: 399999 },
  land:       { min: 400000, max: 499999 },
  cottage:    { min: 500000, max: 599999 },
  hotel:      { min: 600000, max: 699999 },
  building:   { min: 700000, max: 799999 },
  warehouse:  { min: 800000, max: 899999 },
  parking:    { min: 900000, max: 999999 },
  business:   { min: 1000000, max: 1099999 },
};

propertySchema.pre('save', async function (next) {
  if (this.numericId) return next();
  
  const range = TYPE_RANGES[this.type];
  if (!range) return next(new Error('Unknown type: ' + this.type));

  // ვეძებთ ამ დიაპაზონში ბოლო (ყველაზე დიდი) numericId
  const last = await mongoose.model('Property')
    .findOne({ numericId: { $gte: range.min, $lte: range.max } })
    .sort({ numericId: -1 })
    .select('numericId')
    .lean();

  this.numericId = last ? last.numericId + 1 : range.min;
  
  if (this.numericId > range.max) {
    return next(new Error(`ID ლიმიტი ამოიწურა ${this.type} ტიპისთვის`));
  }
  
  next();
});

export const Property = mongoose.model('Property', propertySchema);
