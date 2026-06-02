# PlayArcadeX

PlayArcadeX is a fast, SEO-ready browser games platform built with Next.js.

## Features

- PlayArcadeX branding and metadata across all pages
- Starter catalog with 10 GameMonetize games
- SEO-friendly game URLs using slug format
- Responsive UI optimized for desktop and mobile
- Dynamic sitemap and robots generation
- URL-based game search by keyword and category (GitHub Pages compatible)

## Tech Stack

- Next.js 15 (App Router)
- React 19
- TypeScript
- Tailwind CSS

## Local Development

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Build

```bash
npm run build
npm start
```

## Deployment (Vercel)

1. Run local checks:

```bash
npm run deploy:check
```

2. Deploy with Vercel CLI (or push to connected Git repository):

```bash
npx vercel
```

For production deployment:

```bash
npx vercel --prod
```

Important:
- Do not set NEXT_PUBLIC_BASE_PATH for Vercel root-domain deployments. A non-empty base path can break CSS/JS asset URLs and cause 404 errors.

## Deployment (GitHub Pages)

This repository includes an automated workflow: [.github/workflows/deploy-github-pages.yml](.github/workflows/deploy-github-pages.yml)

1. Push to main to trigger deployment.
2. In repository settings, enable Pages and choose GitHub Actions as source.
3. Optional for custom domain:
	- Add repository variable NEXT_PUBLIC_SITE_URL (example: https://playarcadex.com)
	- Add repository variable NEXT_PUBLIC_BASE_PATH (use empty string for root domain)

The workflow builds a static Next.js export and publishes the out folder to GitHub Pages.

## Optional Environment Variables

- NEXT_PUBLIC_GA_ID: Google Analytics measurement ID
- NEXT_PUBLIC_ADSENSE_CLIENT: AdSense client ID (example: ca-pub-xxxxxxxx)
- SITE_URL: Override site URL for sitemap generation
- NEXT_PUBLIC_SITE_URL: Full public URL used for SEO canonical/sitemap (supports GitHub Pages or custom domain)
- NEXT_PUBLIC_BASE_PATH: Base path for static assets/routes on GitHub Pages (example: /repo-name)

## Data Source

Game content is stored in game.json and currently contains 10 games from GameMonetize for initial validation.
