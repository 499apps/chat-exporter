import { describe, expect, it } from 'vitest';
import { findAdapter } from '../src/adapters';
import { extractConversation } from '../src/extract';
import { toJson } from '../src/export/json';
import { toMarkdown } from '../src/export/markdown';
import { toHtmlDocument, markdownToHtml } from '../src/export/html';
import { renderFilename } from '../src/settings';
import { AdapterError } from '../src/types';
import { loadFixture } from './helpers';

const NOW = new Date('2026-03-04T05:06:07Z');

describe('site detection', () => {
  it.each([
    ['https://chatgpt.com/c/abc', 'chatgpt'],
    ['https://claude.ai/chat/abc', 'claude'],
    ['https://gemini.google.com/app/abc', 'gemini'],
    ['https://grok.com/chat/abc', 'grok'],
  ])('%s -> %s', (url, id) => expect(findAdapter(url)?.id).toBe(id));
  it.each(['https://example.com/', 'https://notchatgpt.com/', 'http://chatgpt.com/', 'chrome://extensions', '', null])(
    'rejects %s',
    (url) => expect(findAdapter(url)).toBeNull(),
  );
});

describe('conversation + exporters', () => {
  const c = extractConversation(loadFixture('chatgpt.html'), 'https://chatgpt.com/c/x', NOW);
  it('builds schema v1', () => {
    expect(c.schema).toBe('convo-keeper/conversation');
    expect(c.schemaVersion).toBe(2);
    expect(c.source).toEqual({ site: 'chatgpt', siteName: 'ChatGPT', url: 'https://chatgpt.com/c/x', title: 'Sorting help', model: null });
    expect(c.messages.map((m) => m.index)).toEqual([0, 1]);
  });
  it('json round-trips', () => expect(JSON.parse(toJson(c))).toEqual(c));
  it('markdown has headings per message', () => {
    const md = toMarkdown(c);
    expect(md).toMatch(/^# Sorting help/);
    expect(md).toContain('## You');
    expect(md).toContain('## ChatGPT');
  });
  it('print html escapes page text', () => {
    const evil = { ...c, source: { ...c.source, title: '<img src=x onerror=alert(1)>' } };
    expect(toHtmlDocument(evil)).not.toContain('<img');
    expect(markdownToHtml('```js\n<b>x</b>\n```')).toBe('<pre data-lang="js"><code>&lt;b&gt;x&lt;/b&gt;</code></pre>');
  });
  it('errors clearly when nothing is found or site unknown', () => {
    expect(() => extractConversation(loadFixture('claude.html'), 'https://chatgpt.com/', NOW)).toThrow(AdapterError);
    expect(() => extractConversation(loadFixture('claude.html'), 'https://example.com/', NOW)).toThrow(/not supported/);
  });
  it('safe filenames', () => {
    expect(renderFilename('{site}-{title}-{date}', { site: 'claude', title: 'Hello / World: test?' }, 'md', NOW)).toMatch(/^claude-hello-world-test-2026-03-0[34]\.md$/);
  });
});
