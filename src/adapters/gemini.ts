import type { SiteAdapter } from '../types';
import { anyMatch, compact, firstText, hostIs, inDocOrder, queryAll, toMessage } from './common';

/**
 * Gemini uses custom elements: <user-query> for prompts and <model-response>
 * for replies (answer inside <message-content>). Older history is lazy-loaded
 * when scrolling up; the scroll collector handles that.
 */
const USER = ['user-query', '[data-test-id="user-query"]', '.user-query-container'];
const MODEL = ['model-response', '[data-test-id="model-response"]', '.model-response-container'];

export const gemini: SiteAdapter = {
  id: 'gemini',
  name: 'Gemini',
  matches: (url) => hostIs(url, 'gemini.google.com'),
  isConversationUrl: (url) => /\/(app|gem\/[^/]+)\/[\w-]+/.test(url.pathname) || url.pathname.startsWith('/share/'),
  title: (doc) =>
    firstText(doc, ['.conversation.selected .conversation-title', '[data-test-id="conversation-title"]']) ??
    (doc.title.replace(/^\s*Gemini\s*$/i, '').replace(/\s*[-|–]\s*Gemini\s*$/i, '').trim() || null),
  model: (doc) => firstText(doc, ['[data-test-id="bard-mode-menu-button"]', '.current-mode-title', 'bard-mode-switcher button']),
  isStreaming: (doc) => anyMatch(doc, ['button[aria-label="Stop response"]', 'model-response [aria-busy="true"]', '.stop-icon']),
  visibleTurnCount: (doc) => queryAll(doc, [...USER, ...MODEL]).filter((e, _i, all) => !all.some((o) => o !== e && o.contains(e))).length,
  extract(doc) {
    const all = queryAll(doc, [...USER, ...MODEL]);
    const nodes = inDocOrder(all.filter((e) => !all.some((o) => o !== e && o.contains(e))));
    return compact(
      nodes.map((el) => {
        const keyFrom = el.closest('[id]') ?? el;
        const isUser = USER.some((s) => el.matches(s));
        if (isUser) {
          const lines = Array.from(el.querySelectorAll('.query-text-line'));
          const holder = el.querySelector('.query-text') ?? el;
          const msg = toMessage('user', el.querySelector('.query-content') ?? holder, { plain: true, keyFrom });
          if (msg && lines.length && !holder.querySelector('pre')) {
            const text = lines.map((l) => (l.textContent ?? '').trim()).join('\n').trim();
            const rest = msg.content.split('\n').filter((l) => l.startsWith('[Attachment:') || l.startsWith('[Image'));
            msg.content = [...rest, text].filter(Boolean).join('\n\n');
          }
          return msg;
        }
        const thoughts = el.querySelector('model-thoughts, .model-thoughts, .thoughts-container');
        const answer = el.querySelector('message-content .markdown') ?? el.querySelector('message-content');
        const body = thoughts || !answer ? el : answer;
        return toMessage('assistant', body, { keyFrom });
      }),
    );
  },
};
