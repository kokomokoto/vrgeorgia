/**
 * მხოლოდ კითხვადი ანგარიში: რამდენ დუბლიკატს პოულობს ადმინის ინსტრუმენტი რეალურ ბაზაში.
 * არაფერს არ შლის და არ ცვლის.
 *
 * გამოყენება: node scripts/report-duplicates.mjs
 */
import mongoose from 'mongoose';
import '../src/models/User.js';
import '../src/models/Agent.js';
import { findDuplicatePropertyGroups } from '../src/services/duplicateProperties.js';

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI არ არის');
  process.exit(1);
}

await mongoose.connect(uri);

const groups = await findDuplicatePropertyGroups({ windowMinutes: 60, sinceDays: 365 });

let extra = 0;
for (const g of groups) extra += Math.max(0, g.count - 1);

console.log(`\nდუბლიკატის ჯგუფი: ${groups.length}`);
console.log(`ზედმეტი ჩანაწერი სულ: ${extra}\n`);

for (const g of groups.slice(0, 15)) {
  const first = g.items[0];
  console.log(
    `— "${String(first.title || '').slice(0, 45)}" | ${first.price} ${first.priceCurrency || ''} | ჩანაწერი: ${g.count} | უფოტოო: ${g.photolessCount}`
  );
  for (const i of g.items) {
    console.log(
      `    ${i._id} · ფოტო=${i.photoCount} · ${new Date(i.createdAt).toISOString()}${
        String(i._id) === String(g.keeperId) ? '  <= შესანახი' : ''
      }`
    );
  }
}

await mongoose.disconnect();
