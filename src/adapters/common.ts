import { collectCodeBlocks, htmlToMarkdown, plainText } from '../markdown';
import type { Message, Role } from '../types';

export type RawMessage = Omit<Message, 'index'>;

/** Drop matches nested inside another match so each turn is captured once. */
export function outermost(els: Element[]): Element[] {
  return els.filter((el) => !els.some((other) => other !== el && other.contains(el)));
}

export function timestampOf(el: Element): string | null {
  const t = el.querySelector('time[datetime]') ?? el.closest('[data-timestamp]');
  const raw = t?.getAttribute('datetime') ?? t?.getAttribute('data-timestamp');
  if (!raw) return null;
  const d = new Date(/^\d+$/.test(raw) ? Number(raw) : raw);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function toMessage(role: Role, body: Element, opts: { plain?: boolean; tsFrom?: Element } = {}): RawMessage | null {
  const content = opts.plain && !body.querySelector('pre') ? plainText(body) : htmlToMarkdown(body);
  if (!content) return null;
  return { role, content, timestamp: timestampOf(opts.tsFrom ?? body), codeBlocks: collectCodeBlocks(body) };
}

export function compact(list: (RawMessage | null)[]): RawMessage[] {
  return list.filter((m): m is RawMessage => m !== null);
}

export function hostIs(url: URL, ...hosts: string[]): boolean {
  return hosts.some((h) => url.hostname === h || url.hostname.endsWith(`.${h}`));
}
