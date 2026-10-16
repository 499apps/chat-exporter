# JSON export schema (v1)

```jsonc
{
  "schema": "convo-keeper/conversation",
  "schemaVersion": 1,
  "source": { "site": "chatgpt|claude|gemini|grok", "siteName": "ChatGPT", "url": "https://…", "title": "…" },
  "exportedAt": "2026-10-16T22:00:00.000Z",          // ISO 8601, UTC
  "messages": [
    {
      "index": 0,                                       // order in the conversation
      "role": "user | assistant | system",
      "content": "Markdown text; code as fenced blocks",
      "timestamp": "ISO 8601 or null",                  // only when the page shows one
      "codeBlocks": [ { "language": "python or null", "code": "exact code text" } ]
    }
  ]
}
```

Type definitions: `src/types.ts`. Breaking changes bump `schemaVersion`.
