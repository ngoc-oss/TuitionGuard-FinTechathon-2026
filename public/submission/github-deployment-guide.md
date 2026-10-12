# Source and deployment guide

## GitHub handoff on Windows
Download tuitionguard-source.zip and extract it. Open the folder in VS Code. Create an empty repository under your own GitHub account, then use its exact URL:

```powershell
git init
git add .
git commit -m "TuitionGuard competition prototype"
git branch -M main
git remote add origin https://github.com/YOUR-ACCOUNT/YOUR-REPOSITORY.git
git push -u origin main
```

Do not commit `.env`, API keys, `.git` credentials, node_modules, local account databases or generated test state. The provided source archive excludes these items. Configure repository visibility deliberately so judges can access it.

## Install and verify
Use Node 24 for the built-in SQLite adapter tests. Install the package manager pinned by package.json using Corepack or your normal pnpm installation, then install from the lockfile.

```powershell
corepack enable
pnpm install --frozen-lockfile
node tests/run-all.mjs
pnpm build
node --experimental-strip-types tests/worker.mjs
```

The build uses a Cloudflare-compatible Vinext starter. The source archive includes its runtime helper scripts and environment stub. Worker runtime tests use local Miniflare D1. API handler tests use a separate in-memory SQLite adapter.

## Running elsewhere
Sites deployment owns the private sign-in boundary and D1 binding. For a separate Cloudflare account, supply your own Wrangler configuration, D1 database and migrations; add real authenticated middleware before exposing APIs. Never trust `oai-authenticated-user-id` supplied directly by a public client. Replace the Site-specific .openai/hosting.json project ID when creating a different project. This source is not a standalone bank integration.

## Third-party dependencies
Review third-party-dependencies.json and upstream licenses before redistributing. Original team code has no automatically selected open-source license; choose one as a team. The dependency inventory is an aid, not a legal audit.
