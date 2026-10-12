# TuitionGuard — Security Self-Assessment

**FinTechathon · Topic C · Updated 10 October 2026**  
**Assessment type:** developer self-assessment; not an independent audit, penetration-test report, banking certification or regulatory approval.

## 1. Executive conclusion

TuitionGuard is suitable for demonstrating payment decision controls with synthetic data. It is **not approved or assessed as ready for real-money operations or real student data**. The public reviewer demo is intentionally editable browser software. Its simulated sign-in, approval and receipts do not establish identity, email ownership or production payment security.

The application contains two separate environments. Their controls and test results must not be conflated.

| Environment | Purpose and trust boundary | Data and authentication |
|---|---|---|
| Public homepage and offline HTML | Browser-only, rule-based simulation; supports six directions among VND, CNY and USD | Anyone can review. Session wallets, invoices, transfers and demo accounts stay in page memory. Reload clears them. |
| `/lab` and authenticated APIs | Retained server/D1 sandbox; VND → CNY and optional bounded Groq agent | Server requires Sites-injected identity and scopes records to that identity. Demo login does not authenticate these APIs. |

The public Site audience permits anonymous access to the homepage; this does not remove API authentication requirements. Anonymous account access was rejected in the built Worker tests.

## 2. Assets, actors and permissions

| Actor / operation | Public reviewer demo | Authenticated server sandbox |
|---|---|---|
| Anonymous reviewer | View examples, edit synthetic invoices, simulate approval and reconciliation, export local evidence | No access to owner account APIs without identity |
| Demo registered user | Same simulator permissions as any reviewer; registration is presentation only | No additional rights |
| Signed-in server user | May still use public simulation | Plan, approve and reconcile own sandbox transactions |
| AI / scripted agent | Scripted planning and evaluation only; no LLM runs | Optional Groq tools restricted to reading/extraction, verification, quotes and policy evaluation |
| Payment approval | Explicit UI confirmation; client checks may be modified by the visitor | Server checks authenticated ownership, approved terms, expiration, session generation and available funds |
| Reset / receipt correction | Synthetic session reset or simulated correction only | Explicit current-session sandbox actions; not real refunds or dispute handling |

## 3. Public demo security and limitations

| Risk | Implemented behavior | Residual risk / classification |
|---|---|---|
| Demo login mistaken for real verification | Prominent no-email/no-real-account notice, fictional email default, session-only registration | **High if reused in production.** Email ownership is not verified. No real authentication claim. |
| OTP abuse | Six-digit displayed demo code, two-minute expiry, five failed attempts, new-code flow | Code is visible and browser-controlled. Random generation and retry controls are demonstration logic, not security controls against attackers. |
| Manipulated balances or approvals | Exact-plan snapshot, expiry, budget and duplicate checks in simulator | **High if trusted externally.** DevTools can modify state and code; no server enforcement in public mode. |
| Forged payment evidence | Exports label browser simulation and mark authored examples | JSON is editable and unsigned. It must not be accepted as proof of funds, payment or identity. |
| Confusing samples with actual usage | Examples separated from session transfers and marked read-only | Examples are authored fixtures, not customer transactions or survey outcomes. |
| Misrepresenting wallet limits | 10,000 CNY per-transfer threshold labeled as a survey-inspired assumption | Not independently verified as a WeChat Pay / Alipay rule; no integration with either platform. No instruction to split payments to bypass limits. |
| Misrepresenting AI performance | Seven evaluation cases labeled scripted deterministic simulation | Results measure simulator behavior, not LLM accuracy, robustness, token usage or real-world safety. |
| Network / account dependency for reviewers | Standalone offline HTML contains scripts, styles and translations | Download integrity and browser/device security remain dependencies. Mainland-China reachability is unverified. |
| Resource abuse | Public computation runs in each visitor's browser; no email delivery or AI API calls | No production anti-abuse guarantee. Server sandbox rate limiting remains a separate gap. |

## 4. Data handling and privacy

