import Agent from '../models/Agent.js';
import { User } from '../models/User.js';

/** სუფთა ნომრის ძიება. 2–4 ციფრი სახლის ნომერია და ტელეფონად არ უნდა ემთხვეოდეს. */
const MIN_PHONE_DIGITS = 5;
/** ტექსტში ჩაყოლებული ნომერი (მისამართი + ტელეფონი) — მხოლოდ სრული ნომრის სიგრძით. */
const MIN_EMBEDDED_PHONE_DIGITS = 6;
const MIN_NAME_TOKEN_LEN = 2;
const SEARCH_TRANSLATION_LANGS = ['ka', 'en', 'ru'];
const SEARCH_TRANSLATION_FIELDS = ['title', 'desc', 'city', 'street'];
const LOCATION_FIELDS = ['street', 'city', 'region', 'tbilisiDistrict', 'tbilisiSubdistricts'];

export function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** ციფრები თანმიმდევრობით — ნომერში ნებისმიერ ადგილას (შორის სფაცერი/ტირე დაშვებული) */
function buildPhoneDigitRegex(q) {
  const digits = String(q).replace(/\D/g, '');
  if (digits.length < MIN_PHONE_DIGITS) return null;
  const pattern = digits.split('').map((d) => escapeRegex(d)).join('[\\s.\\-()+]*');
  return { $regex: pattern, $options: 'i' };
}

/** ნაწილობრივი ტექსტური შესაბამისობა (როგორც სათაური, ქალაქი...) */
function buildTextRegex(q) {
  const trimmed = String(q).trim();
  if (!trimmed) return null;
  return { $regex: escapeRegex(trimmed), $options: 'i' };
}

function isPhoneShaped(value) {
  const trimmed = String(value || '').trim();
  return trimmed.length > 0 && /^[\d\s.\-()+]+$/.test(trimmed);
}

/**
 * ტელეფონის ციფრები მხოლოდ მაშინ, როცა მოთხოვნა ნომერია.
 * „გამზირი 25“-დან 25 აღარ გამოიყოფა — ის სახლის ნომერია, არა ტელეფონის ნაწილი.
 */
function collectPhoneDigitGroups(q) {
  const trimmed = String(q).trim();
  const groups = new Set();
  const phoneQuery = isPhoneShaped(trimmed);
  if (phoneQuery) {
    const all = trimmed.replace(/\D/g, '');
    if (all.length >= MIN_PHONE_DIGITS) groups.add(all);
  }
  for (const token of trimmed.split(/\s+/)) {
    if (!isPhoneShaped(token)) continue;
    const digits = token.replace(/\D/g, '');
    const min = phoneQuery ? MIN_PHONE_DIGITS : MIN_EMBEDDED_PHONE_DIGITS;
    if (digits.length >= min) groups.add(digits);
  }
  return [...groups];
}

function locationFieldPaths() {
  const fields = [...LOCATION_FIELDS];
  for (const lang of SEARCH_TRANSLATION_LANGS) {
    fields.push(`translations.${lang}.street`, `translations.${lang}.city`);
  }
  return fields;
}

function buildNumberTokenRegex(digits) {
  return { $regex: `(?:^|[^0-9])${escapeRegex(digits)}(?:[^0-9]|$)`, $options: 'i' };
}

/**
 * ბარათზე მისამართი არის „ქუჩა, ქალაქი“, ბაზაში კი ცალ-ცალკე ველებია.
 * ყველა სიტყვა უნდა ემთხვეოდეს რომელიმე ლოკაციის ველს.
 */
function buildLocationPhraseAnd(q) {
  const tokens = String(q)
    .split(/[\s,]+/)
    .map((token) => token.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''))
    .filter((token) => token.length >= 2);
  if (tokens.length < 2) return null;

  const fields = locationFieldPaths();
  return {
    $and: tokens.map((token) => {
      const rx = /^\d+$/.test(token) ? buildNumberTokenRegex(token) : buildTextRegex(token);
      return { $or: fields.map((field) => ({ [field]: rx })) };
    }),
  };
}

