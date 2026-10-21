# Third-party notices

Convo Keeper is released under the [MIT License](LICENSE), Copyright (c) 2026 499Apps.

Convo Keeper has **no runtime dependencies**. All of its code, icons and text were written for this project, and the test fixtures are hand-written and synthetic. The only third-party code in the built extension is the small runtime that its build framework adds:

### WXT 0.21.4 and @wxt-dev/browser 0.2.9
- Adds the `browser` API shim and the entrypoint wrappers (for example `defineUnlistedScript`) to the built extension.
- Copyright (c) 2023 Aaron Klinker. MIT License.
- https://github.com/wxt-dev/wxt

## Development-only tools (not shipped)

These are used to build, test and render icons. None of them is included in the published extension:

| Package | License |
|---|---|
| wxt (build tooling) | MIT |
| typescript | Apache-2.0 |
| eslint, @eslint/js | MIT |
| typescript-eslint | MIT |
| vitest | MIT |
| jsdom | MIT |
| @types/node | MIT |
| @resvg/resvg-js (icon rendering) | MPL-2.0 |

The exact versions and the licenses of their transitive dependencies are recorded in `package-lock.json`.

## Trademarks

ChatGPT, Claude, Gemini and Grok are trademarks of their owners. Convo Keeper names them only to say which sites it works with. It is not affiliated with or endorsed by any of them.
