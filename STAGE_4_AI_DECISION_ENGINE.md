# Stage 4 AI Decision Engine

## Goal
Make Churvox feel like: “I found what needs doing. I suggest this. Approve it and I’ll handle it.”

## Done
- Rebuilds Command Board slips from real records.
- Creates assignment suggestions for unassigned jobs.
- Suggests worker based on area, active jobs, schedule conflicts and availability.
- Creates job review slips for completed jobs.
- Creates invoice draft slips for completed jobs without invoices.
- Creates send-invoice slips for draft/ready invoices.
- Creates payment reminder slips for unpaid/overdue invoices.
- Creates quote follow-up slips for open quotes.
- Adds reason, confidence, source records, checks and what-will-happen to slips.
- Adds daily AI summary to Command Board.

## Manual check after Render deploy
1. Open Command Board.
2. Click Clear old slips + rebuild.
3. Confirm the AI summary appears.
4. Open a slip.
5. Confirm it shows why Churvox suggests it.
6. Confirm it says what happens when approved.
7. Confirm send/assign/draft buttons still run through approval.
