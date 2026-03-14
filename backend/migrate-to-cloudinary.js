/**
 * Migration script: Upload all local /uploads/ images to Cloudinary
 * and update MongoDB photo paths to Cloudinary URLs.
 *
 * Usage: node migrate-to-cloudinary.js
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const UPLOADS_DIR = path.join(__dirname, 'uploads');

// Cache: localPath -> cloudinaryUrl  (avoid re-uploading duplicates)
const urlCache = new Map();

async function uploadFile(localRelPath, folder) {
  if (urlCache.has(localRelPath)) return urlCache.get(localRelPath);

  // localRelPath is like "/uploads/1769638528749_xxx.jpg"
  const filename = localRelPath.replace(/^\/uploads\//, '');
  const fullPath = path.join(UPLOADS_DIR, filename);

  if (!fs.existsSync(fullPath)) {
    console.warn(`  ⚠ File not found: ${fullPath}`);
    return null;
  }

  try {
    const result = await cloudinary.uploader.upload(fullPath, {
      folder,
      resource_type: 'image',
      transformation: [{ quality: 'auto', fetch_format: 'auto' }],
    });
    urlCache.set(localRelPath, result.secure_url);
    return result.secure_url;
  } catch (err) {
    console.error(`  ✗ Upload failed for ${filename}:`, err.message);
    return null;
  }
}

async function migrateProperties(db) {
  const collection = db.collection('properties');
  const properties = await collection.find({ photos: { $exists: true, $not: { $size: 0 } } }).toArray();
  console.log(`\n📦 Properties with photos: ${properties.length}`);

  let updated = 0;
  for (const prop of properties) {
    const newPhotos = [];
    let changed = false;

    for (const photo of prop.photos) {
      if (photo.startsWith('http')) {
        // Already a Cloudinary URL
        newPhotos.push(photo);
        continue;
      }
      const url = await uploadFile(photo, 'vrgeorgia/properties');
      if (url) {
        newPhotos.push(url);
        changed = true;
      } else {
        newPhotos.push(photo); // keep old path if upload failed
      }
    }

    if (changed) {
      await collection.updateOne({ _id: prop._id }, { $set: { photos: newPhotos } });
      updated++;
      console.log(`  ✓ ${prop.title} — ${newPhotos.length} photos migrated`);
    }
  }
  console.log(`  Updated ${updated}/${properties.length} properties`);
}

async function migrateUsers(db) {
  const collection = db.collection('users');
  const users = await collection.find({
    avatar: { $exists: true, $ne: '', $not: /^https?:\/\// }
  }).toArray();
  console.log(`\n👤 Users with local avatars: ${users.length}`);

  let updated = 0;
  for (const user of users) {
    const url = await uploadFile(user.avatar, 'vrgeorgia/avatars');
    if (url) {
      await collection.updateOne({ _id: user._id }, { $set: { avatar: url } });
      updated++;
      console.log(`  ✓ ${user.email} — avatar migrated`);
    }
  }
  console.log(`  Updated ${updated}/${users.length} user avatars`);
}

async function migrateAgents(db) {
  const collection = db.collection('agents');
  const agents = await collection.find({
    photo: { $exists: true, $ne: '', $not: /^https?:\/\// }
  }).toArray();
  console.log(`\n🏢 Agents with local photos: ${agents.length}`);

  let updated = 0;
  for (const agent of agents) {
    const url = await uploadFile(agent.photo, 'vrgeorgia/agents');
    if (url) {
      await collection.updateOne({ _id: agent._id }, { $set: { photo: url } });
      updated++;
      const name = typeof agent.name === 'object' ? agent.name.ka || agent.name.en : agent.name;
      console.log(`  ✓ ${name} — photo migrated`);
    }
  }
  console.log(`  Updated ${updated}/${agents.length} agent photos`);
}

async function main() {
  console.log('🚀 Starting Cloudinary migration...');
  console.log(`   Cloud: ${process.env.CLOUDINARY_CLOUD_NAME}`);
  console.log(`   Uploads dir: ${UPLOADS_DIR}`);

  const fileCount = fs.readdirSync(UPLOADS_DIR).filter(f => f !== '.gitkeep').length;
  console.log(`   Local files: ${fileCount}`);

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('   Connected to MongoDB');

  const db = mongoose.connection.db;

  await migrateProperties(db);
  await migrateUsers(db);
  await migrateAgents(db);

  console.log(`\n✅ Migration complete! ${urlCache.size} unique files uploaded to Cloudinary.`);

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
