import { extractConversation } from '@/src/extract';

/**
 * Injected into the active tab only when the user clicks an export button
 * (activeTab + scripting). Reads the page DOM and returns a result; it never
 * modifies the page or talks to the network.
 */
export default defineUnlistedScript(() => {
  let result: { ok: true; data: unknown } | { ok: false; error: string };
  try {
    result = { ok: true, data: extractConversation(document, location.href) };
  } catch (e) {
    result = { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
  (globalThis as Record<string, unknown>).__convoKeeperResult = result;
  return result;
});
