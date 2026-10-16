import type { SiteAdapter } from '../types';
import { compact, hostIs, outermost, toMessage } from './common';

/**
 * Claude marks user turns with data-testid="user-message" and wraps replies in
 * an element with the "font-claude-response" (older: "font-claude-message") class.
 */
const USER = '[data-testid="user-message"]';
const ASSISTANT = '.font-claude-response, .font-claude-message';

export const claude: SiteAdapter = {
  id: 'claude',
  name: 'Claude',
  matches: (url) => hostIs(url, 'claude.ai'),
  title: (doc) => doc.title.replace(/\s*[-|]\s*Claude\s*$/i, '').trim() || null,
  extract(doc) {
    const nodes = outermost(Array.from(doc.querySelectorAll(`${USER}, ${ASSISTANT}`)));
    return compact(nodes.map((el) => (el.matches(USER) ? toMessage('user', el) : toMessage('assistant', el))));
  },
};
