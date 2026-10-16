import { findAdapter } from './adapters';
import { collectAll, type CollectOptions } from './collect';
import { AdapterError, type Conversation, type RawTurn, type SiteAdapter } from './types';

function build(adapter: SiteAdapter, doc: Document, href: string, raw: RawTurn[], now: Date): Conversation {
  if (!raw.length) {
    throw new AdapterError(`No messages found. Open a ${adapter.name} conversation, or the page layout may have changed.`);
  }
  return {
    schema: 'convo-keeper/conversation',
    schemaVersion: 1,
    source: { site: adapter.id, siteName: adapter.name, url: href, title: adapter.title?.(doc) || `${adapter.name} conversation` },
    exportedAt: now.toISOString(),
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    messages: raw.map(({ key, ...m }, index) => ({ index, ...m })),
  };
}

function adapterFor(href: string): SiteAdapter {
  const adapter = findAdapter(href);
  if (!adapter) throw new AdapterError('This site is not supported.');
  return adapter;
}

/** Synchronous: only what is currently rendered. */
export function extractConversation(doc: Document, href: string, now = new Date()): Conversation {
  const adapter = adapterFor(href);
  return build(adapter, doc, href, adapter.extract(doc), now);
}

/** Full export: scrolls the conversation to load virtualized/lazy turns. */
export async function extractFullConversation(doc: Document, href: string, opts?: CollectOptions, now = new Date()): Promise<Conversation> {
  const adapter = adapterFor(href);
  return build(adapter, doc, href, await collectAll(doc, adapter, opts), now);
}
