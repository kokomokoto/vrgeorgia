/**
 * tb_tours / tb_scenes / tb_hotspots კოპირება ერთი MongoDB-დან მეორეში.
 * მაგ. ლოკალური dev → Atlas production.
 *
 *   SOURCE_MONGODB_URI=mongodb://127.0.0.1:27017/vrgeorgia ^
 *   TARGET_MONGODB_URI="mongodb+srv://..." ^
 *   node backend/scripts/copy-tour-collections.mjs
 */
import mongoose from 'mongoose';

const SOURCE = process.env.SOURCE_MONGODB_URI || 'mongodb://127.0.0.1:27017/vrgeorgia';
const TARGET = process.env.TARGET_MONGODB_URI || process.env.MONGODB_URI;

if (!TARGET) {
  console.error('TARGET_MONGODB_URI ან MONGODB_URI საჭიროა (production Atlas).');
  process.exit(1);
}

const COLLECTIONS = ['tb_tours', 'tb_scenes', 'tb_hotspots'];

async function copyCollection(sourceDb, targetDb, name) {
  const docs = await sourceDb.collection(name).find({}).toArray();
  if (docs.length === 0) {
    console.log(`${name}: ცარიელი — გამოტოვება`);
    return 0;
  }
  const col = targetDb.collection(name);
  let upserted = 0;
  for (const doc of docs) {
    const { _id, ...rest } = doc;
    await col.updateOne({ id: rest.id }, { $set: rest }, { upsert: true });
    upserted += 1;
  }
  console.log(`${name}: ${upserted} დოკუმენტი`);
  return upserted;
}

async function main() {
  const sourceConn = await mongoose.createConnection(SOURCE).asPromise();
  const targetConn = await mongoose.createConnection(TARGET).asPromise();
  const sourceDb = sourceConn.db;
  const targetDb = targetConn.db;

  let total = 0;
  for (const name of COLLECTIONS) {
    total += await copyCollection(sourceDb, targetDb, name);
  }

  console.log(`სულ: ${total} ჩანაწერი გადატანილია → ${TARGET.replace(/:[^:@]+@/, ':***@')}`);
  await sourceConn.close();
  await targetConn.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
