import 'dotenv/config';
import mongoose from 'mongoose';
import { Property } from './src/models/Property.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vrgeorgia';

const DEAL_TYPE_RANGES = {
  sale:               { min: 100000, max: 299999 },
  rent:               { min: 300000, max: 499999 },
  mortgage:           { min: 500000, max: 699999 },
  daily:              { min: 700000, max: 899999 },
  under_construction: { min: 900000, max: 1099999 },
};

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  // ყველა პროპერტი numericId-ის გარეშე
  const properties = await Property.find({ $or: [{ numericId: null }, { numericId: { $exists: false } }] })
    .sort({ createdAt: 1 })
    .lean();

  console.log(`Found ${properties.length} properties without numericId`);

  // ვითვლით თითოეული dealType-ისთვის მიმდინარე მაქსიმუმს
  const counters = {};
  for (const [dealType, range] of Object.entries(DEAL_TYPE_RANGES)) {
    const last = await Property.findOne({ numericId: { $gte: range.min, $lte: range.max } })
      .sort({ numericId: -1 })
      .select('numericId')
      .lean();
    counters[dealType] = last ? last.numericId : range.min - 1;
    console.log(`  ${dealType}: current max = ${counters[dealType]}`);
  }

  let updated = 0;
  for (const prop of properties) {
    const dealType = prop.dealType;
    const range = DEAL_TYPE_RANGES[dealType];
    if (!range) {
      console.warn(`  Unknown dealType "${dealType}" for property ${prop._id}, skipping`);
      continue;
    }

    counters[dealType]++;
    const newId = counters[dealType];

    if (newId > range.max) {
      console.error(`  ID limit reached for dealType "${dealType}"!`);
      break;
    }

    await Property.updateOne({ _id: prop._id }, { $set: { numericId: newId } });
    updated++;
    console.log(`  ${prop._id} → ${newId} (${dealType})`);
  }

  console.log(`\nDone! Updated ${updated} properties.`);
  
  // საბოლოო სტატისტიკა
  for (const [dealType, range] of Object.entries(DEAL_TYPE_RANGES)) {
    const count = await Property.countDocuments({ numericId: { $gte: range.min, $lte: range.max } });
    console.log(`  ${dealType}: ${count} properties (${range.min}-${range.max})`);
  }

  await mongoose.disconnect();
}

main().catch(console.error);
