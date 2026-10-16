# Chrome Web Store listing (DRAFT, not submitted)

**Name:** Convo Keeper
**Category:** Productivity
**Price:** Free. No ads, no paid tier, no account.
**Short description (≤132 chars):** Save ChatGPT, Claude, Gemini & Grok chats as Markdown, PDF, HTML, JSON or text. Free, private, 100% on your device.

## Detailed description
Convo Keeper turns the AI conversation in your current tab into a clean file you own, in one click.

**Every format you need**
- Markdown, beautifully styled PDF, self-contained HTML, JSON and plain text
- Copy the whole chat as Markdown in one keystroke

**Complete and faithful**
- Captures long conversations from top to bottom, not just what's on screen
- Keeps code blocks with their language, tables, math/LaTeX, and thinking blocks (optional)
- Marks images, files and artifacts so nothing silently disappears
- Exports only the branch you're viewing when a message was edited
- Warns you if an export looks incomplete, so you can trust what you save

**Yours to control**
- Choose exactly which messages to export
- File-name templates, timestamps, metadata header and four PDF/HTML themes
- Keyboard shortcut (Alt+Shift+E) and one-letter shortcuts in the popup
- Light and dark mode, full keyboard and screen-reader support

**Private by design**
No account, no servers, no tracking and no network access at all. The extension only touches a tab when you use it, and your conversations never leave your device.

Works with ChatGPT, Claude, Gemini and Grok.

## Single purpose
Export the AI chat conversation in the active tab to a local file or the clipboard.

## Permission justifications
- **activeTab:** grants temporary access to the current tab only after the user clicks the extension or presses its shortcut, so the visible conversation can be read. No access to other tabs or sites.
- **scripting:** injects the extension's bundled, read-only extractor into that tab to collect the messages.
- **storage:** stores the user's export settings locally, and passes the extracted conversation to the extension's own print page for PDF export through session storage, which is cleared immediately.
- **Host permissions:** none. **Remote code:** none.

## Data usage disclosures
Collects no user data and transmits nothing. Nothing is sold or transferred to third parties. Not used for creditworthiness or lending.

## Privacy policy URL
TODO: host docs/PRIVACY.md (e.g. GitHub Pages) and paste the URL.

## Screenshot plan (1280×800, light mode unless noted)
1. **Hero:** popup on a Claude conversation, "Claude conversation detected", with the six format tiles (preview: `popup-light-exported.png`)
2. **PDF:** print view with title, model, date, a code block and a table (preview: `pdf-print-view.png`)
3. **Pick messages:** popup in dark mode with the message picker open (preview: `popup-dark-picker.png`)
4. **Settings:** options page with the file-name template and theme cards (preview: `options-page.png`)
5. **Markdown result:** the exported .md open in an editor beside the chat
6. **Privacy:** "Runs only on your device" with no network access, and the unsupported-site state (preview: `popup-unsupported.png`)

Use synthetic demo conversations only, never real user chats.

## Promo assets
- Small tile 440×280: icon on an indigo-violet gradient with "Save any AI chat" (TODO)
- Marquee 1400×560 (optional, TODO)
- Icon 128×128: `public/icon/128.png`
