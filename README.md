# TuitionGuard — Safe Cross-Border Tuition Payments

**FinTechathon International Track — Topic C Prototype**  
Autonomous Bounded Financial Agent with Deterministic Policy Enforcement, Living Reserve Protection, and Multi-Field Provider Reconciliation.

---

## 🚀 Quick Start on Windows

1. Ensure **Node.js 22+ or 24** is installed.
2. In the `TuitionGuard` directory, run:

```powershell
pnpm install --frozen-lockfile
pnpm dev:demo
```

3. Open **http://127.0.0.1:5173** in your browser. (Press `Ctrl+C` in terminal to stop).
   - If port 5173 is occupied, run: `pnpm dev:demo --port 5174`.
   - The interactive reviewer demo works completely offline and locally without requiring database setup or external accounts.

---

## 🌟 Key Architecture & Capabilities

TuitionGuard is designed to protect international students against fraudulent remittance scams, hidden FX fees, and tuition payment failures:

- **Dual-Mode Agent Architecture**:
  - **Deterministic Policy Mode (Default)**: Strict financial rules enforcing recipient registry checks, per-channel limits (10,000 CNY wallet caps), and living budget protection without risk of LLM hallucinations.
  - **Live Groq AI Agent Mode (Optional)**: Bounded tool-calling agent using Meta's `llama-3.3-70b-versatile` on Groq to parse unconstrained invoice formats and extract structured payment terms with real-time latency and token telemetry.
- **Living Reserve Protection**: Guarantees that essential student living budgets are safeguarded before any cross-border tuition debit can be approved.
- **6 Cross-Border Currency Directions**: Full simulation coverage across **VND, CNY, and USD** with real-time spread and fee transparency.
- **Human-in-the-Loop Approval**: Exact-term plan hash, 5-minute cryptographic expiry, and mandatory user authorization.
- **8-Field Provider Reconciliation**: Post-payment verification against provider receipts—settling once on matching terms, freezing funds on discrepancies, and releasing holds upon provider rejection.
- **Trilingual & Adaptive UI**: English (Default), Chinese (中文), and Vietnamese (VI), with automatic Light / Dark mode themes.

---

## 🛠️ Verification & Build Commands

```powershell
pnpm typecheck       # Run TypeScript compiler checks (tsc --noEmit)
pnpm test            # Run synthetic regression test suite
pnpm build:demo      # Compile production demo bundle into dist-demo/
pnpm preview:demo    # Preview compiled bundle at http://127.0.0.1:4173
```

- A standalone single-file HTML preview is also available at `public/tuitionguard-offline.html` for offline presentation without Node.js runtime.

---

## 📂 Source Code Structure

- **`app/`**: Next.js / Vite React application components:
  - `judge.tsx`: Public reviewer simulator with multi-currency corridors and guided risk scenarios.
  - `ai-connection.tsx`: Dual-mode Groq AI connection and real-time token/latency telemetry suite.
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
