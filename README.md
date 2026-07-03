# PR Dashboard

A personal dashboard to track pull requests across multiple GitHub repositories. Shows PRs that need your review and PRs you've authored, with estimated review time and browser notifications for updates.

## Features

- **GitHub login** via device flow (no backend needed for auth)
- **Track multiple repos** — configurable list stored in your browser
- **"Needs My Review"** — PRs where your review is requested
- **"My PRs"** — PRs you've authored with review status
- **Review status** — shows both your personal review state and overall approvals
- **Estimated review time** — based on lines changed
- **Browser notifications** — polls every 5 minutes and notifies on PR updates

## Setup

### Prerequisites

- Node.js 20.19+ or 22+ (see `.nvmrc`)
- Yarn
- A [GitHub App](https://github.com/settings/apps/new) with device flow enabled
- A [Cloudflare Worker](https://workers.cloudflare.com/) to proxy GitHub OAuth (needed for CORS)

### Local development

1. Clone the repo
2. Copy `.env` to `.env.local` and fill in the values:
   - `VITE_GITHUB_CLIENT_ID` — your GitHub App's Client ID
   - `VITE_AUTH_PROXY_URL` — your Cloudflare Worker URL
3. `yarn install`
4. `yarn dev`

### Deploy to GitHub Pages

1. In your repo settings, go to **Settings > Pages > Source** and select **GitHub Actions**
2. Add repository secrets (**Settings > Secrets and variables > Actions**):
   - `VITE_GITHUB_CLIENT_ID`
   - `VITE_AUTH_PROXY_URL`
3. Push to `main` — the GitHub Actions workflow deploys automatically

### Cloudflare Worker

The `worker/` directory contains a small CORS proxy for GitHub's OAuth device flow endpoints. Deploy it with:

```bash
cd worker
npx wrangler login
npx wrangler deploy
```

## Tech Stack

- React + TypeScript + Vite
- Chakra UI
- GitHub REST API
- Cloudflare Workers (OAuth proxy)
- GitHub Pages (hosting)
