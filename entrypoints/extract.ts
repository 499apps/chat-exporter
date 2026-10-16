import { extractFullConversation } from '@/src/extract';
import { AdapterError } from '@/src/types';

/**
 * Injected into the active tab only when the user clicks an export action
 * (activeTab + scripting). Reads the page DOM, waits briefly for a reply that
 * is still streaming, scrolls the conversation to load every turn, then
 * restores the scroll position. No network access, never modifies the page.
 */
export default defineUnlistedScript(async () => {
  let result: { ok: true; data: unknown } | { ok: false; error: string; code?: string };
  try {
    result = { ok: true, data: await extractFullConversation(document, location.href) };
  } catch (e) {
    result = { ok: false, error: e instanceof Error ? e.message : String(e), code: e instanceof AdapterError ? e.code : undefined };
  }
  (globalThis as Record<string, unknown>).__convoKeeperResult = result;
  return result;
});
