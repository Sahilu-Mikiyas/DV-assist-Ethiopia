# Phase 9 — Service-fee tracking and failure handling

**Implementation status (October 17, 2026):** The fictional staff demo now illustrates separate service-fee statuses, a placeholder Telebirr reference, and exception/refund states. No payment is initiated, provider lookup is performed, money is reconciled, or receipt issued. The authenticated API does not yet store payment ledgers. Do not use this demo for real payments.

## Demo ledger

- Service fee is labeled as an example 1,500 ETB package; price remains a pilot hypothesis.
- Payment state is separate from case status and always labeled as a service fee, not a government fee.
- Fictional states cover not requested, pending verification, demo-verified, mismatch, refund pending, refunded, and unable to complete.
- Reference input is clearly marked fictional and limited to local demo state; never enter an actual transaction reference here.
- Mismatch/refund/unable-to-complete states display a reminder that a real transaction must be checked against the provider record, and fee state does not mean a DV entry was submitted.

## Required production ledger design

- Persist immutable payment events with case, amount/currency, method, reference fingerprint or minimized reference, actor, outcome, verification time, receipt ID, and any reversal/refund link.
- Make verification an authorized staff action based on the provider/business transaction record, with duplicate-reference controls and idempotency.
- Keep service fee and official government fees as different records, UI, receipts, reconciliation reports, and permissions. This service does not take custody of government fees in the current product scope.
- Never request PINs, passwords, OTPs, account credentials, or full banking records. Collect screenshots only if a reviewed policy proves they are needed, with strict retention and access control.
- Define amounts, package contents, who receives money, receipt wording, cancellation/refund rules, mismatch handling, partial completion, applicant no-response, and complaint escalation before real collection.
- Reconcile daily pilot records, secure financial audit events, and document who can issue or approve refunds. An ordinary case note is not a payment audit record.

## Failure handling

- Paid but assistance cannot proceed: stop work, notify the applicant through the agreed channel, record the reason and owner, and follow the published refund/exception policy.
- Reference mismatch or duplicate: leave unverified, request only the minimum correction, and never infer payment from a screenshot.
- Applicant disappears mid-case: follow the disclosed contact/closure timeline and refund policy; do not silently convert the payment to earned status.
- Payment verification failure or provider outage: show pending/exception state and give staff/applicant next steps without implying a government transaction failed or succeeded.

## Exit gate

Before real fee handling, complete the Phase 3 database/security integration gate; approve pricing and policy; build server-side immutable ledger and role-checked reconciliation; issue distinguishable service receipts; test duplicates, refunds, retries, outage, and cross-case access; publish terms/privacy/refund information; and train the operator. No real payment was tested in this phase.
