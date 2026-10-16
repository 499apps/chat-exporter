import { describe, expect, it } from 'vitest';
import { claude } from '../src/adapters/claude';
import { chatgpt } from '../src/adapters/chatgpt';
import { gemini } from '../src/adapters/gemini';
import { grok } from '../src/adapters/grok';
import { collectAll, mergeTurns } from '../src/collect';
import { extractFullConversation } from '../src/extract';
import type { RawTurn, SiteAdapter } from '../src/types';

/* Synthetic long conversations (no real data). Assistant markup rotates
   through every variant each adapter must tolerate. */

const N = 34; // turns per conversation

function claudeTurn(i: number): string {
  if (i % 2 === 0) {
    return `<div data-test-render-count="1"><div class="mb-1"><div data-testid="user-message"><p class="whitespace-pre-wrap">Question ${i}</p></div></div></div>`;
  }
  const v = (i >> 1) % 4;
  const inner =
    v === 0
      ? `<div class="font-claude-response"><p>Answer ${i}</p></div>`
      : v === 1
        ? `<div class="font-claude-message"><p>Answer ${i}</p><pre><code class="language-ts">const n${i} = ${i};</code></pre></div>`
        : v === 2
          ? `<div data-is-streaming="false"><div class="grid standard-markdown"><p>Answer ${i}</p></div><div class="artifact-block"><button>Open artifact</button><div>Artifact ${i}</div></div></div>`
          : `<div data-is-streaming="false"><div class="font-claude-response"><p>Answer ${i}</p><ul><li>item</li></ul></div></div>`;
  return `<div data-test-render-count="1">${inner}</div>`;
}

const html = (body: string) => `<!doctype html><html><head><title>Long - Claude</title></head><body>${body}</body></html>`;
const parse = (s: string) => new DOMParser().parseFromString(s, 'text/html');

function expectAll(msgs: RawTurn[]) {
  expect(msgs).toHaveLength(N);
  msgs.forEach((m, i) => {
    expect(m.role).toBe(i % 2 === 0 ? 'user' : 'assistant');
    expect(m.content).toContain(`${i % 2 === 0 ? 'Question' : 'Answer'} ${i}`);
  });
}

describe('long conversations capture every turn', () => {
  it('claude: mixed assistant markup, artifacts, code', () => {
    const doc = parse(html(`<main>${Array.from({ length: N }, (_, i) => claudeTurn(i)).join('')}</main>`));
    const msgs = claude.extract(doc);
    expectAll(msgs);
    expect(msgs.find((m) => m.content.includes('Answer 3'))!.codeBlocks[0].language).toBe('ts');
    expect(msgs.find((m) => m.content.includes('Answer 5'))!.content).toContain('Artifact 5');
  });

  it('claude: works without render-count wrappers', () => {
    const doc = parse(html(Array.from({ length: N }, (_, i) => claudeTurn(i).replace(/<div data-test-render-count="1">([\s\S]*)<\/div>$/, '$1')).join('')));
    expectAll(claude.extract(doc));
  });

  it('claude: ignores a wrapper that holds the whole conversation', () => {
    const doc = parse(html(`<div data-test-render-count="9">${Array.from({ length: N }, (_, i) => claudeTurn(i)).join('')}</div>`));
    expectAll(claude.extract(doc));
  });

  it('chatgpt: role attributes plus turns lacking them', () => {
    const turns = Array.from({ length: N }, (_, i) => {
      const role = i % 2 === 0 ? 'user' : 'assistant';
      const text = role === 'user' ? `Question ${i}` : `Answer ${i}`;
      if (i % 5 === 4) return `<article data-testid="conversation-turn-${i}" data-turn="${role}"><div class="markdown"><p>${text}</p></div></article>`;
      const body = role === 'user' ? `<div class="whitespace-pre-wrap">${text}</div>` : `<div class="markdown"><p>${text}</p><pre><code class="language-py">x=${i}</code></pre></div>`;
      return `<article data-testid="conversation-turn-${i}" data-turn="${role}"><div data-message-author-role="${role}" data-message-id="m${i}">${body}</div></article>`;
    });
    expectAll(chatgpt.extract(parse(html(turns.join('')))));
  });

  it('gemini: many conversation containers', () => {
    const body = Array.from({ length: N / 2 }, (_, k) => {
      const q = 2 * k;
      return `<div class="conversation-container" id="c${k}"><user-query><div class="query-text"><p class="query-text-line">Question ${q}</p></div></user-query><model-response><message-content><div class="markdown"><p>Answer ${q + 1}</p></div></message-content></model-response></div>`;
    }).join('');
    expectAll(gemini.extract(parse(html(body))));
  });

  it('grok: response containers and loose bubbles', () => {
    const body = Array.from({ length: N }, (_, i) => {
      const cls = i % 2 === 0 ? 'items-end' : 'items-start';
      const text = i % 2 === 0 ? `Question ${i}` : `Answer ${i}`;
      return i % 7 === 6
        ? `<div class="flex ${cls}"><div class="message-bubble"><p>${text}</p></div></div>`
        : `<div id="response-${i}" class="flex ${cls}"><div class="message-bubble"><p>${text}</p></div></div>`;
    }).join('');
    expectAll(grok.extract(parse(html(body))));
  });
});

