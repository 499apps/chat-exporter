import { conversationHtml, themeCss } from '@/src/export/html';
import { normalizeSettings } from '@/src/settings';
import { localize, t } from '@/src/i18n';
import type { Conversation } from '@/src/types';

const docEl = document.getElementById('doc')!;
document.getElementById('print')!.addEventListener('click', () => window.print());

async function main() {
  localize();
  const { printJob } = (await browser.storage.session.get('printJob')) as {
    printJob?: { conversation: Conversation; settings: unknown };
  };
  if (!printJob) {
    docEl.textContent = t('printNothing');
    return;
  }
  await browser.storage.session.remove('printJob');
  const settings = normalizeSettings(printJob.settings);
  const c = printJob.conversation;
  document.title = c.source.title;
  document.getElementById('theme')!.textContent = themeCss(settings.theme, true, c.source.title);
  // conversationHtml escapes all page-derived text before building markup.
  docEl.innerHTML = conversationHtml(c, settings);
  setTimeout(() => window.print(), 400);
}

main();
