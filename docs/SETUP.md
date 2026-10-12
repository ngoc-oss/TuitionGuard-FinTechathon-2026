# Development setup

This guide covers the local demo and the checks used by continuous integration. The default reviewer demo runs locally without a database, external account, API key, or live payment provider.

## Prerequisites

- Node.js 24 is recommended. The package manifest declares Node.js `>=22.13.0`.
- pnpm 11.25.0, pinned by the `packageManager` field in `package.json`.
- Windows PowerShell, macOS, or Linux terminal.

Check the installed tools:

```powershell
node --version
pnpm --version
```

## Install and run the demo

From the directory containing `package.json`:

```powershell
pnpm install --frozen-lockfile
pnpm dev:demo
```

Open <http://127.0.0.1:5173>. Stop the development server with `Ctrl+C`. If that port is already in use, start Vite on another port:

```powershell
pnpm dev:demo --port 5174
```

The demo uses synthetic accounts, quotes, and provider responses. It does not send or receive real money. The isolated demo does not require the optional Groq AI integration.

## Checks and production preview

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm build:demo
pnpm preview:demo
```

The production preview is served at <http://127.0.0.1:4173> by default. The automated test suite uses Node's built-in type stripping and SQLite support; Node.js 24 is the recommended runtime.

## Optional integrations

The full Next/Cloudflare Worker application and optional AI-backed flows have additional environment and service requirements. Review the architecture and API boundaries in [public/submission/technical-documentation.md](../public/submission/technical-documentation.md) before configuring them. Never commit API keys, database credentials, or production financial data. Use only synthetic data for local development and evaluation.

## Troubleshooting

- **pnpm is unavailable:** Install or enable the pinned pnpm version, then reopen the terminal and check `pnpm --version`.
- **Dependency installation differs from the lockfile:** Use `pnpm install --frozen-lockfile` and avoid manually editing `pnpm-lock.yaml`.
- **A demo port is busy:** Set another port using the Vite option shown above.
- **Tests fail because of Node features:** Use Node.js 24, the runtime used by CI.
