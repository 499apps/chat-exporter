import type { Conversation } from '../types';

const LABEL = { user: 'You', assistant: 'Assistant', system: 'System' } as const;

export function toMarkdown(c: Conversation): string {
  const head = [
    `# ${c.source.title}`,
    '',
    `- Source: ${c.source.siteName} (${c.source.url})`,
    `- Exported: ${c.exportedAt}`,
    `- Messages: ${c.messages.length}`,
  ].join('\n');
  const body = c.messages
    .map((m) => {
      const who = m.role === 'assistant' ? c.source.siteName : LABEL[m.role];
      const ts = m.timestamp ? ` _(${m.timestamp})_` : '';
      return `## ${who}${ts}\n\n${m.content}`;
    })
    .join('\n\n---\n\n');
  return `${head}\n\n---\n\n${body}\n`;
}
