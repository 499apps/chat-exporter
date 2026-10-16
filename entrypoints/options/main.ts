import { DEFAULT_SETTINGS, normalizeSettings, renderFilename, type Settings } from '@/src/settings';
import { loadSettings, saveSettings } from '@/src/storage';
import { localize, t } from '@/src/i18n';

const form = document.getElementById('form') as HTMLFormElement;
const saved = document.getElementById('saved')!;
let timer: ReturnType<typeof setTimeout> | undefined;

function fill(s: Settings) {
  (form.elements.namedItem('filenameTemplate') as HTMLInputElement).value = s.filenameTemplate;
  for (const k of ['includeMetadata', 'includeTimestamps', 'includeThinking'] as const) {
    (form.elements.namedItem(k) as HTMLInputElement).checked = s[k];
  }
  const radio = form.querySelector<HTMLInputElement>(`input[name="theme"][value="${s.theme}"]`);
  if (radio) radio.checked = true;
  preview(s);
}

function read(): Settings {
  const fd = new FormData(form);
  return normalizeSettings({
    filenameTemplate: fd.get('filenameTemplate'),
    includeMetadata: fd.has('includeMetadata'),
    includeTimestamps: fd.has('includeTimestamps'),
    includeThinking: fd.has('includeThinking'),
    theme: fd.get('theme'),
  });
}

function preview(s: Settings) {
  const example = renderFilename(s.filenameTemplate, { site: 'claude', title: 'Trip planning ideas', model: 'Sonnet' }, 'md');
  document.getElementById('fn-preview')!.textContent = t('optPreview', [example]);
}

async function persist() {
  const s = read();
  preview(s);
  await saveSettings(s);
  saved.textContent = `✓ ${t('optSaved')}`;
  clearTimeout(timer);
  timer = setTimeout(() => (saved.textContent = ''), 1500);
}

localize();
form.addEventListener('input', persist);
form.addEventListener('change', persist);
form.addEventListener('submit', (e) => e.preventDefault());
document.getElementById('reset')!.addEventListener('click', async () => {
  fill(DEFAULT_SETTINGS);
  await persist();
});
loadSettings().then(fill);
