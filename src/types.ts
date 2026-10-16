/**
 * Convo Keeper export schema, version 2. Documented in docs/SCHEMA.md.
 */
export type Role = 'user' | 'assistant' | 'system';

export interface CodeBlock {
  /** Language hint from the page (e.g. "python"), or null if unknown. */
  language: string | null;
  /** Exact code text, whitespace preserved. */
  code: string;
}

export interface Attachment {
  kind: 'image' | 'file' | 'artifact';
  /** File name or artifact title, when shown. */
  name: string | null;
  /** Image alt text, when present. */
  alt: string | null;
}

export interface Message {
  index: number;
  role: Role;
  /** Message body converted to Markdown. Code blocks appear as fenced blocks, math as $…$ / $$…$$. */
  content: string;
  /** ISO 8601 timestamp if the page exposes one, else null. */
  timestamp: string | null;
  codeBlocks: CodeBlock[];
  /** Visible thinking / reasoning text (Markdown), or null. */
  thinking: string | null;
  /** Images, files and artifacts referenced in this message (placeholders appear in content). */
  attachments: Attachment[];
}

export interface Conversation {
  schema: 'convo-keeper/conversation';
  schemaVersion: 2;
  source: { site: string; siteName: string; url: string; title: string; model: string | null };
  exportedAt: string;
  messages: Message[];
  /** Self-check notes, e.g. a possibly incomplete export. Empty when all looks fine. */
  warnings: string[];
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
  /** Optional: model name shown on the page. */
  model?(doc: Document): string | null;
  /** Optional: true while a reply is still being generated. */
  isStreaming?(doc: Document): boolean;
  /** Optional: true when the URL is a specific conversation (not a home/new-chat page). */
  isConversationUrl?(url: URL): boolean;
  /**
   * Optional: a deliberately broad count of turn-like elements currently on the
   * page, independent of extract(). Used by the self-check.
   */
  visibleTurnCount?(doc: Document): number;
}

export type ErrorCode = 'unsupported' | 'empty' | 'outdated';

export class AdapterError extends Error {
  constructor(
    message: string,
    public code: ErrorCode = 'outdated',
  ) {
    super(message);
  }
}
