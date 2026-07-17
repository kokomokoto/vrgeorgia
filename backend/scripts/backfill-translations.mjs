/**
 * One-time backfill: translate every property's user-facing text (title, desc, city,
 * street, region) into the configured languages and store it on the document.
 *
 * After this runs, every user gets ready-made translations from the database —
 * no per-user, per-language re-translation.
 *
 * Usage (from repo root or backend/):
 *   node backend/scripts/backfill-translations.mjs
 *   LANGS=en,ru node backend/scripts/backfill-translations.mjs
 *   FORCE=1 node backend/scripts/backfill-translations.mjs   # re-translate even if cached
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Load the same env the backend server uses (backend/.env), so we hit the same DB.
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const { Property } = await import('../src/models/Property.js');
const { translateText, detectLang } = await import('../src/services/translate.js');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vrgeorgia';
const LANGS = (process.env.LANGS || 'ka,en,ru')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);
const FORCE = process.env.FORCE === '1' || process.env.FORCE === 'true';
const FIELDS = ['title', 'desc', 'city', 'street'];

// A field needs translation into `lang` only if it is stored in a different language.
function fieldNeedsTranslation(text, lang) {
  const value = text ? String(text).trim() : '';
  if (!value) return false;
  return detectLang(value) !== lang;
}

function entryComplete(entry, doc, lang) {
  return FIELDS.every((f) => {
    if (!fieldNeedsTranslation(doc[f], lang)) return true;
    return entry && entry[f] && String(entry[f]).trim();
  });
}

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log(`Connected. Backfilling langs: ${LANGS.join(', ')}${FORCE ? ' (FORCE)' : ''}`);

  // lean cursor: we only read source text; persistence uses targeted updateOne
  // so legacy docs with stale enum values don't fail full-document validation.
  const cursor = Property.find({ deletedAt: null })
    .select([...FIELDS, 'translations'].join(' '))
    .lean()
    .cursor();
  let processed = 0;
  let updated = 0;
  let translationCalls = 0;

  for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
    processed += 1;
    const setOps = {};

    for (const lang of LANGS) {
      const existing = (doc.translations && doc.translations[lang]) || {};
      if (!FORCE && entryComplete(existing, doc, lang)) continue;

      const entry = { ...existing };
      for (const field of FIELDS) {
        const src = doc[field];
        if (!fieldNeedsTranslation(src, lang)) continue;
        if (!FORCE && entry[field] && String(entry[field]).trim()) continue;
        try {
          const translated = await translateText(src, lang); // source auto-detected
          translationCalls += 1;
          if (translated && translated !== src) entry[field] = translated;
        } catch (err) {
          console.warn(`  ! ${doc._id} ${lang}.${field} failed:`, err?.message || err);
        }
      }

      if (Object.keys(entry).length) setOps[`translations.${lang}`] = entry;
    }

    if (Object.keys(setOps).length) {
      await Property.updateOne({ _id: doc._id }, { $set: setOps });
      updated += 1;
      console.log(`  ✓ ${doc._id} (${(doc.title || '').slice(0, 40)})`);
    }

    if (processed % 25 === 0) {
      console.log(`... processed ${processed}, updated ${updated}, calls ${translationCalls}`);
    }
  }

  console.log(`\nDone. processed=${processed} updated=${updated} translationCalls=${translationCalls}`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
