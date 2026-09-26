const KA_TO_LATIN = {
  ა: 'a',
  ბ: 'b',
  გ: 'g',
  დ: 'd',
  ე: 'e',
  ვ: 'v',
  ზ: 'z',
  თ: 't',
  ი: 'i',
  კ: 'k',
  ლ: 'l',
  მ: 'm',
  ნ: 'n',
  ო: 'o',
  პ: 'p',
  ჟ: 'zh',
  რ: 'r',
  ს: 's',
  ტ: 't',
  უ: 'u',
  ფ: 'f',
  ქ: 'k',
  ღ: 'gh',
  ყ: 'y',
  შ: 'sh',
  ჩ: 'ch',
  ც: 'ts',
  ძ: 'dz',
  წ: 'ts',
  ჭ: 'ch',
  ხ: 'kh',
  ჯ: 'j',
  ჰ: 'h',
};

function slugifyListingTitle(title) {
  let out = '';
  for (const ch of String(title || '').trim().toLowerCase()) {
    if (KA_TO_LATIN[ch]) out += KA_TO_LATIN[ch];
    else if (/[a-z0-9]/.test(ch)) out += ch;
    else out += '-';
  }
  return out.replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 70).replace(/-$/g, '');
}

/** საჯარო ბილიკი: სათაურის ლათინური ფორმა + უცვლელი numericId. */
export function buildPropertyUrlKey(property) {
  const id = property?._id ? String(property._id) : '';
  const numericId = Number(property?.numericId);
  if (!Number.isInteger(numericId) || numericId < 100000 || numericId > 1099999) return id;
  const slug = slugifyListingTitle(property?.title);
  return slug ? `${slug}-${numericId}` : String(numericId);
}

export function numericIdFromPublicPath(raw) {
  const id = decodeURIComponent(String(raw || '')).trim();
  if (/^[a-fA-F0-9]{24}$/.test(id)) return null;
  const match = id.match(/(?:^|-)(\d{6,7})$/);
  if (!match) return null;
  const numericId = Number(match[1]);
  if (numericId < 100000 || numericId > 1099999) return null;
  return numericId;
}
