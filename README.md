# Convo Keeper

A free, local-first Chrome extension (Manifest V3, WXT + TypeScript) that exports the AI conversation in your current tab to **Markdown**, **JSON** or **PDF**. No servers, no network calls, no telemetry, no remote code.

Supported: ChatGPT (chatgpt.com), Claude (claude.ai), Gemini (gemini.google.com), Grok (grok.com). x.com/i/grok is not supported yet.

## Build and load unpacked
```
npm install
npm run build
```
1. Open `chrome://extensions` and turn on **Developer mode**.
2. Click **Load unpacked** and pick the `.output/chrome-mv3` folder.
3. Open a conversation on a supported site, click the Convo Keeper icon, then pick a format. PDF opens a print page; choose **Save as PDF**.

## Development
- `npm test` – fixture tests (vitest + jsdom)
- `npm run typecheck`, `npm run lint` (lint also forbids `fetch`/`XMLHttpRequest`/`WebSocket`)
- `npm run dev` – WXT dev mode

## Permissions
| Permission | Why |
|---|---|
| `activeTab` | Temporary access to the current tab, only after you click the extension. |
| `scripting` | Inject the bundled read-only extractor (`extract.js`) into that tab. |
| `storage` | Hand the conversation to the local print page for PDF; session storage, deleted after reading. |

No host permissions, no content scripts, no `downloads` permission (files are saved via a local blob link). The extension page CSP sets `connect-src 'none'`.

## Architecture
- `src/adapters/<site>.ts` – one DOM adapter per site behind `SiteAdapter` (`src/types.ts`). A site redesign breaks only its adapter.
- `tests/fixtures/*.html` – hand-written synthetic HTML modeled on each site's structure (no real user data).
- `src/markdown.ts` – HTML → Markdown; `src/export/*` – Markdown, JSON, print HTML.
- `entrypoints/` – popup, print page, injected `extract` script.
- `src/pro/types.ts` + `src/features.ts` – interfaces and off-by-default flags for a possible later paid batch export/sync. Not implemented.

JSON schema: [docs/SCHEMA.md](docs/SCHEMA.md). Privacy: [docs/PRIVACY.md](docs/PRIVACY.md).

## Clean-room note
Written from scratch. No code, assets or text were taken from other chat exporters.
