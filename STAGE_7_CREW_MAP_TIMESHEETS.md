# Stage 7 Crew Map + Timesheets

## Goal
Crew Map shows only workers on active jobs and turns work sessions into timesheets.

## Done
- Added Start Job endpoints.
- Added Pause Job endpoints.
- Added Resume Job endpoints.
- Added Finish Active Job endpoints.
- Added Location update endpoints.
- Added active crew map endpoint:
  - GET /api/crew-map/active
- Added timesheet summary endpoint:
  - GET /api/timesheets/summary
- Workers appear on Crew Map only after Start Job.
- Workers disappear after Finish Job.
- Finish Job links into Stage 5 completion logic where available.
- Timesheets track started_at, paused_minutes, completed_at, total/net minutes and hours.
- Crew Map page now shows active crew only and daily totals.

## Manual check after Render deploy
1. Start a job as a worker or owner.
2. Open Crew Map.
3. Confirm worker appears.
4. Pause/resume job.
5. Confirm same timesheet remains active/paused.
6. Finish job.
7. Confirm worker disappears from Crew Map.
8. Confirm daily timesheet total updates.
