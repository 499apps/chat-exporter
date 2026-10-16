import type { SiteAdapter } from '../types';
import { compact, hostIs, inDocOrder, outermost, toMessage } from './common';

/**
 * ChatGPT marks each turn with data-message-author-role; turns also sit in
 * <article data-testid="conversation-turn-N">. Both are used so a turn missing
 * the role attribute is still captured (role then comes from the sr-only label
 * or data-turn attribute).
 */
const ROLE = '[data-message-author-role]';
const TURN = 'article[data-testid^="conversation-turn"], [data-turn]';

export const chatgpt: SiteAdapter = {
  id: 'chatgpt',
  name: 'ChatGPT',
  matches: (url) => hostIs(url, 'chatgpt.com', 'chat.openai.com'),
  title: (doc) => doc.title.replace(/\s*[-|]\s*ChatGPT\s*$/i, '').trim() || null,
  extract(doc) {
    const roleEls = Array.from(doc.querySelectorAll(ROLE));
    const orphanTurns = Array.from(doc.querySelectorAll(TURN)).filter((t) => !t.querySelector(ROLE) && !t.closest(ROLE));
    const nodes = inDocOrder(outermost([...roleEls, ...orphanTurns]));
    return compact(
      nodes.map((el) => {
        const raw = (el.getAttribute('data-message-author-role') ?? el.getAttribute('data-turn') ?? '').toLowerCase();
        const role = raw === 'user' ? 'user' : raw === 'system' ? 'system' : 'assistant';
        if (role === 'user') {
          const body = el.querySelector('.whitespace-pre-wrap') ?? el;
          return toMessage('user', body, { plain: true, tsFrom: el });
        }
        const parts = Array.from(el.querySelectorAll('.markdown'));
        const body = parts.length === 1 ? parts[0] : el;
        return toMessage(role, body, { tsFrom: el });
      }),
    );
  },
};
