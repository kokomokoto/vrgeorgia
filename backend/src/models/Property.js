import mongoose from 'mongoose';

const propertySchema = new mongoose.Schema(
  {
    numericId: { type: Number, unique: true, sparse: true },
    title: { type: String, required: true, trim: true },
    desc: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    priceCurrency: { type: String, enum: ['USD', 'GEL'], default: 'USD' },

    city: { type: String, default: '' },
    region: { type: String, default: '' },
    
    // თბილისის სპეციფიკური ველები
    tbilisiDistrict: { type: String, default: '' }, // ვაკე-საბურთალო, ისანი-სამგორი და ა.შ.
    tbilisiSubdistricts: [{ type: String }], // კონკრეტული უბნები

    sqm: { type: Number, default: 0 },
    rooms: { type: Number, default: 0 },
    
    // დეტალური ინფორმაცია
    roomCount: { type: Number, default: 0 },
    floor: { type: Number, default: 0 },
    totalFloors: { type: Number, default: 0 },
    balcony: { type: Number, default: 0 },
    loggia: { type: Number, default: 0 },
    bathroom: { type: Number, default: 0 },
    cadastralCode: { type: String, default: '' },
    
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
      garden: { type: Boolean, default: false }
    },

    location: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true }
    },

    type: { type: String, enum: ['apartment', 'house', 'commercial', 'land', 'cottage', 'hotel', 'building', 'warehouse', 'parking'], required: true },
    dealType: { type: String, enum: ['sale', 'rent', 'mortgage', 'daily', 'under_construction'], required: true },

    photos: [{ type: String }],
    mainPhoto: { type: Number, default: 0 }, // photos მასივში მთავარი ფოტოს ინდექსი
    threeDLink: { type: String, default: '' }, // ძველი ველი - ბექვორდ კომპატიბილობისთვის
    exteriorLink: { type: String, default: '' }, // 3D ექსტერიერი
    interiorLink: { type: String, default: '' }, // 3D ინტერიერი
    
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

    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    agentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent', default: null },

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

// გარიგების ტიპის მიხედვით ID-ის დიაპაზონები
const DEAL_TYPE_RANGES = {
  sale:               { min: 100000, max: 299999 },
  rent:               { min: 300000, max: 499999 },
  mortgage:           { min: 500000, max: 699999 },
  daily:              { min: 700000, max: 899999 },
  under_construction: { min: 900000, max: 1099999 },
};

propertySchema.pre('save', async function (next) {
  if (this.numericId) return next();
  
  const range = DEAL_TYPE_RANGES[this.dealType];
  if (!range) return next(new Error('Unknown dealType: ' + this.dealType));

  // ვეძებთ ამ დიაპაზონში ბოლო (ყველაზე დიდი) numericId
  const last = await mongoose.model('Property')
    .findOne({ numericId: { $gte: range.min, $lte: range.max } })
    .sort({ numericId: -1 })
    .select('numericId')
    .lean();

  this.numericId = last ? last.numericId + 1 : range.min;
  
  if (this.numericId > range.max) {
    return next(new Error(`ID ლიმიტი ამოიწურა ${this.dealType} ტიპისთვის`));
  }
  
  next();
});

export const Property = mongoose.model('Property', propertySchema);
