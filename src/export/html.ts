import type { Conversation } from '../types';

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);
}

function inlineMd(s: string): string {
  return escapeHtml(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
}

/** Minimal Markdown -> HTML for printing. Text is always escaped first. */
export function markdownToHtml(md: string): string {
  const parts: string[] = [];
  const re = /^(`{3,})([^\n]*)\n([\s\S]*?)\n\1\s*$/gm;
  let last = 0;
  let m: RegExpExecArray | null;
  const text = (chunk: string) => {
    for (const para of chunk.split(/\n{2,}/)) {
      const p = para.trim();
      if (!p) continue;
      const h = /^(#{1,6}) (.*)$/.exec(p);
      if (h) parts.push(`<h${h[1].length + 2}>${inlineMd(h[2])}</h${h[1].length + 2}>`);
      else parts.push(`<p>${p.split('\n').map(inlineMd).join('<br>')}</p>`);
    }
  };
  while ((m = re.exec(md))) {
    text(md.slice(last, m.index));
    const lang = m[2].trim();
    parts.push(`<pre${lang ? ` data-lang="${escapeHtml(lang)}"` : ''}><code>${escapeHtml(m[3])}</code></pre>`);
    last = m.index + m[0].length;
  }
  text(md.slice(last));
  return parts.join('\n');
}

export function toPrintHtml(c: Conversation): string {
  const msgs = c.messages
    .map((m) => {
      const who = m.role === 'assistant' ? c.source.siteName : m.role === 'user' ? 'You' : 'System';
      const ts = m.timestamp ? `<span class="ts">${escapeHtml(m.timestamp)}</span>` : '';
      return `<section class="msg ${m.role}"><h2>${escapeHtml(who)} ${ts}</h2>${markdownToHtml(m.content)}</section>`;
    })
    .join('\n');
  return `<header><h1>${escapeHtml(c.source.title)}</h1><p class="meta">${escapeHtml(c.source.siteName)} · ${escapeHtml(c.source.url)} · exported ${escapeHtml(c.exportedAt)}</p></header>\n${msgs}`;
}
