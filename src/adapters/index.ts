import type { SiteAdapter } from '../types';
import { chatgpt } from './chatgpt';
import { claude } from './claude';
import { gemini } from './gemini';
import { grok } from './grok';

export const adapters: SiteAdapter[] = [chatgpt, claude, gemini, grok];

export function findAdapter(href: string | undefined | null): SiteAdapter | null {
  if (!href) return null;
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:') return null;
  return adapters.find((a) => a.matches(url)) ?? null;
}
