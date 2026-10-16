import type { SiteAdapter } from '../types';
import { anyMatch, compact, firstText, hostIs, inDocOrder, outermost, queryAll, toMessage } from './common';

/**
 * Claude.ai turn detection, most specific first:
 *  - user turns: data-testid="user-message" (or a role attribute)
 *  - assistant turns: .font-claude-response / .font-claude-message, the
 *    streaming wrapper [data-is-streaming], or a role/testid attribute
 *  - turn wrappers: [data-test-render-count] (one per rendered turn)
 * Every candidate is classified by whether it contains a user marker, so a
 * turn is never lost just because the assistant markup changed.
 */
const USER = '[data-testid="user-message"], [data-message-author-role="user"], [data-role="user"]';
const ASSISTANT_LIST = [
  '.font-claude-response',
  '.font-claude-message',
  '[data-is-streaming]',
  '[data-testid="assistant-message"]',
  '[data-message-author-role="assistant"]',
  '[data-role="assistant"]',
];
const ASSISTANT = ASSISTANT_LIST.join(', ');
const BODY = '.font-claude-response, .font-claude-message, [data-testid="assistant-message"], .standard-markdown, .progressive-markdown';
const WRAPPER = '[data-test-render-count]';

function isUser(el: Element): boolean {
  return el.matches(USER) || el.querySelector(USER) !== null;
}

export const claude: SiteAdapter = {
  id: 'claude',
  name: 'Claude',
  matches: (url) => hostIs(url, 'claude.ai'),
  isConversationUrl: (url) => /^\/(chat|project\/[^/]+\/chat)\/[\w-]+/.test(url.pathname) || url.pathname.startsWith('/share/'),
  title: (doc) => doc.title.replace(/\s*[-|–]\s*Claude\s*$/i, '').trim() || null,
  model: (doc) => firstText(doc, ['[data-testid="model-selector-dropdown"]', 'button[aria-label*="model" i] .whitespace-nowrap', '[data-testid*="model-selector"]']),
  isStreaming: (doc) => anyMatch(doc, ['[data-is-streaming="true"]', 'button[aria-label="Stop response"]']),
  visibleTurnCount: (doc) => outermost(queryAll(doc, [USER, ...ASSISTANT_LIST])).length,
  extract(doc) {
    const markers = outermost(Array.from(doc.querySelectorAll(`${USER}, ${ASSISTANT}`)));
    const wrappers = outermost(
      Array.from(doc.querySelectorAll(WRAPPER)).filter((w) => markers.filter((m) => w.contains(m)).length <= 1),
    );
    const covered = wrappers.length > 0 && markers.every((m) => wrappers.some((w) => w.contains(m)));
    const turns = covered ? wrappers : inDocOrder(outermost([...wrappers, ...markers]));
    return compact(
      turns.map((el) => {
        if (isUser(el)) {
          const body = el.matches(USER) ? el : el.querySelector(USER)!;
          return toMessage('user', body, { keyFrom: el });
        }
        // Keep thinking panels that sit beside the answer body inside the turn.
        const body = el.matches(BODY) ? el : el.querySelector('[data-is-streaming]') ?? el;
        return toMessage('assistant', body, { keyFrom: el });
      }),
    );
  },
};
