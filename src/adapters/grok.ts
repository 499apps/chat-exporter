import type { SiteAdapter } from '../types';
import { anyMatch, compact, firstText, hostIs, inDocOrder, outermost, queryAll, toMessage } from './common';

/**
 * grok.com renders each turn in a container with an id starting "response-".
 * User turns are right-aligned ("items-end"), replies left-aligned ("items-start").
 * Text sits in a ".message-bubble"; bubbles outside a response- container are
 * also picked up. x.com/i/grok is not supported yet.
 */
export const grok: SiteAdapter = {
  id: 'grok',
  name: 'Grok',
  matches: (url) => hostIs(url, 'grok.com'),
  isConversationUrl: (url) => /^\/(c|chat|share)\/[\w-]+/.test(url.pathname),
  title: (doc) => doc.title.replace(/\s*[-|–]\s*Grok\s*$/i, '').replace(/^Grok$/i, '').trim() || null,
  model: (doc) => firstText(doc, ['[data-testid="model-select"]', 'button[aria-label*="Model select" i] span']),
  isStreaming: (doc) => anyMatch(doc, ['button[aria-label="Stop model response"]', 'button[aria-label="Stop"]', '[data-streaming="true"]']),
  visibleTurnCount: (doc) => outermost(queryAll(doc, ['[id^="response-"]', '.message-bubble'])).length,
  extract(doc) {
    const turns = Array.from(doc.querySelectorAll('[id^="response-"]'));
    const loose = Array.from(doc.querySelectorAll('.message-bubble')).filter((b) => !b.closest('[id^="response-"]'));
    const nodes = inDocOrder(outermost([...turns, ...loose]));
    return compact(
      nodes.map((el) => {
        const aligned = el.closest('.items-end, .items-start') ?? el;
        const role =
          aligned.classList.contains('items-end') || el.closest('[data-role="user"]') ? 'user' : 'assistant';
        const bubble = el.matches('.message-bubble') ? el : el.querySelector('.message-bubble');
        const thinking = el.querySelector('.thinking-container, [data-testid*="thinking"]');
        const body = !bubble || (thinking && !bubble.contains(thinking)) ? el : bubble;
        return toMessage(role, body, { plain: role === 'user', tsFrom: el });
      }),
    );
  },
};
