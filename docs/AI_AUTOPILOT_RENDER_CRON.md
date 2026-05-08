# Churvox AI Autopilot Render Cron

Churvox must be truly automated, not fake button automation.

The backend autopilot runner already lives at:

```bash
backend/ai_autopilot_cron.py
```

Create a Render Cron Job with these settings:

- Name: `churvox-ai-autopilot-cron`
- Environment: Python
- Region: Virginia
- Branch: `main`
- Root Directory: `backend`
- Build Command:

```bash
pip install -r requirements.txt
```

- Run Command:

```bash
python ai_autopilot_cron.py
```

- Schedule while testing: every 15 minutes
- Schedule after stable: hourly

Required environment variables:

```text
MONGO_URL=<same Mongo connection string used by backend>
DB_NAME=<same database name used by backend>
DEFAULT_GST_RATE=15
```

## What this runs automatically

Safe automatic actions:

- Create draft invoices from completed jobs that have not been invoiced.
- Prepare worker assignment approval records for unassigned jobs.
- Prepare overdue invoice reminder drafts.
- Prepare quote follow-up drafts.
- Write owner notifications/events so the owner can see what AI did.

Approval-first actions:

- Assigning workers.
- Sending customer messages.
- Deleting records.
- Charging customers.
- MYOB/accounting writes.
- Payroll changes.

## Product rule

Churvox should be built as a truly automated AI business command centre. AI should run admin automatically in the background wherever it is safe, and only stop for owner approval when the action can affect customers, workers, accounting, payroll, payments, or legal/compliance outcomes.
