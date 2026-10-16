import type { Conversation } from '../types';
import type { Theme } from '../settings';
import { DEFAULT_EXPORT, speaker, type ExportOptions } from './options';

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);
}

/** Inline Markdown (already-escaped text in, HTML out). Links limited to http(s). */
function inlineMd(raw: string): string {
  const codes: string[] = [];
  let s = escapeHtml(raw).replace(/`([^`]+)`/g, (_m, c: string) => `\u0000${codes.push(c) - 1}\u0000`);
  s = s
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, (_m, t: string, u: string) => `<a href="${u}" rel="noreferrer noopener">${t}</a>`)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>')
    .replace(/~~([^~]+)~~/g, '<del>$1</del>')
    .replace(/(^|[^$])\$([^$\n]+)\$/g, '$1<span class="math">$2</span>')
    .replace(/\[(Image|Attachment|Artifact)(: [^\]]*)?\]/g, '<span class="chip">$1$2</span>');
  // eslint-disable-next-line no-control-regex
  return s.replace(/\u0000(\d+)\u0000/g, (_m, i: string) => `<code>${codes[Number(i)]}</code>`);
}

function list(lines: string[]): string {
  // Nested lists by 3-space indentation.
  type Node = { ordered: boolean; items: string[] };
  const out: string[] = [];
  const stack: { indent: number; node: Node }[] = [];
  const close = (to: number) => {
    while (stack.length > to) {
      const { node } = stack.pop()!;
      const tag = node.ordered ? 'ol' : 'ul';
      const html = `<${tag}>${node.items.map((i) => `<li>${i}</li>`).join('')}</${tag}>`;
      if (stack.length) {
        const parent = stack[stack.length - 1].node;
        parent.items[parent.items.length - 1] += html;
      } else out.push(html);
    }
  };
  for (const line of lines) {
    const m = /^(\s*)([-*]|\d+\.)\s+(.*)$/.exec(line);
    if (!m) {
      if (stack.length) {
        const top = stack[stack.length - 1].node;
        top.items[top.items.length - 1] += '<br>' + inlineMd(line.trim());
      }
      continue;
    }
    const indent = m[1].length;
    const ordered = /\d/.test(m[2]);
    while (stack.length && indent < stack[stack.length - 1].indent) close(stack.length - 1);
    if (!stack.length || indent > stack[stack.length - 1].indent) stack.push({ indent, node: { ordered, items: [] } });
    stack[stack.length - 1].node.items.push(inlineMd(m[3]));
  }
  close(0);
  return out.join('');
}

function table(lines: string[]): string {
  const cells = (l: string) => l.trim().replace(/^\||\|$/g, '').split(/(?<!\\)\|/).map((c) => inlineMd(c.trim().replace(/\\\|/g, '|')));
  const [head, , ...rows] = lines;
  return `<table><thead><tr>${cells(head).map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>${rows
    .map((r) => `<tr>${cells(r).map((c) => `<td>${c}</td>`).join('')}</tr>`)
    .join('')}</tbody></table>`;
}

/** Markdown (as produced by Convo Keeper) -> safe HTML. All text is escaped. */
export function markdownToHtml(md: string): string {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  let i = 0;
  const para: string[] = [];
  const flush = () => {
    if (para.length) out.push(`<p>${para.map(inlineMd).join('<br>')}</p>`);
    para.length = 0;
  };
  while (i < lines.length) {
    const line = lines[i];
    const fence = /^(`{3,})(.*)$/.exec(line);
    if (fence) {
      flush();
      const lang = fence[2].trim();
      const body: string[] = [];
      i++;
      while (i < lines.length && lines[i] !== fence[1]) body.push(lines[i++]);
      i++;
      out.push(`<pre${lang ? ` data-lang="${escapeHtml(lang)}"` : ''}><code>${escapeHtml(body.join('\n'))}</code></pre>`);
      continue;
    }
    if (line.trim() === '$$') {
      flush();
      const body: string[] = [];
      i++;
      while (i < lines.length && lines[i].trim() !== '$$') body.push(lines[i++]);
      i++;
      out.push(`<div class="math display">${escapeHtml(body.join('\n'))}</div>`);
      continue;
    }
    if (!line.trim()) {
      flush();
      i++;
      continue;
    }
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      flush();
      const lvl = Math.min(6, h[1].length + 2);
      out.push(`<h${lvl}>${inlineMd(h[2])}</h${lvl}>`);
      i++;
      continue;
    }
    if (/^---+$/.test(line.trim())) {
      flush();
      out.push('<hr>');
      i++;
      continue;
    }
    if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
      flush();
      const block: string[] = [];
      while (i < lines.length && lines[i].trim() && (/^\s*([-*]|\d+\.)\s+/.test(lines[i]) || /^\s{2,}/.test(lines[i]))) block.push(lines[i++]);
      out.push(list(block));
      continue;
    }
    if (/^\|.*\|\s*$/.test(line) && /^\|(\s*-{3,}\s*\|)+\s*$/.test(lines[i + 1] ?? '')) {
      flush();
      const block: string[] = [];
      while (i < lines.length && /^\|.*\|\s*$/.test(lines[i])) block.push(lines[i++]);
      out.push(table(block));
      continue;
    }
    if (/^>/.test(line)) {
      flush();
      const block: string[] = [];
      while (i < lines.length && /^>/.test(lines[i])) block.push(lines[i++].replace(/^>\s?/, ''));
      out.push(`<blockquote>${markdownToHtml(block.join('\n'))}</blockquote>`);
      continue;
    }
    para.push(line.replace(/ {2}$/, ''));
    i++;
  }
  flush();
  return out.join('\n');
}

