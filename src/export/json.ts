import type { Conversation } from '../types';

export function toJson(c: Conversation): string {
  return JSON.stringify(c, null, 2) + '\n';
}
