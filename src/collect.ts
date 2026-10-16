import type { RawTurn, SiteAdapter } from './types';

export interface CollectOptions {
  maxSteps?: number;
  timeoutMs?: number;
  settleMs?: number;
  sleep?: (ms: number) => Promise<void>;
}

/** Merge turns seen across scroll positions, keeping first-seen order. */
export function mergeTurns(seen: Map<string, RawTurn>, order: string[], batch: RawTurn[]): void {
  let anchor = -1;
  for (const t of batch) {
    const key = t.key ?? `${t.role}:${t.content}`;
    const at = order.indexOf(key);
    if (at >= 0) {
      anchor = at;
      continue;
    }
    seen.set(key, t);
    order.splice(anchor + 1, 0, key);
    anchor += 1;
  }
}

function scrollable(el: Element | null): HTMLElement | null {
  for (let n = el?.parentElement ?? null; n; n = n.parentElement) {
    const view = n.ownerDocument.defaultView ?? (typeof window !== 'undefined' ? window : null);
    const style = view?.getComputedStyle(n);
    if (n.scrollHeight > n.clientHeight + 4 && style && /(auto|scroll)/.test(style.overflowY)) return n;
  }
  const root = el?.ownerDocument.scrollingElement as HTMLElement | null;
  return root && root.scrollHeight > root.clientHeight + 4 ? root : null;
}

/**
 * Collect every turn even when the site virtualizes or lazy-loads its list:
 * scroll the conversation container to the top (repeating while older turns
 * keep appearing), then step down to the bottom, extracting at each position.
 * Bounded by maxSteps and timeoutMs; restores the original scroll position.
 */
export async function collectAll(doc: Document, adapter: SiteAdapter, opts: CollectOptions = {}): Promise<RawTurn[]> {
  const { maxSteps = 300, timeoutMs = 45_000, settleMs = 350 } = opts;
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const seen = new Map<string, RawTurn>();
  const order: string[] = [];
  const take = () => mergeTurns(seen, order, adapter.extract(doc));
  take();

  const first = doc.querySelector("[data-message-author-role], [data-testid=\"user-message\"], [data-test-render-count], [data-is-streaming], .font-claude-response, user-query, model-response, [id^=\"response-\"], .message-bubble");
  const box = scrollable(first);
  if (!box) return order.map((k) => seen.get(k)!);

  const start = box.scrollTop;
  const deadline = Date.now() + timeoutMs;
  let steps = 0;
  const live = () => steps < maxSteps && Date.now() < deadline;

  // Phase 1: go to the top until no older content loads.
  let lastHeight = -1;
  let lastCount = -1;
  while (live() && (box.scrollHeight !== lastHeight || order.length !== lastCount)) {
    lastHeight = box.scrollHeight;
    lastCount = order.length;
    box.scrollTop = 0;
    steps++;
    await sleep(settleMs);
    take();
  }
  // Phase 2: sweep down.
  const step = Math.max(200, Math.floor(box.clientHeight * 0.7));
  while (live()) {
    const before = box.scrollTop;
    box.scrollTop = before + step;
    steps++;
    await sleep(settleMs);
    take();
    if (box.scrollTop <= before || box.scrollTop + box.clientHeight >= box.scrollHeight - 2) {
      await sleep(settleMs);
      take();
      break;
    }
  }
  box.scrollTop = start;
  return order.map((k) => seen.get(k)!);
}
