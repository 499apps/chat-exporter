import { toPrintHtml } from '@/src/export/html';
import type { Conversation } from '@/src/types';

const docEl = document.getElementById('doc')!;
document.getElementById('print')!.addEventListener('click', () => window.print());

async function main() {
  const { printJob } = (await browser.storage.session.get('printJob')) as { printJob?: Conversation };
  if (!printJob) {
    docEl.textContent = 'Nothing to print. Use the Convo Keeper popup on a chat page and choose PDF.';
    return;
  }
  await browser.storage.session.remove('printJob');
  document.title = printJob.source.title;
  // toPrintHtml escapes all page-derived text before building markup.
  docEl.innerHTML = toPrintHtml(printJob);
  setTimeout(() => window.print(), 300);
}

main();
