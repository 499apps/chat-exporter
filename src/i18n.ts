/** i18n helpers. Strings live in public/_locales/<lang>/messages.json. */
export function t(key: string, subs: (string | number)[] = []): string {
  const s = subs.map(String);
  try {
    const g = globalThis as { chrome?: { i18n?: { getMessage(k: string, subs?: string[]): string } } };
    const msg = g.chrome?.i18n?.getMessage(key, s);
    if (msg) return msg;
  } catch {
    /* not in an extension context */
  }
  return key;
}

/** Fill [data-i18n], [data-i18n-aria-label], [data-i18n-title] and [data-i18n-placeholder]. */
export function localize(root: ParentNode = document): void {
  for (const el of Array.from(root.querySelectorAll<HTMLElement>('[data-i18n]'))) el.textContent = t(el.dataset.i18n!);
  for (const attr of ['aria-label', 'title', 'placeholder']) {
    for (const el of Array.from(root.querySelectorAll<HTMLElement>(`[data-i18n-${attr}]`))) {
      el.setAttribute(attr, t(el.getAttribute(`data-i18n-${attr}`)!));
    }
  }
}
