import type { SiteAdapter } from '../types';
import { compact, hostIs, inDocOrder, toMessage } from './common';

/**
 * Gemini uses custom elements: <user-query> for prompts and <model-response>
 * for replies (answer inside <message-content>). Older history is lazy-loaded
 * when scrolling up; the generic scroll collector handles that.
 */
export const gemini: SiteAdapter = {
  id: 'gemini',
  name: 'Gemini',
  matches: (url) => hostIs(url, 'gemini.google.com'),
  title: (doc) => doc.title.replace(/^\s*Gemini\s*$/i, '').trim() || null,
  extract(doc) {
    const nodes = inDocOrder(doc.querySelectorAll('user-query, model-response'));
    return compact(
      nodes.map((el) => {
        const keyFrom = el.closest('[id]') ?? el;
        if (el.tagName.toLowerCase() === 'user-query') {
          const lines = Array.from(el.querySelectorAll('.query-text-line'));
          if (lines.length) {
            const holder = el.querySelector('.query-text') ?? el;
            const msg = toMessage('user', holder, { plain: true, keyFrom });
            if (msg) msg.content = lines.map((l) => (l.textContent ?? '').trim()).join('\n').trim();
            return msg;
          }
          return toMessage('user', el.querySelector('.query-text') ?? el, { plain: true, keyFrom });
        }
        const body = el.querySelector('message-content .markdown') ?? el.querySelector('message-content') ?? el;
        return toMessage('assistant', body, { keyFrom });
      }),
    );
  },
};
