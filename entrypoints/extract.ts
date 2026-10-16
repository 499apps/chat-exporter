import { extractFullConversation } from '@/src/extract';

/**
 * Injected into the active tab only when the user clicks an export button
 * (activeTab + scripting). Reads the page DOM, scrolling the conversation to
 * load every turn, then restores the scroll position. No network access.
 */
export default defineUnlistedScript(async () => {
  let result: { ok: true; data: unknown } | { ok: false; error: string };
  try {
    result = { ok: true, data: await extractFullConversation(document, location.href) };
  } catch (e) {
    result = { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
  (globalThis as Record<string, unknown>).__convoKeeperResult = result;
  return result;
});
