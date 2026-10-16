import { describe, expect, it } from 'vitest';
import { chatgpt } from '../src/adapters/chatgpt';
import { claude } from '../src/adapters/claude';
import { gemini } from '../src/adapters/gemini';
import { grok } from '../src/adapters/grok';
import { extractConversation, extractFullConversation, selfCheck, waitForStreamEnd } from '../src/extract';
import { AdapterError, type SiteAdapter } from '../src/types';

/* All HTML here is synthetic, modeled on each site's structure. No real data. */
const parse = (body: string, title = 'Test') =>
  new DOMParser().parseFromString(`<!doctype html><html><head><title>${title}</title></head><body>${body}</body></html>`, 'text/html');
const noSleep = { sleep: async () => {} };

const KATEX_INLINE = `<span class="katex"><span class="katex-mathml"><math><semantics><mrow></mrow><annotation encoding="application/x-tex">E=mc^2</annotation></semantics></math></span><span class="katex-html" aria-hidden="true">E=mc2</span></span>`;
const KATEX_BLOCK = `<span class="katex-display"><span class="katex"><span class="katex-mathml"><math display="block"><semantics><annotation encoding="application/x-tex">\\int_0^1 x\\,dx</annotation></semantics></math></span><span class="katex-html" aria-hidden="true">∫</span></span></span>`;

describe('content features (shared across adapters)', () => {
  const doc = parse(`
    <div data-message-author-role="user" data-message-id="u1">
      <div class="file-attachment" title="report.pdf"><img src="x" alt="" width="16">report.pdf</div>
      <img src="blob:x" alt="Screenshot of a chart">
      <div class="whitespace-pre-wrap">What does this show?</div>
    </div>
    <div data-message-author-role="assistant" data-message-id="a1">
      <div data-testid="reasoning-panel"><p>Looking at the axes first.</p></div>
      <div class="markdown">
        <p>Energy: ${KATEX_INLINE}.</p>
        <p>Area:</p>${KATEX_BLOCK}
        <table><thead><tr><th>x</th><th>y</th></tr></thead><tbody><tr><td>1</td><td>2</td></tr></tbody></table>
        <div class="code-block"><div class="lang">rust</div><pre><code>fn main() {}</code></pre></div>
        <div data-testid="canvas-card"><div class="title">Budget draft</div><button>Open</button></div>
        <div class="flex"><button>‹</button><div class="tabular-nums">2/3</div><button>›</button></div>
        <div hidden><p>Old branch text</p></div>
      </div>
    </div>`);
  const [u, a] = chatgpt.extract(doc);

  it('images and files become placeholders and attachments', () => {
    expect(u.content).toContain('[Attachment: report.pdf]');
    expect(u.content).toContain('[Image: Screenshot of a chart]');
    expect(u.content).toContain('What does this show?');
    expect(u.attachments).toEqual([
      { kind: 'file', name: 'report.pdf', alt: null },
      { kind: 'image', name: null, alt: 'Screenshot of a chart' },
    ]);
  });
  it('math is kept as TeX', () => {
    expect(a.content).toContain('Energy: $E=mc^2$.');
    expect(a.content).toContain('$$\n\\int_0^1 x\\,dx\n$$');
    expect(a.content).not.toContain('E=mc2');
  });
  it('tables and code language from a header label', () => {
    expect(a.content).toContain('| x | y |\n| --- | --- |\n| 1 | 2 |');
    expect(a.codeBlocks).toEqual([{ language: 'rust', code: 'fn main() {}' }]);
    expect(a.content).toContain('```rust\nfn main() {}\n```');
  });
  it('thinking is separated from the answer', () => {
    expect(a.thinking).toBe('Looking at the axes first.');
    expect(a.content).not.toContain('Looking at the axes');
  });
  it('canvas/artifact cards become placeholders', () => {
    expect(a.content).toContain('[Artifact: Budget draft]');
    expect(a.attachments).toContainEqual({ kind: 'artifact', name: 'Budget draft', alt: null });
  });
  it('only the visible branch is exported (no hidden text, no 2/3 counter)', () => {
    expect(a.content).not.toContain('Old branch');
    expect(a.content).not.toMatch(/2\s*\/\s*3/);
  });
  it('never mutates the live page', () => {
    expect(doc.querySelector('[data-testid="reasoning-panel"]')).not.toBeNull();
    expect(doc.querySelector('.tabular-nums')).not.toBeNull();
  });
});

