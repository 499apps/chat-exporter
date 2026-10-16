# Chrome Web Store listing (DRAFT – not submitted)

**Name:** Convo Keeper
**Category:** Productivity
**Short description (≤132 chars):** Save your ChatGPT, Claude, Gemini and Grok chats as Markdown, JSON or PDF. Free, private, works entirely on your device.

## Detailed description
Convo Keeper turns the AI conversation in your current tab into a clean file you own.

- One click: Markdown, JSON or PDF
- Works with ChatGPT, Claude, Gemini and Grok
- Keeps code blocks, lists, tables and headings
- Private by design: no account, no servers, no tracking, no network access at all
- Minimal permissions: it only touches a tab when you click the button

JSON exports follow a documented schema, handy for notes apps, archives and scripts.

## Single purpose
Export the AI chat conversation in the active tab to a local file.

## Permission justifications
- **activeTab**: grants temporary access to the current tab only after the user clicks the extension, so the conversation can be read. No access to other tabs or sites.
- **scripting**: injects the extension's bundled, read-only extractor into that tab to collect the visible messages.
- **storage**: passes the extracted conversation to the extension's local print page for PDF export, using session storage that is cleared immediately.
- **Host permissions:** none. **Remote code:** none.

## Data usage disclosures
Does not collect or transmit any user data. Not sold or transferred to third parties. Not used for creditworthiness or lending.

## Privacy policy URL
TODO: host docs/PRIVACY.md (e.g. GitHub Pages) and paste the URL.

## Screenshots to capture (1280×800)
1. Popup on a ChatGPT conversation showing "Detected: ChatGPT" and the three buttons
2. Exported Markdown open in a text editor
3. PDF print preview of a conversation with a code block
4. JSON export in an editor
5. Popup on an unsupported site showing the error

## Promo assets
- Small tile 440×280 (TODO)
- Icon 128×128: `public/icon/128.png`
