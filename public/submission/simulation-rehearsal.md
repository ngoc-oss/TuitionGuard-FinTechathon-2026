# TuitionGuard — guided simulation rehearsal

Use Payments and choose a scenario. Confirm Start scenario. This resets only sandbox funds, archives previous receipts, clears the in-memory AI key and selects rule-based simulation. No live AI or bank transfer is claimed.

1. Safe payment: Analyze → Review & approve → check exact terms → approve → reconcile. Expect SETTLED and one debit.
2. Insufficient reserve: Analyze. Expect blocked routes and no transfer.
3. Unverified recipient: Analyze. Expect recipient rejection and no transfer.
4. Delayed settlement: Analyze and approve. First reconciliation remains PENDING; second settles the same transaction.
5. Receipt mismatch: Analyze and approve. Reconcile → REVIEW_REQUIRED. Funds stay reserved. Confirm sandbox receipt correction, then reconcile again. This correction button is a simulator control, not a production dispute process.
6. Timeout recovery: Analyze and approve. Reconcile the existing recorded transfer. Do not create another payment.

Plans expire after five minutes. The interface displays a countdown and disables expired approval. Analyze again for new terms. Restart a scenario before repeating an invoice that has already been submitted.

Export decision evidence and the final receipt. Previous sessions remain in Transactions but cannot be reconciled against the current sandbox balance.

Suggested five-minute demonstration: safe payment (two minutes), recipient rejection (one minute), mismatched receipt and recovery (two minutes).

Verification: source type-check and automated execution tests; direct browser rehearsal remains required. Optional live Groq checks require a user-supplied key and are distinct from this deterministic simulation.
