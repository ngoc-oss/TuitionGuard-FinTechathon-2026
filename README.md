# TuitionGuard — Safe Cross-Border Tuition Payments

[![CI](https://github.com/ngoc-oss/TuitionGuard-FinTechathon-2026/actions/workflows/ci.yml/badge.svg)](https://github.com/ngoc-oss/TuitionGuard-FinTechathon-2026/actions/workflows/ci.yml)
[![CodeQL](https://github.com/ngoc-oss/TuitionGuard-FinTechathon-2026/actions/workflows/codeql.yml/badge.svg)](https://github.com/ngoc-oss/TuitionGuard-FinTechathon-2026/actions/workflows/codeql.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![pnpm](https://img.shields.io/badge/pnpm-11.25.0-orange.svg)](https://pnpm.io/)
[![Node](https://img.shields.io/badge/Node.js-%3E%3D22.13.0-green.svg)](https://nodejs.org/)

TuitionGuard is a FinTechathon prototype for planning and reviewing simulated cross-border tuition payments. It combines deterministic financial policy checks, a protected living-expense reserve, human approval, and provider-receipt reconciliation.

**FinTechathon Shenzhen International Track — Topic C Prototype**  
Autonomous Bounded Financial Agent with Deterministic Policy Enforcement, Living Reserve Protection, and Multi-Field Provider Reconciliation.
## Offline Demo
[Open Online Demo](https://ngoc-oss.github.io/TuitionGuard-FinTechathon-2026/)
[Download TuitionGuard HTML Demo](./index.html)

Open the link, click **Download raw file**, then open the downloaded HTML file in Chrome.

The simulation works offline without installation.
Sandbox key, token and latency values are simulated.
Live Groq mode requires internet access and a valid API key.
---

## Requirements

- **Node.js**: 24 (recommended; Node.js `>=22.13.0` is declared in `package.json`)
- **pnpm**: 11.25.0 (the version pinned in `package.json`)
- **Git**: For version control and submission tracking

For detailed installation, troubleshooting, and optional live-AI setup, see [docs/SETUP.md](./docs/SETUP.md). Contribution workflow and quality checks are in [CONTRIBUTING.md](./CONTRIBUTING.md).

## 🚀 Quick Start on Windows

From the project root (`TuitionGuard`), run:

```powershell
pnpm install --frozen-lockfile
pnpm dev:demo
```

- Open **http://127.0.0.1:5173** in your browser. (Press `Ctrl+C` in terminal to stop).
- If port 5173 is occupied, run: `pnpm dev:demo --port 5174`.
- The interactive reviewer demo works completely offline and locally without requiring database setup or external accounts.

---

## 🌟 Key Architecture & Capabilities

TuitionGuard is designed to protect international students against fraudulent remittance scams, hidden FX fees, and tuition payment failures:

- **Dual-Mode Agent Architecture**:
  - **Deterministic Policy Mode (Default)**: Strict financial rules enforcing recipient registry checks, per-channel limits (10,000 CNY wallet caps), and living budget protection without risk of LLM hallucinations.
  - **Live Groq AI Agent Mode (Optional)**: Bounded tool-calling agent using `openai/gpt-oss-120b` (Groq's recommended replacement after `llama-3.3-70b-versatile` was shut down on 16 August 2026) on Groq to parse unconstrained invoice formats and extract structured payment terms with real-time latency and token telemetry.
- **Living Reserve Protection**: Guarantees that essential student living budgets are safeguarded before any cross-border tuition debit can be approved.
- **6 Cross-Border Currency Directions**: Full simulation coverage across **VND, CNY, and USD** with real-time spread and fee transparency.
- **Human-in-the-Loop Approval**: Exact-term plan hash, 5-minute cryptographic expiry, and mandatory user authorization.
- **8-Field Provider Reconciliation**: Post-payment verification against provider receipts—settling once on matching terms, freezing funds on discrepancies, and releasing holds upon provider rejection.
- **Trilingual & Adaptive UI**: English (Default), Chinese (中文), and Vietnamese (VI), with automatic Light / Dark mode themes.

---

## 🛠️ Verification & Build Commands

```powershell
pnpm lint            # ESLint checks
pnpm typecheck       # TypeScript checks (tsc --noEmit)
pnpm test            # Synthetic regression test suite
pnpm build:demo      # Compile the demo into dist-demo/
pnpm preview:demo    # Preview the production bundle at http://127.0.0.1:4173
```

- A standalone single-file HTML preview is also available at `public/tuitionguard-offline.html` for offline presentation without Node.js runtime.
- GitHub Actions runs lint, typecheck, tests, and the demo production build for pushes and pull requests. CodeQL and dependency review provide additional security checks.

---

## 📂 Source Code Structure

- **`app/`**: Next.js / Vite React application components:
  - `judge.tsx`: Public reviewer simulator with multi-currency corridors and guided risk scenarios.
  - `ai-connection.tsx`: AI Connection panel. Runs the bounded four-tool agent (`lib/agent.ts`) on four synthetic cases, either deterministically (no model) or with the viewer's own Google Gemini or Groq key (real tool calling). PASS, latency, model calls, tokens and tool trace come from the actual run (`lib/ai-live-check.ts`, tested by `tests/ai-live-check.mjs`).
  - `participant-agents.tsx`: Autonomous Risk, FX, and Conditional Release milestone escrow agents.
  - `workspace.tsx`: Authenticated student workspace.
- **`lib/`**: Core financial engine, reconciliation state machine, deterministic policies, and i18n dictionaries.
- **`public/submission/`**: Competition submission artifacts:
  - `technical-documentation.md`: System architecture, algorithms, and API specifications.
  - `security-self-assessment.md`: Threat models, permission tiers, and privacy self-assessment.
  - `submission-checklist.md`: International track compliance checklist.
  - `execution-evidence.json`: Machine-readable test run verification logs.
- **`tests/`**: Synthetic benchmark evaluation cases, SQLite adapters, and automated regression suites.

---

## 🛡️ Security & Privacy Boundary

- **Memory-Only API Keys**: Any Groq API keys entered in the AI Connection tab remain exclusively in volatile browser memory and are wiped upon page reload. Keys are never saved to disk, databases, or Git history.
- **Simulated Financial Environment**: All provider quotes, accounts, and bank ledgers are sandbox simulations designed for competitive demonstration. No live banking rails or real funds are transacted.
- **Vulnerability reports**: Please do not disclose security issues publicly before maintainers have had a chance to assess them. See [CONTRIBUTING.md](./CONTRIBUTING.md) for reporting guidance.

## License

This project is licensed under the [MIT License](./LICENSE).
