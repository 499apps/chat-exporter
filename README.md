# Convo Keeper

A free, privacy-first Chrome extension (Manifest V3, WXT + TypeScript) that saves the AI conversation in your current tab as **Markdown, PDF, HTML, JSON or plain text**, or copies it to the clipboard. Everything happens on your device: no servers, no accounts, no network calls, no telemetry, no remote code. Free, with no paid tier.

Supported: ChatGPT (chatgpt.com), Claude (claude.ai), Gemini (gemini.google.com), Grok (grok.com). x.com/i/grok is not supported yet.

## Features
- **Formats:** Markdown, PDF (styled print view with title, date, model and page numbers), self-contained HTML, JSON ([schema v2](docs/SCHEMA.md)), plain text, and copy-as-Markdown.
- **Whole conversations:** scrolls long or lazily loaded chats to collect every message, then puts your scroll position back.
- **Faithful content:** code blocks with their language, tables, LaTeX/math (kept as `$…$` / `$$…$$`), thinking/reasoning blocks (optional), images and files as `[Image: alt]` / `[Attachment: name]` placeholders, artifacts and canvases as `[Artifact: title]` (with code when shown inline), and only the visible branch of edited messages.
- **Reliability:** waits for a reply that is still being written (or warns), detects an out-of-date site reader with a clear message, and runs a self-check that warns if the export looks incomplete.
- **Pick messages:** choose exactly which messages to export.
- **Settings:** file-name template (`{site} {title} {date} {time} {model}`), timestamps, metadata header, thinking blocks, and a PDF/HTML theme (Indigo, Classic, Minimal, Dark).
- **Fast:** `Alt+Shift+E` opens the popup; in the popup press `M` `P` `H` `C` `J` `T`, or move with the arrow keys.
- **Polished and accessible:** light/dark mode, loading/success/warning/error states, ARIA labels and live regions, visible focus, and i18n-ready strings (`public/_locales`).

## Build and load unpacked
```
npm install
npm run build
```
1. Open `chrome://extensions` and turn on **Developer mode**.
2. Click **Load unpacked** and choose the `.output/chrome-mv3` folder. After a rebuild, click **Reload** on the card and refresh the chat tab.
3. Open a conversation, click the Convo Keeper icon (or press `Alt+Shift+E`) and pick a format. For PDF, choose **Save as PDF** in the print dialog.

## Development
- `npm run check` runs typecheck, lint (which also forbids `fetch`/`XMLHttpRequest`/`WebSocket`) and tests (vitest + jsdom).
- `npm run icons` re-renders the icon PNGs from `assets/icon/*.svg`.
- `npm run dev` starts WXT dev mode.

## Permissions
| Permission | Why |
|---|---|
| `activeTab` | Temporary access to the current tab, only after you click the extension or press its shortcut. |
| `scripting` | Injects the bundled read-only reader (`extract.js`) into that tab. |
| `storage` | Saves your settings locally, and hands the conversation to the print page for PDF (session storage, deleted right after). |

No host permissions, no content scripts, no `downloads` (files are saved through a local blob link) and no `clipboardWrite` (copying happens inside the popup right after your click, which Chrome allows without it). The extension pages' CSP sets `connect-src 'none'`, and exported HTML files carry `default-src 'none'`.

## Architecture
- `src/adapters/<site>.ts`: one DOM reader per site behind `SiteAdapter` (`src/types.ts`), with fallback selectors, plus streaming, model, conversation-URL and visible-count hooks. A site redesign breaks only its reader.
- `src/adapters/common.ts`: shared handling for thinking, attachments, artifacts, images and hidden branches. It always works on a clone of the page, never the live DOM.
- `src/collect.ts`: the scroll collector for virtualized lists. `src/extract.ts`: streaming wait, self-check and errors.
- `src/markdown.ts`: HTML to Markdown (math, tables, code). `src/export/*`: Markdown, text, HTML/PDF, JSON.
- `entrypoints/`: popup, options, print page and the injected `extract` script.
- `tests/`: hand-written synthetic fixtures modeled on each site's structure (no real user data).

Docs: [SCHEMA](docs/SCHEMA.md) · [PRIVACY](docs/PRIVACY.md) · [STORE_LISTING](docs/STORE_LISTING.md)

## Clean-room note
Written from scratch. No code, assets or text were taken from other chat exporters.

## Contributing

Issues and pull requests are welcome, including new site readers and fixes when a chat site changes its layout. Please run `npm run check` (typecheck, lint and tests) before opening a PR, keep test fixtures synthetic (no real conversations), and keep the extension offline: no network calls, no telemetry. To report a security or privacy problem, see [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE), Copyright (c) 2026 499Apps. Third-party notices are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