const PALETTES: Record<Theme, Record<string, string>> = {
  indigo: { bg: '#ffffff', fg: '#1e1b4b', muted: '#6b7280', accent: '#6366f1', accent2: '#7c3aed', user: '#eef2ff', card: '#ffffff', code: '#f5f3ff', border: '#e0e7ff', font: "'Segoe UI', system-ui, -apple-system, sans-serif" },
  classic: { bg: '#ffffff', fg: '#111111', muted: '#555555', accent: '#1f2937', accent2: '#374151', user: '#f5f5f4', card: '#ffffff', code: '#f4f4f4', border: '#dddddd', font: "Georgia, 'Times New Roman', serif" },
  minimal: { bg: '#ffffff', fg: '#222222', muted: '#777777', accent: '#222222', accent2: '#222222', user: '#ffffff', card: '#ffffff', code: '#f7f7f7', border: '#eeeeee', font: "system-ui, -apple-system, sans-serif" },
  dark: { bg: '#0f0d1a', fg: '#e5e7eb', muted: '#9ca3af', accent: '#a5b4fc', accent2: '#c4b5fd', user: '#1e1b4b', card: '#17142a', code: '#1f1b33', border: '#2e2a4a', font: "'Segoe UI', system-ui, -apple-system, sans-serif" },
};

