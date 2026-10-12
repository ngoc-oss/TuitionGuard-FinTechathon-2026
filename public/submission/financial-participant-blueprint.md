# TuitionGuard — AI as a Financial Participant

## Competition positioning
TuitionGuard demonstrates a participant that reacts to evidence, proposes bounded financial actions, requests specific human authority, and records the outcome. The present implementation is scripted simulation. It does not demonstrate a live model's independent understanding or a production financial service.

## Core reviewer story (about three minutes)
1. On Payments, select Load competition case and Analyze. Show the 30,000 CNY invoice and explicitly assumed wallet cap.
2. Compare the remaining routes: source/destination currency, FX markup, transfer fees, deadline and protected living budget.
3. Select Simulate recipient change. The current payment decision is automatically re-evaluated and all routes are blocked; no transfer is submitted.
4. Select Simulate recipient re-verification. Review the refreshed terms, explicitly approve, then reconcile the existing transfer.
5. Open AI simulation & evaluation. Demonstrate Risk and FX planning, including the downside when future rates fall.
6. Export evidence. Open the collapsed milestone-release extension only if reviewers ask or time allows.

Risk and FX form the core story. Conditional release is a secondary extension requiring a real milestone agreement and payment partner. All verification events are authored simulation controls, not live registry queries. The separate participant-agent case does not debit the Payments wallets and resets when leaving that tab or reloading. No background monitoring runs after closing the page.

## Architecture and permission boundary
- Evidence adapter: four authored fixture records for recipient, license, dispute and freshness. No external registry or legal-history search currently runs.
- Risk evaluator: deterministic ELIGIBLE/HOLD result with attributable reasons. This is transaction due diligence, not a school credit rating or a probability of default.
- Conditional release evaluator: milestone order, evidence, consent, current risk and explicit approval are required. Uncertainty freezes the next release. Already released funds are not automatically recovered.
- FX planner: displays fixed scenario arithmetic, proposal expiry and explicit authorization. No exchange order, forward contract, derivative, actual hedge or market prediction is created.
- Action log: observable evidence events, proposals and approvals. Export is unsigned and editable, not a cryptographic audit record or hidden model reasoning.

A future LLM can extract and explain evidence through bounded tools. It must not overwrite authoritative registry results or grant itself payment authority. RAG would retrieve cited evidence; it would not establish authenticity by itself. Neither a live RAG pipeline nor deployed smart contract is claimed in this module.

## Three-party value hypotheses — to validate
| Stakeholder | Intended value | Proposed validation |
|---|---|---|
| Student / parent | Understand total cost, protect living budget, avoid acting on mismatched recipient evidence | Task completion, comprehension, time to recognize a mismatch |
| University | Clear payment references and milestone expectations, fewer reconciliation disputes | Staff review of evidence packet; reconciliation time in a controlled pilot |
| Authorized payment partner | Structured payment intent, explicit approval and exception routing | Sandbox integration feasibility, exception handling and reconciliation accuracy |

WeBank may be discussed as a potential stakeholder only. There is no claimed partnership, API access, endorsement or commitment. No revenue, user adoption or savings measurements are invented.

Possible business model for validation: institution-paid software subscription plus disclosed integration/support fees. This is a hypothesis; commercial terms, willingness to pay and regulatory scope remain unvalidated. Do not imply hidden FX spread revenue or charge users for a simulated hedge.

## Scope and safety limits
No real licenses, court records, school financial statements, student attendance or grades are fetched. Real milestone payments require verified contractual obligations, evidence provenance, data-use consent and dispute/refund procedures; grades alone must not be treated as sufficient authority. A legal/payment partner must determine whether escrow and FX products are available and appropriate.

Test evidence: 13 interactive deterministic checks, plus 3 additional assertions in `tests/participant-agents.mjs`. These assess authored logic, not live model capability. Independent security review, real user research and China-network/browser testing remain outstanding.
