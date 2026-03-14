import mongoose from 'mongoose';

// Source: Local MongoDB
const LOCAL_URI = 'mongodb://127.0.0.1:27017/vrgeorgia';
// Destination: Atlas
const ATLAS_URI = 'mongodb+srv://alambarimalambari_db_user:q7M624akMsDUx9v2@vrgeorgia.jwbtwjc.mongodb.net/vrgeorgia?retryWrites=true&w=majority&appName=vrgeorgia';

async function migrate() {
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
