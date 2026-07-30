/**
 * ატვირთვის ნაკადის ვერიფიკაციისთვის: იმავე კოდს უშვებს ცალკე პორტზე და
 * ცალკე (test) ბაზაზე, რომ პროდაქშენ მონაცემები არ დაბინძურდეს.
 *
 * გამოყენება: node scripts/start-test-server.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '..', '.env');

const raw = fs.readFileSync(envPath, 'utf8');
for (const line of raw.split(/\r?\n/)) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (!match) continue;
  process.env[match[1]] = match[2];
}

const uri = process.env.MONGODB_URI || '';
const parsed = uri.match(/^(mongodb(?:\+srv)?:\/\/[^/]+)\/([^?]*)(\?.*)?$/);
if (!parsed) {
  console.error('MONGODB_URI shape not recognized');
  process.exit(1);
}

const testDbName = process.env.TEST_DB_NAME || 'vrgeorgia_uploadtest';
process.env.MONGODB_URI = `${parsed[1]}/${testDbName}${parsed[3] || ''}`;
process.env.PORT = process.env.TEST_PORT || '5055';
process.env.NODE_ENV = 'development';

console.log(`[test-server] db=${testDbName} port=${process.env.PORT}`);

await import('../src/server.js');
