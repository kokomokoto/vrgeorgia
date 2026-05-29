/**
 * ყველა ობიექტის tourLink-ის გასწორება (localhost → production).
 * გაშვება: node --import ./src/env-bootstrap.js scripts/fix-tour-links.js
 */
import mongoose from 'mongoose';
import { Property } from '../src/models/Property.js';
import { normalizeTourLink } from '../src/utils/tourLink.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vrgeorgia';

async function main() {
  await mongoose.connect(MONGODB_URI);
  const props = await Property.find({
    tourLink: { $exists: true, $ne: '' },
  }).select('_id tourLink title');

  let fixed = 0;
  for (const p of props) {
    const next = normalizeTourLink(p.tourLink);
    if (next && next !== p.tourLink) {
      await Property.updateOne({ _id: p._id }, { tourLink: next });
      console.log(`✓ ${p.title}: ${p.tourLink} → ${next}`);
      fixed++;
    }
  }
  console.log(`Done. Fixed ${fixed} / ${props.length} properties with tourLink.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
