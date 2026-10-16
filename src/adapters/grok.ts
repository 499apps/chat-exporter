import type { SiteAdapter } from '../types';
import { compact, hostIs, toMessage } from './common';

/**
 * grok.com renders each turn in a container with an id starting "response-".
 * User turns are right-aligned ("items-end"), replies left-aligned ("items-start").
 * The text sits in a ".message-bubble". x.com/i/grok is not supported yet.
 */
export const grok: SiteAdapter = {
  id: 'grok',
  name: 'Grok',
  matches: (url) => hostIs(url, 'grok.com'),
  title: (doc) => doc.title.replace(/\s*[-|]\s*Grok\s*$/i, '').trim() || null,
  extract(doc) {
    const turns = Array.from(doc.querySelectorAll('[id^="response-"]'));
    return compact(
      turns.map((el) => {
        const role = el.classList.contains('items-end') || el.getAttribute('data-role') === 'user' ? 'user' : 'assistant';
        const body = el.querySelector('.message-bubble') ?? el;
        return toMessage(role, body, { plain: role === 'user', tsFrom: el });
      }),
    );
  },
};
