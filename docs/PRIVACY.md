# Convo Keeper Privacy Policy

_Effective: October 2026_

Convo Keeper exports the conversation open in your current browser tab to a file on your computer. It works entirely on your device.

## What we collect
Nothing. No servers, accounts, analytics or telemetry. The extension makes no network requests, and its content security policy blocks them (`connect-src 'none'`). No remote code is loaded.

## What the extension reads
Only when you click an export button, it reads the conversation shown in the active tab on ChatGPT, Claude, Gemini or Grok, and turns it into a Markdown, JSON or printable (PDF) file that you save. For PDF, the conversation is held briefly in the browser's in-memory session storage so the print page can render it, then removed.

## Sharing
We never sell, transfer or share data; none leaves your device.

## Permissions
- `activeTab`: access to the current tab only after you click the toolbar button.
- `scripting`: run the bundled reader in that tab to collect the visible messages.
- `storage`: pass the conversation to the local print page for PDF export (session storage, cleared after use).

A copy of this policy ships inside the extension as `privacy.html`.
