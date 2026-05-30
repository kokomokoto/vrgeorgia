/** მძიმეებით გამოსაჩენი ციფრული ველი — შიგნით ინახება „სუფთა“ სტრიქონი (მძიმეების გარეშე, ათწილადი `.`) */

export function parseLooseNumberInput(input: string): string {
  const s = input.replace(/,/g, '').replace(/[^\d.]/g, '');
  if (!s) return '';
  const dot = s.indexOf('.');
  if (dot === -1) return s;
  return s.slice(0, dot + 1) + s.slice(dot + 1).replace(/\./g, '');
}

export function formatNumberInputDisplay(clean: string): string {
  if (!clean) return '';
  const hasTrailingDot = clean.endsWith('.');
  const [intPart = '', decPart] = clean.split('.');
  const intDigits = intPart === '' ? '0' : intPart;
  const n = Number(intDigits);
  const intFormatted = Number.isFinite(n) ? n.toLocaleString('en-US') : intDigits;

  if (decPart !== undefined || hasTrailingDot) {
    if (hasTrailingDot && (decPart === undefined || decPart === '')) {
      return `${intFormatted}.`;
    }
    return `${intFormatted}.${decPart ?? ''}`;
  }
  return intFormatted;
}

export function formatNumberForDisplay(value: string | number): string {
  const clean = typeof value === 'number' ? String(value) : parseLooseNumberInput(value);
  if (!clean) return '';
  return formatNumberInputDisplay(clean);
}
