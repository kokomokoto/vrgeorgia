/**
 * Set role: 'admin' for a user by email.
 *
 * Usage:
 *   node set-admin.js your@email.com
 *
 * Uses MONGODB_URI from backend/.env, or mongodb://127.0.0.1:27017/vrgeorgia locally.
 */
import 'dotenv/config';
import mongoose from 'mongoose';

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error('Usage: node set-admin.js <email>');
  process.exit(1);
}

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vrgeorgia';

async function setAdmin() {
  await mongoose.connect(uri);
  const result = await mongoose.connection.db
    .collection('users')
    .updateOne({ email }, { $set: { role: 'admin', status: 'approved' } });

  if (result.matchedCount === 0) {
    const all = await mongoose.connection.db
      .collection('users')
      .find({}, { projection: { email: 1, role: 1 } })
      .toArray();
    console.error(`No user with email: ${email}`);
    console.log('Existing users:', all.map((u) => ({ email: u.email, role: u.role })));
    process.exit(1);
  }

  console.log(`OK: ${email} is now admin (modified: ${result.modifiedCount})`);
  await mongoose.disconnect();
  process.exit(0);
}

setAdmin().catch((err) => {
  console.error(err);
  process.exit(1);
});
