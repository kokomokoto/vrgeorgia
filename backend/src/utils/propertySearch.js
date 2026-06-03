import Agent from '../models/Agent.js';
import { User } from '../models/User.js';

const MIN_PHONE_DIGITS = 2;
const MIN_NAME_TOKEN_LEN = 2;

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

/** ციფრული ჯგუფები მთელი მოთხოვნიდან და ცალკე ტოკენებიდან */
function collectPhoneDigitGroups(q) {
  const trimmed = String(q).trim();
  const groups = new Set();
  const all = trimmed.replace(/\D/g, '');
  if (all.length >= MIN_PHONE_DIGITS) groups.add(all);
  for (const token of trimmed.split(/\s+/)) {
    const d = token.replace(/\D/g, '');
    if (d.length >= MIN_PHONE_DIGITS && /^[\d\s.\-()+]+$/.test(token)) groups.add(d);
  }
  return [...groups];
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
