# Stage 5 Job Completion Flow

## Goal
When a job is completed, Churvox automatically prepares the admin.

## Done
- Added completion endpoints:
  - POST /api/jobs/{job_id}/complete
  - POST /api/jobs/{job_id}/finish
  - POST /api/worker/jobs/{job_id}/complete
  - POST /api/ai/jobs/{job_id}/complete-and-prepare
- Completing a job now:
  - marks the job completed
  - saves completed_at / finished_at
  - saves completion notes
  - creates or updates a timesheet record
  - calculates worked minutes/hours where start/end times exist
  - writes AI invoice description
  - prepares job review slip
  - prepares invoice draft slip if no invoice exists
- Added Command Board button:
  - Check completed jobs

## Manual check after Render deploy
1. Open Command Board.
2. Click Check completed jobs.
3. Completed jobs should create/update timesheets and owner approval slips.
4. Complete a worker job.
5. Confirm Command Board gets job review and invoice draft slips.
