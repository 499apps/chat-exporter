# JSON export schema (v2)

```jsonc
{
  "schema": "convo-keeper/conversation",
  "schemaVersion": 2,
  "source": {
    "site": "chatgpt|claude|gemini|grok",
    "siteName": "Claude",
    "url": "https://…",
    "title": "…",
    "model": "model name shown on the page, or null"
  },
  "exportedAt": "2026-10-16T22:00:00.000Z",           // ISO 8601, UTC
  "messages": [
    {
      "index": 0,                                        // position in the full conversation (kept when exporting a selection)
      "role": "user | assistant | system",
      "content": "Markdown; code as fenced blocks, math as $…$ / $$…$$, placeholders like [Image: alt]",
      "timestamp": "ISO 8601 or null",                   // only when the page shows one and timestamps are enabled
      "codeBlocks": [ { "language": "python or null", "code": "exact code text" } ],
      "thinking": "visible reasoning as Markdown, or null",
      "attachments": [ { "kind": "image | file | artifact", "name": "string or null", "alt": "string or null" } ]
    }
  ],
  "warnings": [ "self-check notes, e.g. a possibly incomplete export" ]
}
```

Type definitions are in `src/types.ts`. **Changes from v1:** added `source.model`, `messages[].thinking`, `messages[].attachments` and `warnings`. Breaking changes bump `schemaVersion`.
