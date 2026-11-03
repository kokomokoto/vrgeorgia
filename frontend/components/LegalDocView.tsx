import type { LegalDoc } from '@/lib/legalContent';

export function LegalDocView({ doc }: { doc: LegalDoc }) {
  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-10 text-slate-800 dark:text-zinc-200">
      <h1 className="text-3xl font-bold text-slate-900 dark:text-zinc-50">{doc.title}</h1>
      <p className="mt-4 text-[15px] leading-relaxed">{doc.intro}</p>
      {doc.sections.map((s) => (
        <section key={s.h} className="mt-8">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-zinc-50">{s.h}</h2>
          {s.p.map((para) => (
            <p key={para.slice(0, 48)} className="mt-3 text-[15px] leading-relaxed">
              {para}
            </p>
          ))}
        </section>
      ))}
    </article>
  );
}