- Public demo registration uses name and email in page memory. The application does not send these fields to an email service or account backend. Use fictional data. The browser/device itself remains outside this guarantee.
- Language and theme preferences are stored in localStorage. Account registration, login, balances and session transactions are not persisted there by the public demo.
- User-triggered JSON exports and the offline file can remain on the user's device until deleted. Browser reload does not delete downloaded files.
- Public demo data is separate from D1 records. Logging into the demo does not log into `/lab`; changing public wallets does not change server balances.
- In `/lab`, invoices and simulated transaction records are persisted under the authenticated user. Optional AI requests transmit relevant text and the user-provided API key through the Worker to Groq. The application does not persist that key to D1 or browser storage.
- Server session reset archives earlier receipts; it is not erasure. A user-facing retention/deletion workflow has not been implemented. Do not upload real student documents, bank details or confidential information.

## 5. Verification evidence

| Suite | Recorded result | What this does NOT prove |
|---|---|---|
| Public simulator engine | 52 assertions; six currency directions | Browser visual quality, tamper resistance, real payment safety |
| Wallet threshold | 8 boundary checks across VND/USD → CNY | Official wallet limits or account eligibility |
| Scripted agent evaluation | 7 expected/observed checks | Live AI performance or adversarial-model resistance |
| Demo authentication | 10 assertions for registration/login, wrong code, expiry and lockout | Real email delivery, email ownership or secure authentication |
| Built Worker / local D1 | 15 recorded checks from the preceding public-demo build | Current deployed end-to-end browser validation or real bank connectivity |
| Earlier server regression / API / mocked agent | 37 regression checks, 46 handler checks, 8 mocked-agent checks | Independent audit, exhaustive coverage or current live-Groq validation |

Reproduction commands:

```text
node --experimental-strip-types tests/judge-engine.mjs
node --experimental-strip-types --loader ./tests/loader.mjs tests/judge-limit-ai.mjs
node --experimental-strip-types tests/demo-auth.mjs
node tests/run-all.mjs
node tests/worker.mjs
```

Worker tests require a built app and local D1 test infrastructure. Reports are not a cumulative certification score. Direct browser interaction, an independent security review, live AI attack testing and a mainland-China network test remain outstanding.

## 6. Production blockers and proposed mitigations

| Priority | Required before any real-data / real-money pilot |
|---|---|
| P0 | Replace simulated identity with a reviewed authentication provider and actual email verification; enforce authorization on all private operations. |
| P0 | Move all authoritative balances, approval state and payment checks to a server. Do not trust browser-generated receipts or approval flags alone. |
| P0 | Contract an appropriate authorized payment partner; implement authenticated provider callbacks, provider-side idempotency and independent reconciliation. |
| P0 | Review jurisdiction-specific payment, privacy and cross-border requirements with qualified partners; do not infer compliance from this prototype. |
| P1 | Add tested rate limits, abuse controls, secret management, monitoring, alerting and incident procedures. |
| P1 | Implement data minimization, retention, deletion, backups and recovery testing. |
| P1 | Perform independent security and browser testing, including ownership isolation, concurrency, malicious invoices and dependency review. |

**Disclosure:** No independent auditor, compliance officer or payment partner has signed off this assessment. The remaining server-specific controls below are implemented prototype mechanisms with the stated limits.

---

# Authenticated server sandbox: detailed controls
Scope: sandbox prototype. This is an engineering self-assessment, not an external security audit or regulatory approval.

## Permission tiers and enforcement
| Tier | Actor | Allowed operations | Enforcement |
|---|---|---|---|
| 0 — Read | Authenticated student | Own account, transaction and provider receipt | Owner filters on every database lookup |
| 1 — Plan | Bounded agent | Extract, verify, quote and evaluate | Four-tool allowlist, dependency checks, deterministic policy gate |
| 2 — Approve | Authenticated student | Approve exact payment terms | UI confirmation, server approval flag, plan hash, expiry, generation and reserve checks |
| 3 — Reconcile | Authenticated student invoking service | Compare an existing receipt; settle, release or hold | Separate simulated provider ledger; terminal-state conditions; transactional D1 batch |
| Sandbox control | Authenticated student | Reset demo session; confirm demo receipt correction | Explicit confirmation; current generation; mismatch scenario and REVIEW_REQUIRED checks |

