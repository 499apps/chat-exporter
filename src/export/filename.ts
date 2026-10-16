export function exportFilename(title: string, site: string, ext: string, now = new Date()): string {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'conversation';
  const d = now.toISOString().slice(0, 10);
  return `${site}-${slug}-${d}.${ext}`;
}
