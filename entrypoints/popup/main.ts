import { findAdapter } from '@/src/adapters';
import { toJson } from '@/src/export/json';
import { toMarkdown } from '@/src/export/markdown';
import { toText, stripMarkdown } from '@/src/export/text';
import { toHtmlDocument } from '@/src/export/html';
import { prepareForExport } from '@/src/export/options';
import { renderFilename, type Settings } from '@/src/settings';
import { loadSettings } from '@/src/storage';
import { localize, t } from '@/src/i18n';
import type { Conversation, ErrorCode } from '@/src/types';

type Format = 'markdown' | 'pdf' | 'html' | 'copy' | 'json' | 'txt';
type ExtractResult = { ok: true; data: Conversation } | { ok: false; error: string; code?: ErrorCode };

class ExportError extends Error {
  constructor(message: string, public code?: ErrorCode | 'access') {
    super(message);
  }
}

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const siteCard = $('site');
const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('button[data-format]'));
const toastEl = $('toast');
const busyEl = $('busy');
const picker = $<HTMLDetailsElement>('picker');
const list = $<HTMLUListElement>('msg-list');

let tabId = 0;
let settings: Settings;
let cached: Conversation | null = null;
let selection: Set<number> | null = null;

function toast(kind: 'ok' | 'warn' | 'err', title: string, detail?: string | string[]) {
  toastEl.hidden = false;
  toastEl.className = `toast ${kind}`;
  toastEl.setAttribute('role', kind === 'err' ? 'alert' : 'status');
  toastEl.replaceChildren();
  const s = document.createElement('strong');
  s.textContent = title;
  toastEl.append(s);
  if (Array.isArray(detail) && detail.length) {
    const ul = document.createElement('ul');
    for (const d of detail) ul.append(Object.assign(document.createElement('li'), { textContent: d }));
    toastEl.append(ul);
  } else if (typeof detail === 'string') {
    toastEl.append(document.createTextNode(detail));
  }
}

function setBusy(on: boolean) {
  busyEl.hidden = !on;
  buttons.forEach((b) => (b.disabled = on));
  document.body.setAttribute('aria-busy', String(on));
}

async function extract(): Promise<Conversation> {
  if (cached) return cached;
  let first;
  try {
    [first] = await browser.scripting.executeScript({ target: { tabId }, files: ['/extract.js'] });
  } catch {
    throw new ExportError(t('errNoAccess'), 'access');
  }
  let res = first?.result as ExtractResult | undefined;
  if (!res) {
    const [again] = await browser.scripting.executeScript({
      target: { tabId },
      func: () => (globalThis as Record<string, unknown>).__convoKeeperResult,
    });
    res = again?.result as ExtractResult | undefined;
  }
  if (!res) throw new ExportError(t('errGenericHelp'));
  if (!res.ok) throw new ExportError(res.error, res.code);
  cached = res.data;
  return cached;
}

