# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Commands

- `npm start` — Vite dev server at http://localhost:3000
- `npm test -- --run` — run tests once (`npm test` watches in a terminal, runs once in CI)
- `npm run build` — production build in `build/` (`npm run preview` serves it)
- `npm install` — after changing dependencies (`.npmrc` sets `legacy-peer-deps`)

## What this is

**Teamline** (repo and package are still named `timetosync`): a client-only React app for a small remote team. Two pages:

- **Timeline** (`src/pages/Timeline.js`) — headline naming who is at work, teammate cards by role or by local time, and the world map.
- **Scheduler** (`src/pages/Scheduler.js`) — pick people, drag a time range on a shared 24-hour grid; the headline gives the verdict. People and the picked range are kept in the URL.

There is no backend and no runtime request to another origin.

## Layout

- `index.html` — the page Vite builds from (project root); `public/` is copied as is
- `vite.config.mjs` — build and test config; `.js` files are compiled as JSX
- `src/App.js` — routes inside `ThemeProvider` and `Layout`
- `src/components/layout.js` — page shell: sidebar (desktop), top bar and tab bar (phone), global tooltip layer
- `src/components/sidebar.js` — `Sidebar`, `TabBar`, `MobileBar`
- `src/components/theme-provider.js` — light / dark / system; `public/theme-init.js` applies it before first paint
- `src/components/teammate-tile.js` — one teammate card
- `src/components/contact-handle.js` — `ContactHandle`, `PlatformBadge` (Telegram, Slack, X)
- `src/components/avatar.js` — `Avatar`, `Facepile`
- `src/components/presence.js` — the "N working" pill
- `src/components/WorldMap.js` — solid-country map, night shade, pins, Everyone / Working / Off filter
- `src/components/time-select.js` — the Scheduler's time menus (custom listbox)
- `src/components/tooltip.js` — one styled tooltip for any element with `data-tip`
- `src/components/icons.js` — filled navigation glyphs and the shared lucide icon settings
- `src/components/motion.js` — enter/exit and swap helpers (`usePresence`, `useListPresence`, `Swap`) and the sliding thumb of segmented controls (`useThumb`)
- `src/lib/time.js` — minute clock (`useNow`), offsets, `Intl` formatting (times, hours, numbers, name lists, "All day"), the time-of-day surface (`surfaceFor`)
- `src/lib/ranges.js` — the Scheduler grid's slot ranges: joining runs, keyboard steps
- `src/data/teammates.js` — the roster

## Design rules

The look is Apple World Clock. The rules are written at the top of `src/index.css`; the short version:

- System font; times in large, light, tabular numerals. No monospace.
- A surface's lightness is the local time of day there (night, dawn or dusk, day).
- Orange (`now`) only for the current time and what the user has picked. Green (`positive`) only for "in working hours". A moon marks someone who is off.
- No per-role colours, no emoji as icons. Navigation uses the filled glyphs in `icons.js`; other icons come from `lucide-react` with `utilityIcon`.
- Nested corners are concentric: outer radius = inner radius + the gap between them. Note `rounded-lg` is 12px here (`--radius`), so nested shapes use explicit values such as `rounded-[10px]` / `rounded-[7px]`.
- Nothing pops: things that appear or resize get a transition (use the helpers in `motion.js`); `prefers-reduced-motion` is honoured globally. A theme change repaints in one frame (`theme-provider.js` turns transitions off for that one style change).
- Small controls keep their look but get a 24px tap target (44px on touch) with the `hit-target` class.
- Use `data-tip` for tooltips, never `title`.
- Lead with the verdict in plain words; say what a number is.

## Security and privacy

- Never commit secrets. There is no `.env` file; the build needs none. Scan before committing.
- Keep everything same-origin: `netlify.toml` sets a strict Content-Security-Policy (`script-src 'self'`, `connect-src 'self'`). A new CDN, font host or API needs that policy updated deliberately.
- No inline `<script>` in `index.html` (the CSP forbids it). Vite emits external module scripts only; `theme-init.js` stays a plain external script so it runs before first paint. Source maps are off in `vite.config.mjs`.
- External links use `target="_blank"` with `rel="noopener noreferrer"`.
- Teammate names and handles in the roster are invented placeholders.

## Tests

Vitest with jsdom, configured in `vite.config.mjs` (globals on, so tests use `test` and `expect` without imports). `src/setupTests.js` adds the jest-dom matchers. Time maths is covered in `src/lib/time.test.js`, the grid's range logic in `src/lib/ranges.test.js`.

## Deployment

Netlify, configured in `netlify.toml` (build command, SPA redirect, security headers, long-lived caching for fingerprinted assets in `/static/`).
