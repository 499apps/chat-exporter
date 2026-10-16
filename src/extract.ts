import { findAdapter } from './adapters';
import { collectAll, type CollectOptions } from './collect';
import { AdapterError, type Conversation, type RawTurn, type SiteAdapter } from './types';

export interface ExtractOptions extends CollectOptions {
  /** How long to wait for a reply that is still being generated (ms). */
  streamWaitMs?: number;
}

/** Self-check: compare what was exported with what the page appears to show. */
export function selfCheck(adapter: SiteAdapter, doc: Document, turns: RawTurn[], renderedBefore: number): string[] {
  const warnings: string[] = [];
  const users = turns.filter((t) => t.role === 'user').length;
  const replies = turns.length - users;
  if (users > 0 && replies === 0) {
    warnings.push(`Only your messages were found, no ${adapter.name} replies. The site may have changed, so this export is probably incomplete.`);
  } else if (replies > 0 && users === 0 && turns.length > 1) {
    warnings.push('No messages from you were found. The site may have changed, so this export may be incomplete.');
  }
  const visible = adapter.visibleTurnCount?.(doc) ?? 0;
  const expected = Math.max(visible, renderedBefore);
  if (expected > turns.length) {
    warnings.push(`The page shows about ${expected} messages but ${turns.length} were exported. Some messages may be missing.`);
  }
  return warnings;
}

function build(adapter: SiteAdapter, doc: Document, href: string, raw: RawTurn[], now: Date, warnings: string[]): Conversation {
  if (!raw.length) {
    const url = new URL(href);
    if (adapter.isConversationUrl && !adapter.isConversationUrl(url)) {
      throw new AdapterError(`Open a ${adapter.name} conversation first, then try again.`, 'empty');
    }
    throw new AdapterError(
      `Convo Keeper couldn't find any messages on this ${adapter.name} page. ${adapter.name} may have changed its layout, so the ${adapter.name} reader is probably out of date.`,
      'outdated',
    );
  }
  return {
    schema: 'convo-keeper/conversation',
    schemaVersion: 2,
    source: {
      site: adapter.id,
      siteName: adapter.name,
      url: href,
      title: adapter.title?.(doc) || `${adapter.name} conversation`,
      model: adapter.model?.(doc) ?? null,
    },
    exportedAt: now.toISOString(),
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    messages: raw.map(({ key, ...m }, index) => ({ index, ...m })),
    warnings,
  };
}

function adapterFor(href: string): SiteAdapter {
  const adapter = findAdapter(href);
  if (!adapter) throw new AdapterError('This site is not supported.', 'unsupported');
  return adapter;
}

/** Synchronous: only what is currently rendered. */
export function extractConversation(doc: Document, href: string, now = new Date()): Conversation {
  const adapter = adapterFor(href);
  const raw = adapter.extract(doc);
  return build(adapter, doc, href, raw, now, raw.length ? selfCheck(adapter, doc, raw, 0) : []);
}

/** Wait (bounded) for a streaming reply to finish. Returns true if it is still streaming. */
export async function waitForStreamEnd(doc: Document, adapter: SiteAdapter, opts: ExtractOptions = {}): Promise<boolean> {
  const { streamWaitMs = 15_000 } = opts;
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const step = 500;
  for (let waited = 0; adapter.isStreaming?.(doc); waited += step) {
    if (waited >= streamWaitMs) return true;
    await sleep(step);
  }
  return false;
}

/** Full export: waits for streaming, scrolls to load virtualized/lazy turns, runs the self-check. */
export async function extractFullConversation(doc: Document, href: string, opts: ExtractOptions = {}, now = new Date()): Promise<Conversation> {
  const adapter = adapterFor(href);
  const warnings: string[] = [];
  if (await waitForStreamEnd(doc, adapter, opts)) {
    warnings.push(`${adapter.name} was still writing a reply. The last message may be cut off; export again when it finishes.`);
  }
  const renderedBefore = adapter.extract(doc).length;
  const raw = await collectAll(doc, adapter, opts);
  if (raw.length) warnings.push(...selfCheck(adapter, doc, raw, renderedBefore));
  return build(adapter, doc, href, raw, now, warnings);
}