function download(text: string, mime: string, name: string) {
  const url = URL.createObjectURL(new Blob([text], { type: `${mime};charset=utf-8` }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

function renderPicker(c: Conversation) {
  selection ??= new Set(c.messages.map((m) => m.index));
  list.replaceChildren();
  for (const m of c.messages) {
    const li = document.createElement('li');
    const label = document.createElement('label');
    const box = Object.assign(document.createElement('input'), { type: 'checkbox', checked: selection.has(m.index) });
    box.addEventListener('change', () => {
      if (box.checked) selection!.add(m.index);
      else selection!.delete(m.index);
      updateCount(c);
    });
    const role = Object.assign(document.createElement('span'), {
      className: `role ${m.role}`,
      textContent: m.role === 'user' ? t('you') : c.source.siteName,
    });
    const preview = Object.assign(document.createElement('span'), {
      className: 'preview',
      textContent: stripMarkdown(m.content || m.thinking || '').replace(/^#+\s*|\|/gm, ' ').replace(/\s+/g, ' ').trim().slice(0, 160),
    });
    label.append(box, role, preview);
    li.append(label);
    list.append(li);
  }
  updateCount(c);
}

function updateCount(c: Conversation) {
  $('sel-count').textContent = selection ? t('selectedCount', [selection.size, c.messages.length]) : '';
}

async function run(format: Format) {
  setBusy(true);
  toastEl.hidden = true;
  try {
    const convo = await extract();
    const useSel = picker.open && selection ? [...selection] : undefined;
    if (useSel && !useSel.length) {
      toast('warn', t('noneSelected'));
      return;
    }
    const c = prepareForExport(convo, settings, useSel);
    const name = (ext: string) => renderFilename(settings.filenameTemplate, { site: c.source.site, title: c.source.title, model: c.source.model }, ext);
    const n = c.messages.length;
    switch (format) {
      case 'markdown':
        download(toMarkdown(c, settings), 'text/markdown', name('md'));
        break;
      case 'json':
        download(toJson(c), 'application/json', name('json'));
        break;
      case 'txt':
        download(toText(c, settings), 'text/plain', name('txt'));
        break;
      case 'html':
        download(toHtmlDocument(c, settings), 'text/html', name('html'));
        break;
      case 'copy':
        await navigator.clipboard.writeText(toMarkdown(c, settings));
        break;
      case 'pdf':
        await browser.storage.session.set({ printJob: { conversation: c, settings } });
        await browser.tabs.create({ url: browser.runtime.getURL('/print.html') });
        break;
    }
    const title = format === 'copy' ? t('copiedN', [n]) : format === 'pdf' ? t('pdfOpened') : t('exportedN', [n]);
    if (c.warnings.length) toast('warn', t('warningTitle'), c.warnings);
    else toast('ok', `✓ ${title}`);
  } catch (e) {
    const err = e instanceof ExportError ? e : new ExportError(e instanceof Error ? e.message : String(e));
    const help = err.code === 'outdated' ? t('errOutdatedHelp') : err.code === 'empty' ? t('errEmptyHelp') : err.code === 'access' ? '' : t('errGenericHelp');
    toast('err', t('errorTitle'), [err.message, help].filter(Boolean));
  } finally {
    setBusy(false);
  }
}

async function main() {
  localize();
  settings = await loadSettings();
  $('settings').addEventListener('click', () => browser.runtime.openOptionsPage());

  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  const adapter = findAdapter(tab?.url);
  if (!tab?.id || !adapter) {
    siteCard.hidden = true;
    $('main').hidden = true;
    $('empty').hidden = false;
    return;
  }
  tabId = tab.id;
  siteCard.classList.add('ok');
  $('site-title').textContent = t('detected', [adapter.name]);
  $('site-sub').textContent = `${t('ready')} · ${t('shortcutsHint')}`;

  for (const b of buttons) b.addEventListener('click', () => run(b.dataset.format as Format));

  picker.addEventListener('toggle', async () => {
    if (!picker.open || cached) return;
    setBusy(true);
    try {
      renderPicker(await extract());
    } catch (e) {
      picker.open = false;
      toast('err', t('errorTitle'), e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  });
  $('sel-all').addEventListener('click', () => {
    if (!cached) return;
    selection = new Set(cached.messages.map((m) => m.index));
    renderPicker(cached);
  });
  $('sel-none').addEventListener('click', () => {
    if (!cached) return;
    selection = new Set();
    renderPicker(cached);
  });

  // Keyboard: letter shortcuts, and arrow keys move between format buttons.
  document.addEventListener('keydown', (ev) => {
    const target = ev.target as HTMLElement;
    if (ev.ctrlKey || ev.metaKey || ev.altKey || target.matches('input, textarea, select')) return;
    const hit = buttons.find((b) => b.dataset.key === ev.key.toLowerCase());
    if (hit && !hit.disabled) {
      ev.preventDefault();
      hit.focus();
      hit.click();
      return;
    }
    const i = buttons.indexOf(target as HTMLButtonElement);
    if (i < 0) return;
    const move = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 3, ArrowUp: -3 }[ev.key];
    if (move) {
      ev.preventDefault();
      buttons[(i + move + buttons.length) % buttons.length].focus();
    }
  });
  buttons[0].focus();
}

main().catch((e) => toast('err', t('errorTitle'), String(e)));
