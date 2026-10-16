import type { CodeBlock } from './types';

/** Small, dependency-free HTML -> Markdown converter tuned for chat transcripts. */

const SKIP = new Set(['SCRIPT', 'STYLE', 'BUTTON', 'SVG', 'NOSCRIPT', 'TEMPLATE', 'INPUT', 'TEXTAREA']);

/** TeX source of a rendered math element (KaTeX, MathJax, data-math), or null. */
export function mathTex(el: Element): { tex: string; display: boolean } | null {
  const isKatex = el.classList.contains('katex') || el.classList.contains('katex-display');
  const isMjx = el.tagName.toUpperCase() === 'MJX-CONTAINER';
  const data = el.getAttribute('data-math');
  if (data) return { tex: data.trim(), display: /block|display/.test(el.className) };
  if (!isKatex && !isMjx && el.tagName.toUpperCase() !== 'MATH') return null;
  const ann = el.querySelector('annotation[encoding="application/x-tex"]');
  const tex = (ann?.textContent ?? el.getAttribute('alttext') ?? '').trim();
  if (!tex) return null;
  const display =
    el.classList.contains('katex-display') ||
    el.querySelector('.katex-display') !== null ||
    el.getAttribute('display') === 'true' ||
    el.getAttribute('display') === 'block' ||
    el.querySelector('math[display="block"]') !== null;
  return { tex, display };
}

