import { collectCodeBlocks, htmlToMarkdown, plainText } from '../markdown';
import type { RawTurn, Role } from '../types';

export type RawMessage = RawTurn;

/** Drop matches nested inside another match so each turn is captured once. */
export function outermost(els: Element[]): Element[] {
  return els.filter((el) => !els.some((other) => other !== el && other.contains(el)));
}

/** Unique elements in document order. */
export function inDocOrder(els: Iterable<Element>): Element[] {
  return Array.from(new Set(els)).sort((a, b) =>
    a === b ? 0 : a.compareDocumentPosition(b) & 4 /* FOLLOWING */ ? -1 : 1,
  );
}

export function timestampOf(el: Element): string | null {
  const t = el.querySelector('time[datetime]') ?? el.closest('[data-timestamp]');
  const raw = t?.getAttribute('datetime') ?? t?.getAttribute('data-timestamp');
  if (!raw) return null;
  const d = new Date(/^\d+$/.test(raw) ? Number(raw) : raw);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Small stable string hash (FNV-1a). */
export function hash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

const KEY_ATTRS = ['data-message-id', 'data-testid-id', 'data-turn-id', 'id'];

/** Stable key: a page-provided id if present, else role + content hash. */
export function turnKey(el: Element, role: Role, content: string): string {
  for (const a of KEY_ATTRS) {
    // Only the turn element itself or its descendants; never ancestors, which
    // are shared by many turns (scroll containers, lists).
    const holder = el.hasAttribute(a) ? el : el.querySelector(`[${a}]`);
    const v = holder?.getAttribute(a);
    if (v) return `${role}:${a}:${v}`;
  }
  return `${role}:${hash(content)}`;
}

export function toMessage(
  role: Role,
  body: Element,
  opts: { plain?: boolean; tsFrom?: Element; keyFrom?: Element } = {},
): RawMessage | null {
  const content = opts.plain && !body.querySelector('pre') ? plainText(body) : htmlToMarkdown(body);
  if (!content) return null;
  return {
    role,
    content,
    timestamp: timestampOf(opts.tsFrom ?? body),
    codeBlocks: collectCodeBlocks(body),
    key: turnKey(opts.keyFrom ?? opts.tsFrom ?? body, role, content),
  };
}

export function compact(list: (RawMessage | null)[]): RawMessage[] {
  return list.filter((m): m is RawMessage => m !== null);
}

export function hostIs(url: URL, ...hosts: string[]): boolean {
  return hosts.some((h) => url.hostname === h || url.hostname.endsWith(`.${h}`));
}
