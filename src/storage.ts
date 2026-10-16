import { normalizeSettings, type Settings } from './settings';

export async function loadSettings(): Promise<Settings> {
  const { settings } = await browser.storage.local.get('settings');
  return normalizeSettings(settings);
}

export async function saveSettings(s: Settings): Promise<void> {
  await browser.storage.local.set({ settings: s });
}
