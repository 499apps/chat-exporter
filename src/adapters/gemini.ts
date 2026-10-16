import type { SiteAdapter } from '../types';
import { compact, hostIs, toMessage } from './common';

/**
 * Gemini uses custom elements: <user-query> for prompts and <model-response>
 * for replies, with the rendered answer inside <message-content>.
 */
export const gemini: SiteAdapter = {
  id: 'gemini',
  name: 'Gemini',
  matches: (url) => hostIs(url, 'gemini.google.com'),
  title: (doc) => doc.title.replace(/^\s*Gemini\s*$/i, '').trim() || null,
  extract(doc) {
    const nodes = Array.from(doc.querySelectorAll('user-query, model-response'));
    return compact(
      nodes.map((el) => {
        if (el.tagName.toLowerCase() === 'user-query') {
          const lines = Array.from(el.querySelectorAll('.query-text-line'));
          if (lines.length) {
            const text = lines.map((l) => (l.textContent ?? '').trim()).join('\n').trim();
            return text ? { role: 'user' as const, content: text, timestamp: null, codeBlocks: [] } : null;
          }
          return toMessage('user', el.querySelector('.query-text') ?? el, { plain: true });
        }
        const body = el.querySelector('message-content .markdown') ?? el.querySelector('message-content') ?? el;
        return toMessage('assistant', body);
      }),
    );
  },
};
