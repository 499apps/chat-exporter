import { collectCodeBlocks, htmlToMarkdown, plainText } from '../markdown';
import type { Attachment, RawTurn, Role } from '../types';

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

/** querySelectorAll over a list of selectors, tolerating any invalid one. */
export function queryAll(root: ParentNode, selectors: string[]): Element[] {
  const out: Element[] = [];
  for (const s of selectors) {
    try {
      out.push(...Array.from(root.querySelectorAll(s)));
    } catch {
      /* selector unsupported in this engine; skip */
    }
  }
  return inDocOrder(out);
}

export function firstText(doc: ParentNode, selectors: string[]): string | null {
  for (const el of queryAll(doc, selectors)) {
    const t = (el.getAttribute('data-message-model-slug') ?? el.textContent ?? '').replace(/\s+/g, ' ').trim();
    if (t && t.length <= 60) return t;
  }
  return null;
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

const KEY_ATTRS = ['data-message-id', 'data-turn-id', 'id'];

/** Stable key: a page-provided id on the turn (never an ancestor), else role + content hash. */
export function turnKey(el: Element, role: Role, content: string): string {
  for (const a of KEY_ATTRS) {
    const holder = el.hasAttribute(a) ? el : el.querySelector(`[${a}]`);
    const v = holder?.getAttribute(a);
    if (v) return `${role}:${a}:${v}`;
  }
  return `${role}:${hash(content)}`;
}

/* ---------- Shared content handling (all sites) ---------- */

/** Thinking / reasoning panels. Pulled out of the body into `thinking`. */
export const THINKING = [
  '[data-testid*="thinking"]',
  '[data-testid*="reasoning"]',
  '[data-thinking]',
  '.thinking-block',
  '.thinking-container',
  '[class*="thinking-block"]',
  '[class*="thought-process"]',
  'model-thoughts',
  '.model-thoughts',
  '.thoughts-container',
  'details.thinking',
];

/** File chips / uploads shown in a message. */
export const FILES = [
  '[data-testid*="file-attachment"]',
  '[data-testid="file-thumbnail"]',
  '.file-attachment',
  '[class*="file-chip"]',
  '[data-attachment-name]',
  'uploaded-file',
];

/** Artifact / canvas cards that live in a side panel. */
export const ARTIFACTS = [
  '[data-testid*="artifact"]',
  '.artifact-block',
  '[class*="artifact-block"]',
  '[data-testid*="canvas"]',
  'immersive-entry-chip',
  '.canvas-chip',
];

/** UI noise: hidden branches, screen-reader labels, branch counters like "2 / 3". */
const HIDDEN = ['[hidden]', '[aria-hidden="true"]', '[style*="display: none"]', '[style*="display:none"]', '.sr-only', '.visually-hidden'];

function label(el: Element): string | null {
  const t =
    el.getAttribute('data-attachment-name') ??
    el.getAttribute('title') ??
    el.getAttribute('aria-label') ??
    el.querySelector('[class*="title"], [class*="name"]')?.textContent ??
    Array.from(el.childNodes)
      .filter((n) => !(n.nodeType === 1 && (n as Element).tagName === 'BUTTON'))
      .map((n) => n.textContent ?? '')
      .join(' ');
  const s = (t ?? '').replace(/\s+/g, ' ').trim();
  return s ? s.slice(0, 120) : null;
}

function placeholder(doc: Document, text: string): Element {
  const p = doc.createElement('p');
  p.textContent = text;
  return p;
}

export interface Prepared {
  body: Element;
  thinking: string | null;
  attachments: Attachment[];
}

/**
 * Work on a clone (never the live page): drop hidden UI, pull out thinking,
 * and replace files / artifacts / images with readable placeholders.
 */
export function prepare(source: Element): Prepared {
  const body = source.cloneNode(true) as Element;
  const doc = body.ownerDocument;
  const attachments: Attachment[] = [];

  for (const el of queryAll(body, HIDDEN)) if (!el.closest('.katex, mjx-container')) el.remove();
  for (const el of Array.from(body.querySelectorAll('.tabular-nums, [data-testid*="branch"]'))) {
    if (/^\s*[<‹]?\s*\d+\s*\/\s*\d+\s*[>›]?\s*$/.test(el.textContent ?? '')) el.remove();
  }

  const thinkingParts: string[] = [];
  for (const el of outermost(queryAll(body, THINKING))) {
    const t = htmlToMarkdown(el);
    if (t) thinkingParts.push(t);
    el.remove();
  }

  for (const el of outermost(queryAll(body, FILES))) {
    const name = label(el);
    attachments.push({ kind: 'file', name, alt: null });
    el.replaceWith(placeholder(doc, `[Attachment: ${name ?? 'file'}]`));
  }

  for (const el of outermost(queryAll(body, ARTIFACTS))) {
    const name = label(el.querySelector('[class*="title"]') ?? el) ;
    attachments.push({ kind: 'artifact', name, alt: null });
    const pres = Array.from(el.querySelectorAll('pre'));
    const marker = placeholder(doc, `[Artifact: ${name ?? 'untitled'}]`);
    if (pres.length) {
      const wrap = doc.createElement('div');
      wrap.append(marker, ...pres);
      el.replaceWith(wrap);
    } else {
      el.replaceWith(marker);
    }
  }

  for (const img of Array.from(body.querySelectorAll('img'))) {
    const alt = (img.getAttribute('alt') ?? '').trim();
    const decorative = img.getAttribute('role') === 'presentation' || (!alt && Number(img.getAttribute('width') ?? 99) < 24);
    if (decorative) {
      img.remove();
      continue;
    }
    attachments.push({ kind: 'image', name: null, alt: alt || null });
  }

  return { body, thinking: thinkingParts.length ? thinkingParts.join('\n\n') : null, attachments };
}

export function toMessage(
  role: Role,
  source: Element,
  opts: { plain?: boolean; tsFrom?: Element; keyFrom?: Element } = {},
): RawMessage | null {
  const { body, thinking, attachments } = prepare(source);
  const rich = body.querySelector('pre, img, table, ul, ol, .katex, mjx-container, [data-math], p + p');
  const content = opts.plain && !rich ? plainText(body) : htmlToMarkdown(body);
  if (!content && !thinking && !attachments.length) return null;
  return {
    role,
    content,
    timestamp: timestampOf(opts.tsFrom ?? source),
    codeBlocks: collectCodeBlocks(body),
    thinking,
    attachments,
    key: turnKey(opts.keyFrom ?? opts.tsFrom ?? source, role, content || thinking || ''),
  };
}

export function compact(list: (RawMessage | null)[]): RawMessage[] {
  return list.filter((m): m is RawMessage => m !== null);
}

export function hostIs(url: URL, ...hosts: string[]): boolean {
  return hosts.some((h) => url.hostname === h || url.hostname.endsWith(`.${h}`));
}

export function anyMatch(doc: ParentNode, selectors: string[]): boolean {
  return queryAll(doc, selectors).length > 0;
}
