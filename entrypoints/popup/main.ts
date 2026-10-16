import { findAdapter } from '@/src/adapters';
import { toJson } from '@/src/export/json';
import { toMarkdown } from '@/src/export/markdown';
import { exportFilename } from '@/src/export/filename';
import type { Conversation } from '@/src/types';

type Format = 'markdown' | 'json' | 'pdf';
type ExtractResult = { ok: true; data: Conversation } | { ok: false; error: string };

const siteEl = document.getElementById('site')!;
const statusEl = document.getElementById('status')!;
const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('button[data-format]'));

function setStatus(msg: string, error = false) {
  statusEl.textContent = msg;
  statusEl.className = error ? 'error' : '';
}

function download(text: string, mime: string, name: string) {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

async function extract(tabId: number): Promise<Conversation> {
  const [first] = await browser.scripting.executeScript({ target: { tabId }, files: ['/extract.js'] });
  let res = first?.result as ExtractResult | undefined;
  if (!res) {
    const [again] = await browser.scripting.executeScript({
      target: { tabId },
      func: () => (globalThis as Record<string, unknown>).__convoKeeperResult,
    });
    res = again?.result as ExtractResult | undefined;
  }
  if (!res) throw new Error('Could not read this page.');
  if (!res.ok) throw new Error(res.error);
  return res.data;
}

async function main() {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  const adapter = findAdapter(tab?.url);
  if (!tab?.id || !adapter) {
    siteEl.textContent = 'Not a supported chat page. Open ChatGPT, Claude, Gemini or Grok.';
    siteEl.className = 'site bad';
    return;
  }
  siteEl.textContent = `Detected: ${adapter.name}`;
  siteEl.className = 'site ok';
  const tabId = tab.id;
  for (const b of buttons) {
    b.disabled = false;
    b.addEventListener('click', async () => {
      const format = b.dataset.format as Format;
      buttons.forEach((x) => (x.disabled = true));
      setStatus('Reading conversation…');
      try {
        const convo = await extract(tabId);
        const n = convo.messages.length;
        if (format === 'markdown') {
          download(toMarkdown(convo), 'text/markdown', exportFilename(convo.source.title, convo.source.site, 'md'));
        } else if (format === 'json') {
          download(toJson(convo), 'application/json', exportFilename(convo.source.title, convo.source.site, 'json'));
        } else {
          await browser.storage.session.set({ printJob: convo });
          await browser.tabs.create({ url: browser.runtime.getURL('/print.html') });
        }
        setStatus(`Exported ${n} message${n === 1 ? '' : 's'}.`);
      } catch (e) {
        setStatus(e instanceof Error ? e.message : String(e), true);
      } finally {
        buttons.forEach((x) => (x.disabled = false));
      }
    });
  }
}

main().catch((e) => setStatus(String(e), true));
