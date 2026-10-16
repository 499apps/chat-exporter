import type { SiteAdapter } from '../types';
import { compact, hostIs, toMessage } from './common';

/**
 * ChatGPT renders each turn with a data-message-author-role attribute.
 * Assistant bodies live in a ".markdown" container; user prompts are pre-wrapped text.
 */
export const chatgpt: SiteAdapter = {
  id: 'chatgpt',
  name: 'ChatGPT',
  matches: (url) => hostIs(url, 'chatgpt.com', 'chat.openai.com'),
  title: (doc) => doc.title.replace(/\s*[-|]\s*ChatGPT\s*$/i, '').trim() || null,
  extract(doc) {
    const turns = Array.from(doc.querySelectorAll('[data-message-author-role]'));
    return compact(
      turns.map((el) => {
        const raw = el.getAttribute('data-message-author-role');
        const role = raw === 'user' ? 'user' : raw === 'system' ? 'system' : 'assistant';
        if (role === 'user') {
          const body = el.querySelector('.whitespace-pre-wrap') ?? el;
          return toMessage('user', body, { plain: true, tsFrom: el });
        }
        const body = el.querySelector('.markdown') ?? el;
        return toMessage(role, body, { tsFrom: el });
      }),
    );
  },
};
