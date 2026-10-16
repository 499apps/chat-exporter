import type { SiteAdapter } from '../types';
import { anyMatch, compact, firstText, hostIs, inDocOrder, outermost, queryAll, toMessage } from './common';

/**
 * ChatGPT marks each turn with data-message-author-role; turns also sit in
 * <article data-testid="conversation-turn-N">. Both are used so a turn missing
 * the role attribute is still captured (role then comes from data-turn).
 * Only the visible branch of an edited message is in the DOM, so that is what
 * gets exported.
 */
const ROLE = '[data-message-author-role]';
const TURN = 'article[data-testid^="conversation-turn"], [data-turn]';

export const chatgpt: SiteAdapter = {
  id: 'chatgpt',
  name: 'ChatGPT',
  matches: (url) => hostIs(url, 'chatgpt.com', 'chat.openai.com'),
  isConversationUrl: (url) => /\/c\/[\w-]+/.test(url.pathname) || url.pathname.startsWith('/share/'),
  title: (doc) => doc.title.replace(/\s*[-|–]\s*ChatGPT\s*$/i, '').replace(/^ChatGPT$/i, '').trim() || null,
  model: (doc) =>
    doc.querySelector('[data-message-model-slug]')?.getAttribute('data-message-model-slug') ??
    firstText(doc, ['[data-testid="model-switcher-dropdown-button"]']),
  isStreaming: (doc) => anyMatch(doc, ['.result-streaming', '[data-testid="stop-button"]', 'button[aria-label*="Stop streaming"]']),
  visibleTurnCount: (doc) => outermost(queryAll(doc, [ROLE, 'article[data-testid^="conversation-turn"]'])).length,
  extract(doc) {
    const roleEls = Array.from(doc.querySelectorAll(ROLE));
    const orphanTurns = Array.from(doc.querySelectorAll(TURN)).filter((t) => !t.querySelector(ROLE) && !t.closest(ROLE));
    const nodes = inDocOrder(outermost([...roleEls, ...orphanTurns]));
    return compact(
      nodes.map((el) => {
        const raw = (el.getAttribute('data-message-author-role') ?? el.getAttribute('data-turn') ?? '').toLowerCase();
        if (raw === 'tool') return null; // internal tool calls are not part of the visible chat
        const role = raw === 'user' ? 'user' : raw === 'system' ? 'system' : 'assistant';
        if (role === 'user') {
          const body = el.querySelector('.whitespace-pre-wrap')?.parentElement ?? el;
          return toMessage('user', body, { plain: true, tsFrom: el });
        }
        const parts = Array.from(el.querySelectorAll('.markdown'));
        const body = parts.length === 1 && !el.querySelector('[data-testid*="reasoning"], [data-testid*="thinking"]') ? parts[0] : el;
        return toMessage(role, body, { tsFrom: el });
      }),
    );
  },
};