export function codeLanguage(pre: Element): string | null {
  const code = pre.querySelector('code') ?? pre;
  for (const el of [code, pre]) {
    for (const cls of Array.from(el.classList)) {
      const m = /^(?:language|lang)-([\w+#.-]+)$/.exec(cls);
      if (m) return m[1].toLowerCase();
    }
    const attr = el.getAttribute('data-language');
    if (attr) return attr.toLowerCase();
  }
  // Header label rendered next to the code (e.g. "python" above the block).
  const header = pre.querySelector(':scope > div:first-child') ?? pre.previousElementSibling;
  const label = header && !header.matches('p,pre,code,h1,h2,h3,h4,h5,h6,ul,ol,li,blockquote,table') ? (header.firstChild?.textContent ?? header.textContent ?? '').trim() : '';
  if (/^[A-Za-z][\w+#.-]{0,19}$/.test(label) && !/^copy/i.test(label)) return label.toLowerCase();
  return null;
}

export function codeText(pre: Element): string {
  const code = pre.querySelector('code') ?? pre;
  return (code.textContent ?? '').replace(/\n$/, '');
}

export function collectCodeBlocks(root: Element): CodeBlock[] {
  return Array.from(root.querySelectorAll('pre')).map((pre) => ({
    language: codeLanguage(pre),
    code: codeText(pre),
  }));
}

function inline(node: Node): string {
  if (node.nodeType === 3) return (node.textContent ?? '').replace(/\s+/g, ' ');
  if (node.nodeType !== 1) return '';
  const el = node as Element;
  if (SKIP.has(el.tagName.toUpperCase()) || el.getAttribute('aria-hidden') === 'true') return '';
  const math = mathTex(el);
  if (math) return math.display ? `\n\n$$\n${math.tex}\n$$\n\n` : `$${math.tex}$`;
  if (el.classList.contains('whitespace-pre-wrap') && !el.querySelector('p,pre,ul,ol,div')) {
    return (el.textContent ?? '').trim().replace(/\r?\n/g, '  \n');
  }
  const kids = () => Array.from(el.childNodes).map(inline).join('');
  switch (el.tagName.toUpperCase()) {
    case 'BR':
      return '  \n';
    case 'STRONG':
    case 'B': {
      const t = kids().trim();
      return t ? `**${t}**` : '';
    }
    case 'EM':
    case 'I': {
      const t = kids().trim();
      return t ? `*${t}*` : '';
    }
    case 'DEL':
    case 'S':
      return `~~${kids().trim()}~~`;
    case 'CODE': {
      const t = el.textContent ?? '';
      const fence = t.includes('`') ? '``' : '`';
      return `${fence}${t}${fence}`;
    }
    case 'A': {
      const href = el.getAttribute('href');
      const t = kids().trim();
      return href && /^https?:/i.test(href) ? `[${t || href}](${href})` : t;
    }
    case 'IMG': {
      const alt = (el.getAttribute('alt') ?? '').trim();
      return alt ? `[Image: ${alt}]` : '[Image]';
    }
    default:
      return kids();
  }
}

function block(el: Element, depth = 0): string {
  const out: string[] = [];
  let buf = '';
  const flush = () => {
    const t = buf.replace(/[ \t]+\n/g, '\n').trim();
    if (t) out.push(t);
    buf = '';
  };
  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType !== 1) {
      buf += inline(node);
      continue;
    }
    const c = node as Element;
    const tag = c.tagName.toUpperCase();
    if (SKIP.has(tag) || c.getAttribute('aria-hidden') === 'true') continue;
    if (mathTex(c)) {
      buf += inline(c);
      continue;
    }
    if (/^H[1-6]$/.test(tag)) {
      flush();
      out.push(`${'#'.repeat(Number(tag[1]))} ${inline(c).trim()}`);
    } else if (tag === 'P') {
      flush();
      const t = inline(c).replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
      if (t) out.push(t);
    } else if (tag === 'PRE') {
      flush();
      const code = codeText(c);
      const fence = code.includes('```') ? '````' : '```';
      out.push(`${fence}${codeLanguage(c) ?? ''}\n${code}\n${fence}`);
    } else if (tag === 'UL' || tag === 'OL') {
      flush();
      out.push(list(c, depth));
    } else if (tag === 'BLOCKQUOTE') {
      flush();
      out.push(block(c, depth).split('\n').map((l) => `> ${l}`.trimEnd()).join('\n'));
    } else if (tag === 'HR') {
      flush();
      out.push('---');
    } else if (tag === 'TABLE') {
      flush();
      out.push(table(c));
    } else if (tag === 'DETAILS' || tag === 'FIGURE') {
      flush();
      const t = block(c, depth);
      if (t) out.push(t);
    } else if (['DIV', 'SECTION', 'ARTICLE', 'SPAN', 'MAIN'].includes(tag) && c.querySelector('p,pre,ul,ol,h1,h2,h3,h4,h5,h6,table,blockquote,div')) {
      flush();
      const t = block(c, depth);
      if (t) out.push(t);
    } else if (tag === 'DIV') {
      flush();
      const t = inline(c).trim();
      if (t) out.push(t);
    } else {
      buf += inline(c);
    }
  }
  flush();
  return out.join('\n\n');
}

function list(el: Element, depth: number): string {
  const ordered = el.tagName.toUpperCase() === 'OL';
  const start = Number(el.getAttribute('start') ?? '1') || 1;
  const pad = '   '.repeat(depth);
  return Array.from(el.children)
    .filter((li) => li.tagName.toUpperCase() === 'LI')
    .map((li, i) => {
      const marker = ordered ? `${start + i}.` : '-';
      const body = block(li, depth + 1).replace(/\n\n+/g, '\n');
      const [first, ...rest] = body.split('\n');
      return [`${pad}${marker} ${first ?? ''}`, ...rest.map((l) => (l.startsWith(pad + '   ') ? l : `${pad}   ${l}`))].join('\n');
    })
    .join('\n');
}

function table(el: Element): string {
  const rows = Array.from(el.querySelectorAll('tr')).map((tr) =>
    Array.from(tr.querySelectorAll('th,td')).map((td) => inline(td).trim().replace(/\|/g, '\\|')),
  );
  if (!rows.length) return '';
  const width = Math.max(...rows.map((r) => r.length));
  const line = (r: string[]) => `| ${Array.from({ length: width }, (_, i) => r[i] ?? '').join(' | ')} |`;
  return [line(rows[0]), `|${' --- |'.repeat(width)}`, ...rows.slice(1).map(line)].join('\n');
}

export function htmlToMarkdown(root: Element): string {
  return block(root).replace(/[ \t]+\n/g, (m) => (m.startsWith('  ') ? '  \n' : '\n')).replace(/\n{3,}/g, '\n\n').trim();
}

/** Plain text preserving newlines, for user prompts rendered as pre-wrapped text. */
export function plainText(root: Element): string {
  return (root.textContent ?? '').replace(/\r\n/g, '\n').trim();
}
