# TuitionGuard — Competition Readiness Review
Review date: 8 October 2026, Vietnam time.
Grounding: contestant-supplied international-topics-rules-en.docx, pages 1–3. This is an engineering and submission review, not a prediction of judges' scores.

## Decision
The project is a credible sandbox prototype for Topic C and is suitable for rehearsal and technical review. The complete competition submission is not yet verified ready: live-model evidence, browser rehearsal, a real demo recording, the team's GitHub URL, reviewer access and registration eligibility remain open.

## Criteria and evidence
| Official criterion | Existing evidence | Assessment and next acceptance gate |
|---|---|---|
| Task completion — 40% | Invoice → four planning tools → verified route → approval → provider ledger → receipt comparison; source and actual local execution logs | Technical workflow demonstrated locally. Run live Groq on varied layouts and record the actual interface end to end. |
| Security & compliance — 30% | Server policy checks, exact-term approval, transactional reservation, duplicate protection, ownership tests, rejection/timeout/mismatch handling, explicit known risks | Stronger engineering evidence after review fixes. No claim of banking compliance. Verify production access, browser behavior and declared limits before submitting. |
| Innovation & interaction — 30% | Lowest eligible cost subject to deadline, recipient and living reserve; explanation of shortfall; recoverable receipt discrepancies | Clear product focus. Differentiation is a hypothesis, not globally novel technology. Validate usefulness and comprehension with consenting students. |

## Defects reproduced and fixed in this review
1. An unrecognized provider status could fall through to SETTLED. It now enters REVIEW_REQUIRED; balance remains unchanged and funds stay reserved.
2. Malformed amount grouping such as 30,00 could be read as 3000. Amount lines now require valid grouping and an unambiguous complete field.
3. Invalid calendar dates such as February 30 could normalize silently. Explicit ISO date, time and timezone validation rejects these inputs.
4. The exact available-balance snapshot was checked before the atomic insert but not inside it. The transactional insert now enforces the same approved snapshot.
5. Reconciliation could report a proposed status even if a concurrent reset prevented persistence. The response now reflects the persisted current-session state or returns an error.
6. Long approval dialogs could exceed a short screen. The approval dialog now scrolls within the viewport; browser visual verification remains pending.

These findings show why the original 100-case pass was not evidence of completeness. The separate review regression suite targets the discovered edge cases and race conditions. See current machine-readable reports for measured counts; do not combine model mocks with live-model results.

## Why use AI if payment rules are deterministic?
The LLM's intended contribution is reading varied invoice layouts and language, identifying missing information and explaining a grounded plan. The deterministic service owns monetary calculation and authorization. To demonstrate that AI adds value, compare extraction on unseen layouts against the fixed-format parser; report field-level exact match, clarification behavior and tool completion. The included 20-layout dataset and live evaluation script support this experiment, but no live score has been measured yet.

## Positioning for judges
“TuitionGuard stages the lowest-cost verified, on-time tuition payment that preserves a student's living budget, then requires a matching provider receipt before confirming settlement.”

Avoid “cheapest transfer in the market”, “fraud-proof”, “fully autonomous banking”, “100% accurate AI”, “first in the world” or “regulatory compliant”. Quotes, accounts and providers are simulated; the provider ledger shares this application's infrastructure.

## Mandatory final rehearsal
- Connect a restricted Groq key in AI Connection; run “Run 4 checks — live Groq agent” and export the results. PASS is computed from the observed orchestrator outcome. These checks do not move funds.
- Run tests/live-groq-evaluation.mjs on the 20 varied authored layouts. Keep failures; do not replace failed cases silently.
- Record normal payment, reserve blocking, timeout recovery and receipt mismatch using the actual UI. Video script is provided; no real recording has been created here.
- Reopen the Site with the reviewer access configuration intended for judging. A private URL alone is not a judge-accessible submission.
- Upload the provided source to the team's GitHub repository and verify the README from a clean checkout.
- Confirm all team members meet eligibility and all submitted materials are in English. Follow the organizer's current submission instructions.

## Recommendation
Finish these acceptance gates before calling the entry submission-ready. After that, prioritize a small consented usability study and a reproducible live-model comparison over adding unrelated features. There is no defensible guarantee of reaching the finals or winning.
