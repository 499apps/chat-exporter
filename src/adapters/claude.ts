import type { SiteAdapter } from '../types';
import { compact, hostIs, inDocOrder, outermost, toMessage } from './common';

/**
 * Claude.ai turn detection, most specific first:
 *  - user turns: data-testid="user-message" (or a role attribute)
 *  - assistant turns: .font-claude-response / .font-claude-message, the
 *    streaming wrapper [data-is-streaming], or a role/testid attribute
 *  - turn wrappers: [data-test-render-count] (one per rendered turn)
 * Matches nested inside another match are dropped, and every candidate is
 * classified by whether it contains a user marker, so a turn is never lost
 * just because the assistant markup changed.
 */
const USER =
  '[data-testid="user-message"], [data-message-author-role="user"], [data-role="user"]';
const ASSISTANT = [
  '.font-claude-response',
  '.font-claude-message',
  '[data-is-streaming]',
  '[data-testid="assistant-message"]',
  '[data-message-author-role="assistant"]',
  '[data-role="assistant"]',
].join(', ');
const WRAPPER = '[data-test-render-count]';

function isUser(el: Element): boolean {
  return el.matches(USER) || el.querySelector(USER) !== null;
}

export const claude: SiteAdapter = {
  id: 'claude',
  name: 'Claude',
  matches: (url) => hostIs(url, 'claude.ai'),
  title: (doc) => doc.title.replace(/\s*[-|]\s*Claude\s*$/i, '').trim() || null,
  extract(doc) {
    const markers = outermost(Array.from(doc.querySelectorAll(`${USER}, ${ASSISTANT}`)));
    // Per-turn wrappers only; ignore any wrapper holding more than one turn.
    const wrappers = outermost(
      Array.from(doc.querySelectorAll(WRAPPER)).filter((w) => markers.filter((m) => w.contains(m)).length <= 1),
    );
    // Prefer wrappers when they cover every user/assistant marker.
    const covered = wrappers.length > 0 && markers.every((m) => wrappers.some((w) => w.contains(m)));
    const turns = covered ? wrappers : inDocOrder(outermost([...wrappers, ...markers]));
    return compact(
      turns.map((el) => {
        if (isUser(el)) {
          const body = el.matches(USER) ? el : el.querySelector(USER)!;
          return toMessage('user', body, { keyFrom: el });
        }
        const body =
          (el.matches(ASSISTANT) ? el : el.querySelector('.font-claude-response, .font-claude-message')) ?? el;
        return toMessage('assistant', body, { keyFrom: el });
      }),
    );
  },
};
