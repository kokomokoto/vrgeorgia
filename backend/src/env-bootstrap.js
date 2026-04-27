/**
 * ჩატვირთავს backend/.env-ს რაც შეიძლება ადრე:
 * - node --import=./src/env-bootstrap.js (გარანტირებული თანმიმდევობა)
 * - server.js-ის პირველი import (იმავე პაკეტის npm run dev-ისას)
 *
 * ასე JWT_SECRET და სხვა ცვლადები არსებობს process.env-ში სანამ სხვა მოდულები გაეშვება.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