Tiers describe operation permissions, not separate production personnel roles. This MVP has no banking operator, sanctions reviewer or compliance officer role. The LLM receives no Tier 2, Tier 3 or sandbox-control tool.

## Threats and controls
| Threat | Implemented control | Remaining risk |
|---|---|---|
| Invoice prompt injection | Untrusted-data instruction, strict tool allowlist and deterministic financial policy | Live-model robustness is unmeasured; prompts are not a security boundary |
| Model invents invoice fields | Missing-field validation, literal source checks for invoice ID/student reference/recipient, directory match and exact-term human review | Literal occurrence is not semantic proof; amount/deadline extraction still requires human review and adversarial text can contain misleading identifiers |
| Wrong recipient | Exact match of institution/account; receipt recipient comparison | One fictional directory entry; no real verification authority |
| Double payment or retry after timeout | Unique invoice/plan keys and transactional reservations; query existing transfer | Provider-side idempotency with an external bank is not implemented |
| Race between planning and execution | Revalidate balance, reserve, deadline and generation; conditional atomic insert | Arrival estimates remain illustrative and cannot guarantee actual delivery |
| Cross-user access | Authenticated user ID and owner-scoped queries | Trusts Sites identity injection; raw public Worker deployment must add its own authentication |
| Cross-origin write | Reject differing Origin header | Requests without Origin still depend on trusted authentication; no standalone public auth stack |
| Early or mismatched settlement | Separate ledger and eight-field comparison; keep funds reserved | Provider simulator shares application infrastructure; no external receipt signature |
| API key disclosure | Password input, memory-only state, key forwarded per AI request, not stored by app | User browser, transport and Groq remain trust dependencies; users should use restricted disposable keys |
| Audit tampering | Persisted plan fingerprint, timestamps and exportable events | No append-only signed ledger, admin tamper resistance or external timestamping |
| Provider rejection | Release reservation without debit exactly once | No automatic re-payment; manual intervention required |
| Resource abuse | Invoice/file size limits, tool count limits and AI timeout | Production rate limits, quotas and abuse monitoring are not implemented |

## Known scope exclusions
No KYC verification, AML screening, sanctions checks, licensed remittance execution, currency controls, card processing, real escrow, real university validation, scanned PDF OCR, data-retention workflow, formal privacy-impact assessment or penetration test. No claim of compliance with all jurisdictions is made. A production pilot would require an authorized payment partner and jurisdiction-specific legal/compliance review.

## Data handling
Owner-scoped simulated account records, invoices, plans, transaction events and provider receipts are persisted. Browser uploads are parsed client-side; invoice text is sent to the Worker. With Groq enabled, invoice text and grounded planning data are sent to Groq. API keys are not stored in D1 or browser storage. Reset archives prior receipts; it is not data deletion. Do not use real student IDs or banking details in this demo.

## Validation
See route-test-report.json, worker-test-report.json and agent-test-report.json. Adapter tests are not production D1 tests. Local Worker tests validate the built runtime with local D1. Mocked model tests do not establish live Groq attack resistance. Browser visual/interaction QA was unavailable in the authoring environment.

## October review hardening
Unknown/missing receipt status, unknown issuer and invalid receipt timestamps are held for review. Amount parsing rejects malformed grouping, conflicting amount aliases and duplicate canonical JSON fields. Calendar validation rejects impossible dates. Submission checks the exact available balance inside the transactional insert. Reconciliation verifies the persisted session before reporting a terminal result. These controls are covered by a separate regression suite; a passed authored suite does not prove the absence of other defects.

## Financial participant simulation extension
The public AI tab also contains Risk Assessment, Conditional Release and FX Planning simulators. These use authored evidence and an isolated 30,000 CNY case, not real registry data, school credit ratings, live market information, bank escrow or a deployed smart contract. New adverse evidence holds further milestone proposals; releases require evidence, consent, order and explicit human approval. FX reservations require unexpired terms and human approval and disclose falling-rate downside. Logs are editable browser artifacts. No monitoring occurs after the page is closed. Sixteen deterministic assertions cover this module; no live-model performance is claimed. See `financial-participant-blueprint.md` for the walkthrough, architecture and unvalidated business hypotheses.
