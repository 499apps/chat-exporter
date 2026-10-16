import type { Conversation } from '../types';
import { DEFAULT_EXPORT, speaker, type ExportOptions } from './options';

export function toMarkdown(c: Conversation, opts: ExportOptions = DEFAULT_EXPORT): string {
  const meta = opts.includeMetadata
    ? [
        `- Source: ${c.source.siteName} (${c.source.url})`,
        ...(c.source.model ? [`- Model: ${c.source.model}`] : []),
        `- Exported: ${c.exportedAt}`,
        `- Messages: ${c.messages.length}`,
      ].join('\n') + '\n\n---\n\n'
    : '';
  const body = c.messages
    .map((m) => {
      const ts = opts.includeTimestamps && m.timestamp ? ` _(${m.timestamp})_` : '';
      const thinking =
        opts.includeThinking && m.thinking
          ? `<details>\n<summary>Thinking</summary>\n\n${m.thinking}\n\n</details>\n\n`
          : '';
      return `## ${speaker(c, m)}${ts}\n\n${thinking}${m.content}`.trimEnd();
    })
    .join('\n\n---\n\n');
  return `# ${c.source.title}\n\n${meta}${body}\n`;
}
