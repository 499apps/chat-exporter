import type { Conversation } from '../types';
import { DEFAULT_EXPORT, speaker, type ExportOptions } from './options';

/** Strip light Markdown syntax for a plain-text transcript; code is kept verbatim. */
export function stripMarkdown(md: string): string {
  const parts = md.split(/(^`{3,}[^\n]*\n[\s\S]*?\n`{3,}$)/m);
  return parts
    .map((p, i) => {
      if (i % 2 === 1) return p.replace(/^`{3,}[^\n]*\n/, '').replace(/\n`{3,}$/, '');
      return p
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1$2')
        .replace(/~~([^~]+)~~/g, '$1')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '$1 ($2)')
        .replace(/^>\s?/gm, '')
        .replace(/ {2}$/gm, '');
    })
    .join('');
}

export function toText(c: Conversation, opts: ExportOptions = DEFAULT_EXPORT): string {
  const head = [c.source.title, ...(opts.includeMetadata ? [`${c.source.siteName}${c.source.model ? ` · ${c.source.model}` : ''} · ${c.source.url}`, `Exported ${c.exportedAt}`] : [])].join('\n');
  const rule = '='.repeat(Math.min(60, Math.max(10, c.source.title.length)));
  const body = c.messages
    .map((m) => {
      const ts = opts.includeTimestamps && m.timestamp ? ` (${m.timestamp})` : '';
      const thinking = opts.includeThinking && m.thinking ? `[Thinking]\n${stripMarkdown(m.thinking)}\n[/Thinking]\n\n` : '';
      return `${speaker(c, m)}${ts}:\n${thinking}${stripMarkdown(m.content)}`.trimEnd();
    })
    .join('\n\n' + '-'.repeat(40) + '\n\n');
  return `${head}\n${rule}\n\n${body}\n`;
}
