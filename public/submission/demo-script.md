# TuitionGuard — Demo Recording Script
Target duration: 4 minutes 40 seconds. English narration. Record the real deployed interface; this script is not a completed demo video.

00:00–00:25 — Problem and boundary
“TuitionGuard helps an international student pay tuition on time while preserving living expenses. This demonstration uses simulated VND funds and CNY tuition. No real bank transfer occurs.”

00:25–01:20 — Safe planning
Choose Safe payment, confirm reset and analyze the example. Open tool events.
“The workflow reads the invoice, verifies the recipient, obtains quotes and checks payment policy. The cheaper 72-hour route misses the 48-hour deadline. The selected route costs 105,625,000 VND and leaves 19,375,000 VND, above our 18,000,000 VND reserve.”
If no Groq key is present, explicitly say: “This is the deterministic tool workflow. Live model operation is a separate optional mode.” Never call this fallback a live AI agent.

01:20–02:10 — Approval and timeout recovery
Review recipient, student reference, delivered amount, debit and reserve. Select Timeout after provider acceptance. Confirm approval and submit. Show UNKNOWN receipt; reconcile it.
“The LLM has no payment tool. The student approves exact terms. A timeout does not mean the provider failed. We query the existing receipt and settle once, rather than paying again.” Export the receipt.

02:10–02:45 — Reserve protection
Choose Insufficient reserve, confirm reset and analyze.
“Payment is blocked. The interface explains the exact additional amount required. It never reduces the protected reserve automatically.”

02:45–03:35 — Receipt discrepancy
Choose Safe payment again. Analyze, approve and choose Receipt amount differs. Reconcile.
“The provider ledger reports 29,999 CNY, while approval requires 30,000. The transfer enters REVIEW_REQUIRED; the posted balance is unchanged and funds remain reserved.” Show provider receipt comparison.
Optionally confirm sandbox correction and reconcile again. State that correction is a simulation control and not a production bank permission.

03:35–04:15 — Evaluation and evidence
Open Evaluation and load measured results. Show synthetic benchmark and separated adapter, Worker and mocked-model test results. Download technical documentation and security assessment.
“These results describe synthetic cases and local execution, not real-world fraud accuracy or live-model reliability.”

04:15–04:40 — Contribution and next validation
“Our contribution is a bounded financial participant that combines deadline, recipient, living reserve and receipt verification. Next validation requires live Groq testing, student usability feedback and an authorized payment sandbox partner.”

## Before recording
Use synthetic data; enter any disposable Groq key before recording and keep the AI connection screen hidden. Rehearse once. Confirm reviewers have authorized access or can reproduce from source. A video must show actual UI execution; do not present generated screenshots or illustrated slides as a screen recording.