function phoneOrConditions(q) {
  const conditions = [];
  const textRx = buildTextRegex(q);
  if (textRx) conditions.push(textRx);
  for (const digits of collectPhoneDigitGroups(q)) {
    const digitRx = buildPhoneDigitRegex(digits);
    if (digitRx) conditions.push(digitRx);
  }
  return conditions;
}

/** აგენტი/მომხმარებელი → property.userId */
export async function findOwnerUserIdsForSearch(q) {
  const trimmed = String(q).trim();
  if (!trimmed) return [];

  const agentOr = [];
  const userOr = [];

  for (const rx of phoneOrConditions(trimmed)) {
    agentOr.push({ name: rx }, { company: rx }, { phone: rx });
    userOr.push({ name: rx }, { phone: rx });
  }

  const tokens = trimmed.split(/\s+/).filter((t) => t.length >= MIN_NAME_TOKEN_LEN);
  if (tokens.length > 1) {
    const agentAnd = tokens.map((t) => {
      const rx = { $regex: escapeRegex(t), $options: 'i' };
      return { $or: [{ name: rx }, { company: rx }] };
    });
    const userAnd = tokens.map((t) => ({
      name: { $regex: escapeRegex(t), $options: 'i' },
    }));

    const [agents, users] = await Promise.all([
      Agent.find({ $and: agentAnd }).select('user').lean(),
      User.find({ $and: userAnd }).select('_id').lean(),
    ]);
    const ids = new Set();
    for (const a of agents) if (a.user) ids.add(String(a.user));
    for (const u of users) ids.add(String(u._id));
    return [...ids];
  }

  if (!agentOr.length) return [];

  const [agents, users] = await Promise.all([
    Agent.find({ $or: agentOr }).select('user').lean(),
    User.find({ $or: userOr }).select('_id').lean(),
  ]);

  const ids = new Set();
  for (const a of agents) if (a.user) ids.add(String(a.user));
  for (const u of users) ids.add(String(u._id));
  return [...ids];
}

/** საჯარო ძიების $or — ტელეფონიც იგივე პრინციპით, როგორც სხვა ველები */
export async function buildPropertyTextSearchOr(q) {
  const trimmed = String(q).trim();
  if (!trimmed) return [];

  const textRx = buildTextRegex(trimmed);
  const textOr = [];

  if (textRx) {
    textOr.push(
      { title: textRx },
      { desc: textRx },
      { city: textRx },
      { street: textRx },
      { region: textRx },
      { tbilisiDistrict: textRx },
      { tbilisiSubdistricts: textRx },
      {
        $and: [{ cadastralCode: textRx }, { cadastralHidden: { $ne: true } }],
      },
      { type: textRx },
      { dealType: textRx },
      { buildingProject: textRx },
      { renovationStatus: textRx },
      { 'contact.phone': textRx },
      { 'contact.email': textRx },
      { privateNotes: textRx }
    );

    // ცალენოვან ველებში მისამართი შენახულია ერთ ენაზე, თარგმანები კი translations map-ში.
    // ვეძებთ სამივე ენის ვარიანტში, რომ მაგ. ინგლისურად შენახული ქუჩა ქართული query-თაც მოიძებნოს.
    for (const lang of SEARCH_TRANSLATION_LANGS) {
      for (const field of SEARCH_TRANSLATION_FIELDS) {
        textOr.push({ [`translations.${lang}.${field}`]: textRx });
      }
    }

    const locationPhrase = buildLocationPhraseAnd(trimmed);
    if (locationPhrase) textOr.push(locationPhrase);
  }

  for (const digits of collectPhoneDigitGroups(trimmed)) {
    const phoneRx = buildPhoneDigitRegex(digits);
    if (phoneRx) textOr.push({ 'contact.phone': phoneRx });
  }

  const ownerIds = await findOwnerUserIdsForSearch(trimmed);
  if (ownerIds.length) {
    textOr.push({ userId: { $in: ownerIds } });
  }

  const num = Number(trimmed);
  if (!Number.isNaN(num) && num > 0) {
    textOr.push(
      { numericId: num },
      { price: num },
      { sqm: num },
      { rooms: num },
      { bedrooms: num }
    );
  }

  return textOr;
}