describe('per-site thinking, artifacts and streaming', () => {
  it('claude: thinking block + artifact with code', () => {
    const doc = parse(`
      <div data-test-render-count="1"><div data-testid="user-message"><p>Build a widget</p></div></div>
      <div data-test-render-count="1"><div data-is-streaming="false">
        <div class="thinking-block"><p>Plan the props.</p></div>
        <div class="font-claude-response"><p>Here it is.</p>
          <div class="artifact-block"><div class="title">Widget.tsx</div><pre><code class="language-tsx">export const W = () =&gt; null;</code></pre></div>
        </div>
      </div></div>`);
    const [, a] = claude.extract(doc);
    expect(a.thinking).toBe('Plan the props.');
    expect(a.content).toContain('[Artifact: Widget.tsx]');
    expect(a.codeBlocks[0]).toEqual({ language: 'tsx', code: 'export const W = () => null;' });
    expect(claude.isStreaming!(doc)).toBe(false);
    expect(claude.isStreaming!(parse('<div data-is-streaming="true"></div>'))).toBe(true);
  });
  it('gemini: model-thoughts and data-math', () => {
    const doc = parse(`
      <user-query><div class="query-text"><p class="query-text-line">Solve it</p></div></user-query>
      <model-response><model-thoughts><p>Try substitution.</p></model-thoughts>
        <message-content><div class="markdown"><p>Answer: <span class="math-inline" data-math="x=2">x=2</span></p><div class="math-block" data-math="x^2=4">x²=4</div></div></message-content>
      </model-response>`);
    const [u, a] = gemini.extract(doc);
    expect(u.content).toBe('Solve it');
    expect(a.thinking).toBe('Try substitution.');
    expect(a.content).toContain('Answer: $x=2$');
    expect(a.content).toContain('$$\nx^2=4\n$$');
    expect(gemini.isStreaming!(parse('<button aria-label="Stop response"></button>'))).toBe(true);
  });
  it('grok: thinking container outside the bubble', () => {
    const doc = parse(`
      <div id="response-1" class="items-end"><div class="message-bubble"><p>Hi</p></div></div>
      <div id="response-2" class="items-start"><div class="thinking-container"><p>Greeting.</p></div><div class="message-bubble"><p>Hello!</p></div></div>`);
    const [, a] = grok.extract(doc);
    expect(a.thinking).toBe('Greeting.');
    expect(a.content).toBe('Hello!');
    expect(grok.isStreaming!(parse('<button aria-label="Stop model response"></button>'))).toBe(true);
  });
  it('chatgpt: model slug, streaming, tool turns skipped', () => {
    const doc = parse(`
      <div data-message-author-role="user"><div class="whitespace-pre-wrap">Q</div></div>
      <div data-message-author-role="tool"><div class="markdown"><p>internal</p></div></div>
      <div data-message-author-role="assistant" data-message-model-slug="gpt-5"><div class="markdown result-streaming"><p>A</p></div></div>`);
    expect(chatgpt.extract(doc).map((m) => m.content)).toEqual(['Q', 'A']);
    expect(chatgpt.model!(doc)).toBe('gpt-5');
    expect(chatgpt.isStreaming!(doc)).toBe(true);
  });
});

describe('fallback selectors', () => {
  it('claude: role/testid attributes without known classes', () => {
    const doc = parse(`<div data-message-author-role="user"><p>One</p></div><div data-testid="assistant-message"><p>Two</p></div>`);
    expect(claude.extract(doc).map((m) => [m.role, m.content])).toEqual([['user', 'One'], ['assistant', 'Two']]);
  });
  it('gemini: data-test-id containers', () => {
    const doc = parse(`<div data-test-id="user-query"><p>One</p></div><div data-test-id="model-response"><p>Two</p></div>`);
    expect(gemini.extract(doc).map((m) => m.role)).toEqual(['user', 'assistant']);
  });
});

describe('errors and self-check', () => {
  it('outdated adapter error on a conversation URL with no turns', () => {
    const run = () => extractConversation(parse('<main><p>Something new</p></main>'), 'https://claude.ai/chat/abc');
    expect(run).toThrow(AdapterError);
    try {
      run();
    } catch (e) {
      expect((e as AdapterError).code).toBe('outdated');
      expect((e as Error).message).toMatch(/out of date/);
    }
  });
  it('friendly "open a conversation" error on the home page', () => {
    try {
      extractConversation(parse('<main></main>'), 'https://chatgpt.com/');
    } catch (e) {
      expect((e as AdapterError).code).toBe('empty');
    }
    expect.assertions(1);
  });
  it('warns when only user messages were found (the original Claude bug)', () => {
    const c = extractConversation(parse('<div data-testid="user-message"><p>Hi</p></div><div class="new-unknown-reply"><p>Hello</p></div>'), 'https://claude.ai/chat/x');
    expect(c.warnings.join(' ')).toMatch(/Only your messages/);
  });
  it('warns when fewer turns were exported than the page shows', () => {
    const fake: SiteAdapter = { ...claude, visibleTurnCount: () => 10 };
    const turns = claude.extract(parse('<div data-testid="user-message"><p>a</p></div><div class="font-claude-response"><p>b</p></div>'));
    expect(selfCheck(fake, parse(''), turns, 0).join(' ')).toMatch(/about 10 messages but 2/);
    expect(selfCheck(claude, parse(''), turns, 0)).toEqual([]);
  });
  it('waits for streaming to end, then warns if it never does', async () => {
    let polls = 0;
    const finishing: SiteAdapter = { ...claude, isStreaming: () => polls++ < 3 };
    expect(await waitForStreamEnd(parse(''), finishing, noSleep)).toBe(false);
    const stuck: SiteAdapter = { ...claude, isStreaming: () => true };
    expect(await waitForStreamEnd(parse(''), stuck, { ...noSleep, streamWaitMs: 1000 })).toBe(true);
    const doc = parse('<div data-testid="user-message"><p>q</p></div><div data-is-streaming="true"><div class="font-claude-response"><p>partial</p></div></div>');
    const c = await extractFullConversation(doc, 'https://claude.ai/chat/x', { ...noSleep, streamWaitMs: 1000 });
    expect(c.messages).toHaveLength(2);
    expect(c.warnings.join(' ')).toMatch(/still writing/);
  });
});
