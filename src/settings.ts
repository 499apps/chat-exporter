/** User settings (stored locally with chrome.storage.local). */
export type Theme = 'indigo' | 'classic' | 'minimal' | 'dark';

export interface Settings {
  /** Tokens: {site} {title} {date} {time} {model} */
  filenameTemplate: string;
  includeTimestamps: boolean;
  includeMetadata: boolean;
  includeThinking: boolean;
  theme: Theme;
}

export const DEFAULT_SETTINGS: Settings = {
  filenameTemplate: '{site}-{title}-{date}',
  includeTimestamps: true,
  includeMetadata: true,
  includeThinking: true,
  theme: 'indigo',
};

export const THEMES: Theme[] = ['indigo', 'classic', 'minimal', 'dark'];

/** Merge stored values over defaults, ignoring anything malformed. */
export function normalizeSettings(raw: unknown): Settings {
  const s = { ...DEFAULT_SETTINGS };
  if (!raw || typeof raw !== 'object') return s;
  const r = raw as Record<string, unknown>;
  if (typeof r.filenameTemplate === 'string' && r.filenameTemplate.trim()) s.filenameTemplate = r.filenameTemplate.trim().slice(0, 120);
  for (const k of ['includeTimestamps', 'includeMetadata', 'includeThinking'] as const) if (typeof r[k] === 'boolean') s[k] = r[k];
  if (typeof r.theme === 'string' && (THEMES as string[]).includes(r.theme)) s.theme = r.theme as Theme;
  return s;
}

function slug(s: string, max = 60): string {
  return s.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, max).replace(/-+$/, '');
}

/** Build a safe file name from the template. */
export function renderFilename(
  template: string,
  info: { site: string; title: string; model?: string | null },
  ext: string,
  now = new Date(),
): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}`;
  const base = (template || DEFAULT_SETTINGS.filenameTemplate)
    .replace(/\{site\}/g, slug(info.site))
    .replace(/\{title\}/g, slug(info.title) || 'conversation')
    .replace(/\{date\}/g, date)
    .replace(/\{time\}/g, time)
    .replace(/\{model\}/g, slug(info.model ?? '') || 'model')
    // eslint-disable-next-line no-control-regex
    .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/^[.-]+|[.-]+$/g, '')
    .slice(0, 150);
  return `${base || 'conversation'}.${ext}`;
}
