import React from 'react';

/** http(s) URLs — whitespace/punctuation-delimited */
const URL_RE = /https?:\/\/[^\s<>"'`]+/gi;

function trimTrailingPunctuation(url: string): { href: string; trail: string } {
  let href = url;
  let trail = '';
  while (href && /[.,;:!?)}\]'"]$/.test(href)) {
    trail = href.slice(-1) + trail;
    href = href.slice(0, -1);
  }
  return { href, trail };
}

type Props = {
  text: string;
  className?: string;
};

/** ტექსტში http(s) ბმულებს დაკლიკებად <a>-დ აქცევს (XSS-safe — ტექსტის ნოუდები). */
export function LinkifiedText({ text, className }: Props) {
  const parts: React.ReactNode[] = [];
  const raw = String(text || '');
  let last = 0;
  let m: RegExpExecArray | null;
  const re = new RegExp(URL_RE.source, URL_RE.flags);
  let i = 0;

  while ((m = re.exec(raw)) !== null) {
    const start = m.index;
    if (start > last) {
      parts.push(raw.slice(last, start));
    }
    const { href, trail } = trimTrailingPunctuation(m[0]);
    if (href) {
      parts.push(
        <a
          key={`u-${i++}-${start}`}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="break-all font-medium text-teal-700 underline underline-offset-2 hover:text-teal-900"
        >
          {href}
        </a>
      );
    }
    if (trail) parts.push(trail);
    last = start + m[0].length;
  }

  if (last < raw.length) {
    parts.push(raw.slice(last));
  }

  return <span className={className}>{parts.length ? parts : raw}</span>;
}
