import 'dotenv/config';
import mongoose from 'mongoose';

// ერთჯერადი მიგრაცია: ლოკალური MongoDB → Atlas.
// კავშირის სტრიქონები მხოლოდ გარემოს ცვლადებიდან — კოდში credentials არ ინახება.
//   MIGRATE_SOURCE_URI=mongodb://127.0.0.1:27017/vrgeorgia MIGRATE_TARGET_URI=<atlas uri> node scripts/migrate-to-atlas.js
const LOCAL_URI = process.env.MIGRATE_SOURCE_URI || 'mongodb://127.0.0.1:27017/vrgeorgia';
const ATLAS_URI = process.env.MIGRATE_TARGET_URI || process.env.MONGODB_URI || '';

async function migrate() {
  if (!ATLAS_URI) {
    console.error('❌ MIGRATE_TARGET_URI (ან MONGODB_URI) არ არის მითითებული');
    process.exit(1);
  }
  if (ATLAS_URI === LOCAL_URI) {
    console.error('❌ წყარო და სამიზნე ერთი და იგივე ბაზაა');
    process.exit(1);
  }
  console.log('🔗 Connecting to LOCAL MongoDB...');
  const localConn = await mongoose.createConnection(LOCAL_URI).asPromise();
  console.log('✅ Connected to LOCAL');

  console.log('🔗 Connecting to ATLAS...');
  const atlasConn = await mongoose.createConnection(ATLAS_URI).asPromise();
  console.log('✅ Connected to ATLAS');

  // Get all collection names from local
  const collections = await localConn.db.listCollections().toArray();
  console.log(`\n📦 Found ${collections.length} collections:`, collections.map(c => c.name).join(', '));

  for (const col of collections) {
    const name = col.name;
    const localCollection = localConn.db.collection(name);
    const atlasCollection = atlasConn.db.collection(name);

    const docs = await localCollection.find({}).toArray();
    console.log(`\n📋 ${name}: ${docs.length} documents`);

    if (docs.length === 0) {
      console.log(`   ⏭️  Skipping (empty)`);
      continue;
    }

    // Clear existing data in Atlas for this collection
    await atlasCollection.deleteMany({});
    console.log(`   🗑️  Cleared Atlas collection`);

    // Insert all documents
    await atlasCollection.insertMany(docs);
    console.log(`   ✅ Migrated ${docs.length} documents to Atlas`);
  }

  console.log('\n🎉 Migration complete!');
  
  await localConn.close();
  await atlasConn.close();
  process.exit(0);
}

migrate().catch(err => {
  console.error('❌ Migration error:', err.message);
  process.exit(1);
});
