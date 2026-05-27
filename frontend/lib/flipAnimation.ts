/** FLIP: ელემენტები ვიზუალურად „გადაადგილდება“ ახალ პოზიციაზე reorder-ის შემდეგ */
export function captureFlipPositions(container: HTMLElement): Map<string, DOMRect> {
  const map = new Map<string, DOMRect>();
  container.querySelectorAll('[data-flip-key]').forEach((node) => {
    const el = node as HTMLElement;
    const key = el.dataset.flipKey;
    if (!key) return;
    map.set(key, el.getBoundingClientRect());
  });
  return map;
}

export function animateFlip(
  container: HTMLElement,
  firstPositions: Map<string, DOMRect>,
  options?: { durationMs?: number; skipKey?: string }
) {
  const duration = options?.durationMs ?? 280;
  const skipKey = options?.skipKey;

  container.querySelectorAll('[data-flip-key]').forEach((node) => {
    const el = node as HTMLElement;
    const key = el.dataset.flipKey;
    if (!key || key === skipKey) return;

    const first = firstPositions.get(key);
    if (!first) return;

    const last = el.getBoundingClientRect();
    const dx = first.left - last.left;
    const dy = first.top - last.top;
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;

    el.getAnimations().forEach((a) => a.cancel());

    el.animate(
      [
        { transform: `translate(${dx}px, ${dy}px)` },
        { transform: 'translate(0, 0)' },
      ],
      {
        duration,
        easing: 'cubic-bezier(0.2, 0, 0.2, 1)',
        fill: 'both',
      }
    );
  });
}
