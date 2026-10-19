import 'dotenv/config';
import mongoose from 'mongoose';
import { Property } from './src/models/Property.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vrgeorgia';

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
};

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  // ჯერ ყველა არსებულ პროპერტის numericId წავშალოთ რომ ახალი დიაპაზონით გადანაწილდეს
  const resetResult = await Property.updateMany({}, { $unset: { numericId: '' } });
  console.log(`Reset numericId for ${resetResult.modifiedCount} properties`);

  // ყველა პროპერტი (ხელახლა მინიჭება კატეგორიის მიხედვით)
  const properties = await Property.find({})
    .sort({ createdAt: 1 })
    .lean();

  console.log(`Found ${properties.length} properties to assign`);

  // ვითვლით თითოეული type-ისთვის მიმდინარე მაქსიმუმს
  const counters = {};
  for (const [type, range] of Object.entries(TYPE_RANGES)) {
    counters[type] = range.min - 1;
    console.log(`  ${type}: starting at ${range.min}`);
  }

  let updated = 0;
  for (const prop of properties) {
    const type = prop.type;
    const range = TYPE_RANGES[type];
    if (!range) {
      console.warn(`  Unknown type "${type}" for property ${prop._id}, skipping`);
      continue;
    }

    counters[type]++;
    const newId = counters[type];

    if (newId > range.max) {
      console.error(`  ID limit reached for type "${type}"!`);
      break;
    }

    await Property.updateOne({ _id: prop._id }, { $set: { numericId: newId } });
    updated++;
    console.log(`  ${prop._id} → ${newId} (${type})`);
  }

  console.log(`\nDone! Updated ${updated} properties.`);
  
  // საბოლოო სტატისტიკა
  for (const [type, range] of Object.entries(TYPE_RANGES)) {
    const count = await Property.countDocuments({ numericId: { $gte: range.min, $lte: range.max } });
    console.log(`  ${type}: ${count} properties (${range.min}-${range.max})`);
  }

  await mongoose.disconnect();
}

main().catch(console.error);
