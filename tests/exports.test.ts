import { describe, expect, it } from 'vitest';
import { toMarkdown } from '../src/export/markdown';
import { toText, stripMarkdown } from '../src/export/text';
import { toHtmlDocument, markdownToHtml, themeCss } from '../src/export/html';
import { toJson } from '../src/export/json';
import { prepareForExport, DEFAULT_EXPORT } from '../src/export/options';
import { DEFAULT_SETTINGS, normalizeSettings, renderFilename } from '../src/settings';
import type { Conversation } from '../src/types';

const convo: Conversation = {
  schema: 'convo-keeper/conversation',
  schemaVersion: 2,
  source: { site: 'claude', siteName: 'Claude', url: 'https://claude.ai/chat/x', title: 'Demo <chat>', model: 'Test Model' },
  exportedAt: '2026-01-02T03:04:05.000Z',
  messages: [
    { index: 0, role: 'user', content: 'Hello **there**', timestamp: '2026-01-02T03:00:00.000Z', codeBlocks: [], thinking: null, attachments: [] },
    {
      index: 1,
      role: 'assistant',
      content: '## Plan\n\n- one\n   - nested\n- two\n\n```js\nconst a = "<b>";\n```\n\n| a | b |\n| --- | --- |\n| 1 | 2 |\n\n$$\nx^2\n$$\n\n> quoted\n\n[Image: chart]',
      timestamp: null,
      codeBlocks: [{ language: 'js', code: 'const a = "<b>";' }],
      thinking: 'secret reasoning',
      attachments: [{ kind: 'image', name: null, alt: 'chart' }],
    },
    { index: 2, role: 'user', content: 'Thanks', timestamp: null, codeBlocks: [], thinking: null, attachments: [] },
  ],
  warnings: [],
};

describe('markdown export', () => {
  it('includes metadata, model, thinking and timestamps by default', () => {
    const md = toMarkdown(convo);
    expect(md).toContain('# Demo <chat>');
    expect(md).toContain('- Model: Test Model');
    expect(md).toContain('<summary>Thinking</summary>');
    expect(md).toContain('## You _(2026-01-02T03:00:00.000Z)_');
  });
  it('respects options', () => {
    const md = toMarkdown(convo, { ...DEFAULT_EXPORT, includeMetadata: false, includeThinking: false, includeTimestamps: false });
    expect(md).not.toContain('Model:');
    expect(md).not.toContain('secret reasoning');
    expect(md).not.toContain('_(2026');
  });
});

describe('selection and options', () => {
  it('exports only selected messages and drops thinking when off', () => {
    const c = prepareForExport(convo, { ...DEFAULT_EXPORT, includeThinking: false }, [1]);
    expect(c.messages.map((m) => m.index)).toEqual([1]);
    expect(c.messages[0].thinking).toBeNull();
    expect(JSON.parse(toJson(c)).messages).toHaveLength(1);
  });
});

describe('text export', () => {
  it('strips markdown but keeps code verbatim', () => {
    const txt = toText(convo);
    expect(txt).toContain('You (2026-01-02T03:00:00.000Z):\nHello there');
    expect(txt).toContain('const a = "<b>";');
    expect(txt).not.toContain('```');
    expect(stripMarkdown('**b** *i* `c` [l](https://x.y)')).toBe('b i c l (https://x.y)');
  });
});

describe('html export', () => {
  const html = toHtmlDocument(convo);
  it('is self-contained: no scripts, no external resources, strict CSP', () => {
    expect(html).not.toMatch(/<script/i);
    expect(html).not.toMatch(/<link|src="http|url\(http/i);
    expect(html).toContain("default-src 'none'");
  });
  it('escapes page text', () => {
    expect(html).toContain('Demo &lt;chat&gt;');
    expect(html).toContain('const a = &quot;&lt;b&gt;&quot;;');
  });
  it('renders lists, nesting, tables, math, quotes, chips', () => {
    const body = markdownToHtml(convo.messages[1].content);
    expect(body).toContain('<ul><li>one<ul><li>nested</li></ul></li><li>two</li></ul>');
    expect(body).toContain('<pre data-lang="js">');
    expect(body).toContain('<table><thead><tr><th>a</th><th>b</th></tr></thead><tbody><tr><td>1</td><td>2</td></tr></tbody></table>');
    expect(body).toContain('<div class="math display">x^2</div>');
    expect(body).toContain('<blockquote><p>quoted</p></blockquote>');
    expect(body).toContain('<span class="chip">Image: chart</span>');
  });
  it('only links http(s) URLs', () => {
    expect(markdownToHtml('[x](javascript:alert(1))')).not.toContain('<a');
    expect(markdownToHtml('[x](https://ok.example)')).toContain('<a href="https://ok.example"');
  });
  it('print CSS has page numbers and the title header', () => {
    const css = themeCss('indigo', true, 'My "chat"');
    expect(css).toContain('counter(page)');
    expect(css).toContain('My  chat ');
    expect(themeCss('dark')).toContain('#0f0d1a');
  });
});

describe('settings and filenames', () => {
  it('normalizes bad values to defaults', () => {
    expect(normalizeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings({ theme: 'neon', includeThinking: 'yes', filenameTemplate: '  ' })).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings({ theme: 'dark', includeThinking: false }).theme).toBe('dark');
  });
  it('renders templates safely', () => {
    const now = new Date(2026, 0, 2, 9, 5);
    expect(renderFilename('{date}_{time}_{model}_{title}', { site: 'chatgpt', title: 'Ünïcode: a/b?', model: 'GPT 5' }, 'pdf', now)).toBe(
      '2026-01-02_0905_gpt-5_unicode-a-b.pdf',
    );
    expect(renderFilename('../{title}', { site: 'x', title: '' }, 'md', now)).toBe('conversation.md');
    expect(renderFilename('a:b*c', { site: 'x', title: 't' }, 'txt', now)).toBe('a-b-c.txt');
  });
});
