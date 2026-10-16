import { findAdapter } from './adapters';
import { AdapterError, type Conversation } from './types';

export function extractConversation(doc: Document, href: string, now = new Date()): Conversation {
  const adapter = findAdapter(href);
  if (!adapter) throw new AdapterError('This site is not supported.');
  const raw = adapter.extract(doc);
  if (!raw.length) {
    throw new AdapterError(`No messages found. Open a ${adapter.name} conversation, or the page layout may have changed.`);
  }
  return {
    schema: 'convo-keeper/conversation',
    schemaVersion: 1,
    source: { site: adapter.id, siteName: adapter.name, url: href, title: adapter.title?.(doc) || `${adapter.name} conversation` },
    exportedAt: now.toISOString(),
    messages: raw.map((m, index) => ({ index, ...m })),
  };
}
