/** ტელეფონი მესენჯერების ლინკებისთვის (საქართველო: 995…) */
export function normalizePhoneForMessengers(phone: string): {
  digits: string;
  e164: string;
} | null {
  let digits = phone.replace(/\D/g, '');
  if (!digits) return null;
  if (digits.length === 9 && digits.startsWith('5')) digits = `995${digits}`;
  else if (digits.length === 10 && digits.startsWith('0')) digits = `995${digits.slice(1)}`;
  if (digits.length < 9) return null;
  return { digits, e164: `+${digits}` };
}

export function whatsAppUrl(phone: string): string | null {
  const n = normalizePhoneForMessengers(phone);
  return n ? `https://wa.me/${n.digits}` : null;
}

export function viberUrl(phone: string): string | null {
  const n = normalizePhoneForMessengers(phone);
  return n ? `viber://chat?number=${encodeURIComponent(n.e164)}` : null;
}

export function telegramUrl(phone: string): string | null {
  const n = normalizePhoneForMessengers(phone);
  return n ? `tg://resolve?phone=${n.digits}` : null;
}

/** ვებზე Telegram — მობილურზე tg://, სხვაგან t.me */
export function telegramWebUrl(phone: string): string | null {
  const n = normalizePhoneForMessengers(phone);
  return n ? `https://t.me/+${n.digits}` : null;
}
