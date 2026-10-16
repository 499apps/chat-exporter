# Convo Keeper Privacy Policy

_Effective: October 2026_

Convo Keeper is a free browser extension that saves the conversation open in your current tab to a file, or copies it to your clipboard. It works entirely on your device.

## What we collect
Nothing. There are no servers, accounts, analytics, ads or telemetry. The extension makes no network requests, and its content security policy blocks them (`connect-src 'none'`). No remote code is loaded.

## What the extension reads
Only when you use it (by clicking the toolbar button or pressing its shortcut, then choosing an action), it reads the conversation shown in the active tab on ChatGPT, Claude, Gemini or Grok. To capture long chats, it may scroll the conversation and then return it to where you were. The text becomes a Markdown, PDF, HTML, JSON or text file that you save, or text on your clipboard.

## What is stored
- **Your settings** (file-name template, content and theme choices) are saved in the browser's local extension storage on your device.
- **For PDF**, the conversation is held briefly in the browser's in-memory session storage so the print page can display it, then deleted.

## Sharing
We never sell, transfer or share data. None of it ever leaves your device.

## Permissions
- `activeTab`: access to the current tab only after you use the extension.
- `scripting`: runs the bundled reader in that tab to collect the visible messages.
- `storage`: saves your settings locally and passes the conversation to the local print page.

A copy of this policy ships inside the extension as `privacy.html`.
