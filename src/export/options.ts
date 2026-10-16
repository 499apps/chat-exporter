import type { Conversation, Message } from '../types';
import { DEFAULT_SETTINGS, type Settings } from '../settings';

export type ExportOptions = Pick<Settings, 'includeTimestamps' | 'includeMetadata' | 'includeThinking' | 'theme'>;
export const DEFAULT_EXPORT: ExportOptions = DEFAULT_SETTINGS;

export const speaker = (c: Conversation, m: Message): string =>
  m.role === 'assistant' ? c.source.siteName : m.role === 'user' ? 'You' : 'System';

/** Apply options and an optional message selection to a conversation copy. */
export function prepareForExport(c: Conversation, opts: ExportOptions, selected?: number[]): Conversation {
  const pick = selected ? new Set(selected) : null;
  return {
    ...c,
    messages: c.messages
      .filter((m) => !pick || pick.has(m.index))
      .map((m) => ({
        ...m,
        timestamp: opts.includeTimestamps ? m.timestamp : null,
        thinking: opts.includeThinking ? m.thinking : null,
      })),
  };
}
