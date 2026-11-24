# Teamline

See what time it is for each teammate, and find a meeting time that works across time zones.

- **Timeline** — who is at work right now, everyone's local time (by role or by local time), their preferred contact handle, and a world map with the night side shaded.
- **Scheduler** — pick people, then drag across the day. It tells you in words whether the time works, who it misses, and what time it is for each person. The plan lives in the URL, so it can be shared.

## Run it

```sh
npm install
npm start        # http://localhost:3000
npm test         # watch mode; add `-- --run` to run once
npm run build    # production build in build/ (`npm run preview` serves it)
```

Requires Node 20 or later.

## The team roster

People are listed in `src/data/teammates.js`: name, role, IANA time zone, display place, avatar, working hours and one preferred contact (`telegram`, `slack` or `twitter`).

The contact handles in the repository are placeholders. Telegram and X handles become live links (`t.me/…`, `x.com/…`), so replace them with real ones before sharing the app.

## How it is built

- React 19 built with Vite, Tailwind CSS, React Router. Tests run on Vitest.
- No backend. Scripts, styles, images and map data are all served from the site itself. The only request to another site is for the photo of your own city in the sidebar, which comes from Wikipedia (no API key; the result is cached in the browser).
- Time maths is in `src/lib/time.js` and uses the browser's `Intl` data, so daylight saving is handled automatically.
- The look (colour tokens, what light and dark surfaces mean) is documented at the top of `src/index.css`.

## Deployment

Configured for Netlify in `netlify.toml`: build command, single-page-app redirect, and security headers (Content-Security-Policy, HSTS, no framing, no MIME sniffing).

The build needs no environment file. Never commit API keys; `.env` and `.env.local` are ignored by git.

## Credits

Brand marks and map data are listed with their sources and licenses in `public/assets/brands/SOURCES.md` and `public/assets/geo/SOURCES.md`.
