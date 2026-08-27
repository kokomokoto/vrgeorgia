/** Sticky header-ის სიმაღლე — ეტაპის ბარათი ჰედერის ქვეშ გამოჩნდეს */
export const FORM_STEP_HEADER_OFFSET_PX = 96;

/**
 * ელემენტს მყისიერად ათავსებს viewport-ის ზედა ნაწილში (ჰედერის ქვემოთ).
 * `auto` — უპირველესად, რომ არ ჩანდეს „ჯერ ქვემოთ, მერე ზემოთ“ ანიმაცია.
 */
export function scrollFormStepIntoView(
  el: HTMLElement | null | undefined,
  headerOffsetPx: number = FORM_STEP_HEADER_OFFSET_PX
) {
  if (!el || typeof window === 'undefined') return;

  const top = window.scrollY + el.getBoundingClientRect().top - headerOffsetPx;
  window.scrollTo({ top: Math.max(0, top), behavior: 'auto' });
}

/**
 * Layout-ის შემდეგ ერთხელ ასქროლავს სწორ ადგილას (paint-მდე გამოსაძახებლად —
 * useLayoutEffect + ეს ჰელპერი).
 */
export function scheduleScrollFormStepIntoView(
  el: HTMLElement | null | undefined,
  headerOffsetPx: number = FORM_STEP_HEADER_OFFSET_PX
): () => void {
  if (!el || typeof window === 'undefined') return () => {};

  // უკვე commit-ის შემდეგ ვართ — ერთი სინქრონული სქროლი საკმარისია.
  scrollFormStepIntoView(el, headerOffsetPx);

  // იშვიათად რუკა/შიგთავსი სიმაღლეს მეორე ტიკზე ცვლის — ერთი მშვიდი გასწორება.
  let raf = 0;
  raf = window.requestAnimationFrame(() => {
    const delta = el.getBoundingClientRect().top - headerOffsetPx;
    if (Math.abs(delta) > 4) {
      scrollFormStepIntoView(el, headerOffsetPx);
    }
  });

  return () => {
    window.cancelAnimationFrame(raf);
  };
}
