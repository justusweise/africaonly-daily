# AfricaOnly Daily

A deterministic daily automation that scrapes the 2 latest videos from [AfricaOnly.tv](https://africaonly.tv) (YouTube channel `@africaonlytv`), updates a persistent Next.js website, deploys it to Vercel, and reports the result.

## How it works

1. `lib/scraper.ts` fetches and parses the YouTube channel RSS feed.
2. The automation (`automation/index.js`) writes the 2 newest videos to `public/videos.json` in the GitHub repository.
3. The GitHub push to `main` triggers Vercel to rebuild the static site.
4. `app/page.tsx` reads `public/videos.json` at build time and renders the video cards.

## Local development

```bash
npm install
npm run scrape      # fetches the latest 2 videos
npm run build       # static export to dist/
```

## Manual update + deploy

```bash
export GITHUB_TOKEN=...
export VERCEL_TOKEN=...
npm run update-site
```

## JMW automation

The included `automation/` package is uploaded as a JMW automation with entrypoint `index.js` and a daily cron trigger at 09:00 UTC.
