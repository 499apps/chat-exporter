/**
 * Convo Keeper export schema, version 1. Documented in docs/SCHEMA.md.
 */
export type Role = 'user' | 'assistant' | 'system';

export interface CodeBlock {
  /** Language hint from the page (e.g. "python"), or null if unknown. */
  language: string | null;
  /** Exact code text, whitespace preserved. */
  code: string;
}

export interface Message {
  index: number;
  role: Role;
  /** Message body converted to Markdown. Code blocks appear as fenced blocks. */
  content: string;
  /** ISO 8601 timestamp if the page exposes one, else null. */
  timestamp: string | null;
  codeBlocks: CodeBlock[];
}

export interface Conversation {
  schema: 'convo-keeper/conversation';
  schemaVersion: 1;
  source: { site: string; siteName: string; url: string; title: string };
  exportedAt: string;
  messages: Message[];
}

/** A turn as read from the page. `key` is a stable id used to de-duplicate while scrolling. */
export type RawTurn = Omit<Message, 'index'> & { key?: string };

export interface SiteAdapter {
  id: string;
  name: string;
  /** True when this adapter handles the given page URL. */
  matches(url: URL): boolean;
  /** Pull messages out of the rendered page. Must not mutate the document. */
  extract(doc: Document): RawTurn[];
  /** Optional: page title for the conversation. */
  title?(doc: Document): string | null;
}

export class AdapterError extends Error {}
