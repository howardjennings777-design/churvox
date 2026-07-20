# Churvox Office OS — AI Safety Contract

The background office must remain useful when an AI provider is slow, unavailable or wrong. AI helps prepare work; it does not become the source of business truth or execution authority.

## Rules-first architecture

Deterministic services own:

- Authentication and permissions
- Business isolation
- Record retrieval
- Job, quote and invoice states
- Recurrence calculations
- Pricing arithmetic
- Tax/GST calculation
- Payment status
- Accounting sync status
- Idempotency
- Approval authority
- External action execution
- Audit history

AI may never override those services.

## Allowed AI work

AI may:

- Summarise live records
- Draft customer or worker replies
- Extract possible dates, promises, issues and extras from text
- Suggest a category, priority or office desk
- Explain why a deterministic rule raised a warning
- Suggest schedule options from already-validated availability data
- Draft quote scope or invoice wording
- Suggest client-memory updates
- Identify repeated patterns for owner review
- Convert voice notes into a draft

Every AI result remains a proposal until validated.

## Prohibited AI authority

AI may not independently:

- Send a message
- Confirm a booking
- Move a committed appointment
- Charge or refund money
- Mark an invoice paid
- File tax
- Submit payroll
- Create a bank payout file
- Sync or alter an accounting ledger
- Delete a record
- Change user permissions
- Approve its own action
- Invent missing prices, dates, proof or customer consent
- Treat a model response as evidence that an external action succeeded

## Evidence-backed Command slips

An AI-assisted Command slip must contain:

- Exact source record references
- Facts supplied by deterministic services
- What was inferred
- Confidence
- Missing information
- A prepared action
- A deterministic validation result
- Owner decision options
- An idempotency key
- An audit reference

If source records are missing, conflicting or stale, the slip must say so and fail closed.

## Money and accounting

AI may draft descriptions and explain exceptions. It may not calculate financial truth alone.

Amounts, taxes, deposits, balances, payment status, margins and accounting payloads must come from validated numeric services and trusted provider responses.

## Scheduling

AI may rank safe options after deterministic checks for:

- Worker availability
- Skills and licences
- Service window
- Existing commitments
- Travel estimate
- Recurrence rules
- Capacity
- Customer restrictions

AI cannot place or move committed work when the action requires approval.

## Sensitive data

- Send the minimum information needed for the task.
- Avoid secrets, payment credentials and unnecessary personal data.
- Keep provider configuration and keys out of prompts and logs.
- Redact sensitive values from diagnostics.
- Record which provider and model produced an assisted draft.
- Apply retention rules to prompts and outputs.

## Reliability

- Core job, client, schedule, quote and invoice functions must work without AI.
- AI failure must produce a visible degraded state, not a blank page.
- Draft generation may retry safely.
- A retry must not duplicate an external action.
- Provider timeouts and malformed output must return to a deterministic fallback.
- Cached AI text must never make stale record facts look current.

## Validation pipeline

Before an AI-assisted action reaches Command:

1. Load authorised business-scoped records.
2. Run deterministic rule checks.
3. Create a structured context with source references.
4. Ask AI only for the permitted draft or explanation.
5. Validate the returned structure.
6. Re-check amounts, states, permissions and required fields deterministically.
7. Build the Command slip.
8. Require the appropriate owner or manager decision.
9. Execute through an idempotent service.
10. Record the provider result and audit event.

## Evaluation

The Office OS release gate must include repeatable evaluations for:

- No invented customer or job facts
- No invented prices or payment states
- Correct source references
- Correct missing-information disclosure
- Safe refusal when context is insufficient
- No execution language that implies an action already occurred
- Consistent business tone
- Correct classification of owner-approval actions
- Resistance to instructions contained inside customer or worker messages
- Clear degraded behaviour when the AI provider is unavailable

## Product wording

The product should not claim that Churvox completed an external action until the deterministic execution service has a trusted success result.

Use:

- “Prepared”
- “Ready for review”
- “Waiting for approval”
- “Approved — running”
- “Sent” only after provider confirmation
- “Paid” only after trusted payment confirmation
- “Synced” only after confirmed external acknowledgement

The permanent rule remains:

**AI can prepare the office work. Authority and truth stay with the business systems and the owner.**