describe('virtualized list collection', () => {
  it('mergeTurns de-duplicates by key and keeps order', () => {
    const seen = new Map<string, RawTurn>();
    const order: string[] = [];
    const t = (k: string): RawTurn => ({ key: k, role: 'user', content: k, timestamp: null, codeBlocks: [] });
    mergeTurns(seen, order, [t('c'), t('d')]);
    mergeTurns(seen, order, [t('a'), t('b'), t('c')]);
    mergeTurns(seen, order, [t('d'), t('e')]);
    expect(order).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  /** Fake virtual scroller: only a 6-turn window around scrollTop is in the DOM. */
  function virtualDoc() {
    const doc = parse(html(`<div id="scroller" style="overflow-y:auto"><div id="list"></div></div>`));
    const box = doc.getElementById('scroller')!;
    const list = doc.getElementById('list')!;
    const ROW = 100;
    let top = (N - 6) * ROW; // opened at the bottom, like Claude
    const render = () => {
      const firstIdx = Math.max(0, Math.min(N - 6, Math.floor(top / ROW)));
      list.innerHTML = Array.from({ length: 6 }, (_, k) => claudeTurn(firstIdx + k)).join('');
    };
    Object.defineProperty(box, 'scrollHeight', { get: () => N * ROW });
    Object.defineProperty(box, 'clientHeight', { get: () => 6 * ROW });
    Object.defineProperty(box, 'scrollTop', {
      get: () => top,
      set: (v: number) => {
        top = Math.max(0, Math.min(N * ROW - 6 * ROW, v));
        render();
      },
    });
    render();
    return { doc, box, getTop: () => top };
  }

  it('claude: only 6 of 34 turns rendered at a time, still collects all in order', async () => {
    const { doc, getTop } = virtualDoc();
    expect(claude.extract(doc)).toHaveLength(6);
    const before = getTop();
    const msgs = await collectAll(doc, claude, { sleep: async () => {} });
    expectAll(msgs);
    expect(getTop()).toBe(before); // scroll position restored
  });

  it('full extraction strips internal keys and respects the step cap', async () => {
    const { doc } = virtualDoc();
    const c = await extractFullConversation(doc, 'https://claude.ai/chat/x', { sleep: async () => {} });
    expect(c.messages).toHaveLength(N);
    expect(Object.keys(c.messages[0])).not.toContain('key');
    const capped = await collectAll(virtualDoc().doc, claude as SiteAdapter, { sleep: async () => {}, maxSteps: 2 });
    expect(capped.length).toBeLessThan(N);
  });
});
