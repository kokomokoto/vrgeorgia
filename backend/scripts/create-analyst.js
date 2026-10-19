/**
 * ანალიტიკოსის შექმნა
 * Usage: node create-analyst.js <username> <password> [name]
 * Example: node create-analyst.js analyst SecurePass123 "გიორგი"
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { Analyst } from './src/models/Analyst.js';

const [,, username, password, name] = process.argv;

if (!username || !password) {
  console.log('Usage: node create-analyst.js <username> <password> [name]');
  console.log('Example: node create-analyst.js analyst MySecretPass "გიორგი"');
  process.exit(1);
}

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vrgeorgia';

async function main() {
  await mongoose.connect(MONGODB_URI);
  
  const exists = await Analyst.findOne({ username });
  if (exists) {
    console.log(`❌ ანალიტიკოსი "${username}" უკვე არსებობს.`);
    await mongoose.disconnect();
    process.exit(1);
  }
  
  const passwordHash = await Analyst.hashPassword(password);
  const analyst = await Analyst.create({ username, passwordHash, name: name || '' });
  
  console.log(`✅ ანალიტიკოსი შექმნილია:`);
  console.log(`   Username: ${analyst.username}`);
  console.log(`   Name: ${analyst.name || '(არ არის მითითებული)'}`);
  console.log(`\n   გამოიყენე ეს მონაცემები /analytics გვერდზე შესასვლელად.`);
  
  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