export function themeCss(theme: Theme, forPrint = false, title = ''): string {
  const p = PALETTES[theme] ?? PALETTES.indigo;
  const vars = Object.entries(p).map(([k, v]) => `--${k}:${v}`).join(';');
  return `:root{${vars}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.6 var(--font);-webkit-print-color-adjust:exact;print-color-adjust:exact}
.wrap{max-width:820px;margin:0 auto;padding:40px 24px 64px}
.doc-head{border-bottom:3px solid var(--accent);padding-bottom:16px;margin-bottom:24px}
.doc-head h1{margin:0 0 8px;font-size:26px;line-height:1.25;background:linear-gradient(90deg,var(--accent),var(--accent2));-webkit-background-clip:text;background-clip:text;color:transparent}
.meta{display:flex;flex-wrap:wrap;gap:6px 16px;color:var(--muted);font-size:12.5px}
.meta a{color:inherit}
.msg{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:14px 18px;margin:14px 0;break-inside:auto}
.msg.user{background:var(--user)}
.who{display:flex;align-items:baseline;gap:10px;margin:0 0 6px;font:600 13px/1.4 system-ui,sans-serif;color:var(--accent);text-transform:uppercase;letter-spacing:.04em}
.who time{font-weight:400;color:var(--muted);text-transform:none;letter-spacing:0}
.msg p{margin:.5em 0}
.msg h3,.msg h4,.msg h5,.msg h6{margin:1em 0 .4em;line-height:1.3}
pre{position:relative;background:var(--code);border:1px solid var(--border);border-radius:8px;padding:12px 14px;overflow:auto;white-space:pre-wrap;word-break:break-word;font:12.5px/1.5 'Cascadia Code',Consolas,'SF Mono',monospace;break-inside:avoid}
pre[data-lang]::before{content:attr(data-lang);position:absolute;top:4px;right:10px;font:600 10px system-ui,sans-serif;color:var(--muted);text-transform:uppercase}
code{font-family:'Cascadia Code',Consolas,'SF Mono',monospace;font-size:.9em;background:var(--code);padding:.1em .3em;border-radius:4px}
pre code{background:none;padding:0}
table{border-collapse:collapse;margin:.8em 0;font-size:14px}
th,td{border:1px solid var(--border);padding:6px 10px;text-align:left}
th{background:var(--code)}
blockquote{margin:.6em 0;padding:.2em 1em;border-left:3px solid var(--accent);color:var(--muted)}
.math{font-family:'Cambria Math','STIX Two Math',serif}
.math.display{display:block;text-align:center;margin:.8em 0;white-space:pre-wrap}
.chip{display:inline-block;font:12px system-ui,sans-serif;border:1px dashed var(--accent);color:var(--accent);border-radius:6px;padding:1px 6px}
details.thinking{border-left:3px solid var(--accent2);background:var(--code);border-radius:6px;padding:6px 12px;margin:6px 0 10px;font-size:13.5px;color:var(--muted)}
details.thinking summary{cursor:pointer;font-weight:600}
a{color:var(--accent)}
.foot{margin-top:32px;color:var(--muted);font-size:12px;text-align:center}
${
  forPrint
    ? `@page{size:auto;margin:16mm 14mm 18mm;@bottom-center{content:counter(page) " / " counter(pages);font:10px system-ui,sans-serif;color:#888}@top-right{content:"${title.replace(/["\\\n]/g, ' ').slice(0, 80)}";font:9px system-ui,sans-serif;color:#999}}
@media print{.wrap{max-width:none;padding:0}.no-print{display:none!important}details.thinking{display:block}details.thinking>*{display:block}.msg{border-radius:8px}}`
    : ''
}`;
}

export function conversationHtml(c: Conversation, opts: ExportOptions = DEFAULT_EXPORT): string {
  const meta = opts.includeMetadata
    ? `<div class="meta"><span>${escapeHtml(c.source.siteName)}</span>${c.source.model ? `<span>Model: ${escapeHtml(c.source.model)}</span>` : ''}<span>${escapeHtml(new Date(c.exportedAt).toLocaleString())}</span><span>${c.messages.length} messages</span><a href="${escapeHtml(c.source.url)}">${escapeHtml(c.source.url)}</a></div>`
    : '';
  const msgs = c.messages
    .map((m) => {
      const ts = opts.includeTimestamps && m.timestamp ? `<time datetime="${escapeHtml(m.timestamp)}">${escapeHtml(new Date(m.timestamp).toLocaleString())}</time>` : '';
      const thinking = opts.includeThinking && m.thinking ? `<details class="thinking" open><summary>Thinking</summary>${markdownToHtml(m.thinking)}</details>` : '';
      return `<article class="msg ${m.role}"><h2 class="who">${escapeHtml(speaker(c, m))}${ts}</h2>${thinking}${markdownToHtml(m.content)}</article>`;
    })
    .join('\n');
  return `<header class="doc-head"><h1>${escapeHtml(c.source.title)}</h1>${meta}</header>\n${msgs}\n<p class="foot">Exported with Convo Keeper</p>`;
}

/** A complete, self-contained HTML file (inline CSS, no scripts, no external resources). */
export function toHtmlDocument(c: Conversation, opts: ExportOptions = DEFAULT_EXPORT): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:">
<title>${escapeHtml(c.source.title)}</title>
<style>${themeCss(opts.theme)}</style></head>
<body><main class="wrap">${conversationHtml(c, opts)}</main></body></html>
`;
}
