"""
Churvox automation — Templates, trigger schemas, and visible path hints.

Kept intentionally small, side-effect-free, and importable without touching
server/db state. Extracted from server.py as a safe cleanup split.
"""
from __future__ import annotations
from typing import Dict, List


# Suggested dotted paths per trigger — used by the UI to render "click-to-copy" chips.
TRIGGER_SCHEMAS: Dict[str, List[str]] = {
    # job-family
    "job_assigned": ["job.id", "job.title", "job.status", "job.client_id", "job.worker_id",
                     "job.job_type", "job.region", "job.address", "actor.id", "actor.role"],
    "job_acknowledged": ["job.id", "job.title", "job.status", "job.worker_id", "actor.id"],
    "job_started": ["job.id", "job.title", "job.status", "job.worker_id", "actor.id"],
    "job_paused": ["job.id", "job.title", "job.worker_id", "actor.id"],
    "job_resumed": ["job.id", "job.title", "job.worker_id", "actor.id"],
    "job_completed": ["job.id", "job.title", "job.client_id", "job.worker_id", "actor.id"],
    "employer_note_added": ["job.id", "job.title", "note.text", "actor.id"],
    "worker_note_added": ["job.id", "job.title", "note.text", "actor.id"],
    "worker_photo_uploaded": ["job.id", "job.title", "photo_uploaded", "actor.id"],
    # quote-family
    "quote_created": ["quote.id", "quote.status", "quote.total", "quote.client_id", "actor.id"],
    "quote_sent": ["quote.id", "quote.status", "quote.total", "quote.client_id", "actor.id"],
    "quote_accepted": ["quote.id", "quote.status", "quote.total", "quote.client_id",
                       "quote.customer_name", "quote.job_type", "actor.id"],
    # invoice-family
    "invoice_created": ["invoice.id", "invoice.status", "invoice.total", "invoice.client_id", "actor.id"],
    "invoice_sent": ["invoice.id", "invoice.status", "invoice.total", "invoice.client_id", "actor.id"],
    "invoice_paid": ["invoice.id", "invoice.status", "invoice.total", "invoice.client_id", "actor.id"],
    "invoice_overdue": ["invoice.id", "invoice.status", "invoice.total", "invoice.client_id",
                        "invoice.days_overdue", "invoice.due_date"],
    # team
    "team_member_invited": ["team_member.id", "team_member.email", "team_member.role", "actor.id"],
    # payroll
    "timesheet_updated": ["timesheet.id", "timesheet.worker_id", "timesheet.hours",
                          "timesheet.week_of", "actor.id"],
    "payroll_status_updated": ["payroll.id", "payroll.status", "payroll.period", "actor.id"],
    # recurring
    "recurring_job_generated": ["job.id", "job.title", "job.client_id", "job.recurring_frequency",
                                "source_job_id", "actor.id"],
}


# Ready-to-use rule templates shown in the UI. Not persisted; used as starting points.
AUTOMATION_TEMPLATES: List[dict] = [
    # -------- JOB LIFECYCLE --------
    {
        "key": "job_assigned_notify_worker",
        "name": "Job assigned → notify worker",
        "description": "Instantly ping the worker when they're assigned a new job.",
        "trigger": "job_assigned",
        "condition_mode": "all",
        "conditions": [{"path": "job.worker_id", "op": "not_blank", "value": ""}],
        "actions": [{
            "type": "create_notification",
            "config": {
                "user_id": "{{job.worker_id}}",
                "title": "New job: {{job.title}}",
                "message": "You've been assigned a new job.",
                "route": "/worker/jobs/{{job.id}}",
                "target_type": "job",
                "target_id": "{{job.id}}",
                "notification_type": "job_assigned",
            },
        }],
    },
    {
        "key": "job_completed_notify_owner",
        "name": "Job completed → notify me",
        "description": "Ping the owner the moment a worker marks a job complete.",
        "trigger": "job_completed",
        "condition_mode": "all",
        "conditions": [],
        "actions": [{
            "type": "create_notification",
            "config": {
                "user_id": "{{job.business_id}}",
                "title": "Job completed: {{job.title}}",
                "message": "Worker marked the job complete.",
                "route": "/jobs/{{job.id}}",
                "target_type": "job",
                "target_id": "{{job.id}}",
                "notification_type": "job_completed",
            },
        }],
    },
    {
        "key": "job_completed_draft_invoice",
        "name": "Job completed → draft invoice",
        "description": "Auto-create a draft invoice the moment a job completes — you still review & send.",
        "trigger": "job_completed",
        "condition_mode": "all",
        "conditions": [],
        "actions": [{
            "type": "create_invoice_stub",
            "config": {
                "job_id": "{{job.id}}",
                "client_id": "{{job.client_id}}",
                "status": "draft",
                "total": 0,
                "notes": "Auto-drafted after job completion — please review & send.",
            },
        }],
    },
    {
        "key": "worker_note_notify_owner",
        "name": "Worker note added → notify me",
        "description": "Never miss a worker update — get a ping when they leave a note on a job.",
        "trigger": "worker_note_added",
        "condition_mode": "all",
        "conditions": [],
        "actions": [{
            "type": "create_notification",
            "config": {
                "user_id": "{{job.business_id}}",
                "title": "Worker note on {{job.title}}",
                "message": "{{note.text}}",
                "route": "/jobs/{{job.id}}",
                "target_type": "job",
                "target_id": "{{job.id}}",
                "notification_type": "worker_note_added",
            },
        }],
    },
    {
        "key": "worker_photo_notify_owner",
        "name": "Worker photo uploaded → notify me",
        "description": "Know the instant a worker uploads job-site photos.",
        "trigger": "worker_photo_uploaded",
        "condition_mode": "all",
        "conditions": [],
        "actions": [{
            "type": "create_notification",
            "config": {
                "user_id": "{{job.business_id}}",
                "title": "Photos uploaded for {{job.title}}",
                "message": "A worker added photos to this job.",
                "route": "/jobs/{{job.id}}",
                "target_type": "job",
                "target_id": "{{job.id}}",
                "notification_type": "worker_photo_uploaded",
            },
        }],
    },
    # -------- QUOTES --------
    {
        "key": "quote_sent_notify_office_admin",
        "name": "Quote sent → notify office admin",
        "description": "Keep your office admin in the loop whenever a quote goes out.",
        "trigger": "quote_sent",
        "condition_mode": "all",
        "conditions": [],
        "actions": [{
            "type": "create_notification",
            "config": {
                "user_id": "{{business_id}}",
                "title": "Quote sent (${{quote.total}})",
                "message": "Quote {{quote.id}} was just sent.",
                "route": "/quotes/{{quote.id}}",
                "target_type": "quote",
                "target_id": "{{quote.id}}",
                "notification_type": "quote_sent",
            },
        }],
    },
    {
        "key": "quote_accepted_notify_owner",
        "name": "Quote accepted → notify me + follow-up task",
        "description": "Celebrate the win and auto-create a follow-up to turn the quote into a job.",
        "trigger": "quote_accepted",
        "condition_mode": "all",
        "conditions": [],
        "actions": [
            {
                "type": "create_notification",
                "config": {
                    "user_id": "{{business_id}}",
                    "title": "Quote accepted 🎉 ${{quote.total}}",
                    "message": "{{quote.customer_name}} accepted the quote.",
                    "route": "/quotes/{{quote.id}}",
                    "target_type": "quote",
                    "target_id": "{{quote.id}}",
                    "notification_type": "quote_accepted",
                },
            },
            {
                "type": "create_follow_up_task_stub",
                "config": {
                    "title": "Schedule job for accepted quote {{quote.id}}",
                    "description": "Turn this accepted quote into a scheduled job.",
                    "related_type": "quote",
                    "related_id": "{{quote.id}}",
                },
            },
        ],
    },
    # -------- INVOICES --------
    {
        "key": "invoice_sent_notify_office_admin",
        "name": "Invoice sent → notify office admin",
        "description": "Ping office admin every time an invoice goes out the door.",
        "trigger": "invoice_sent",
        "condition_mode": "all",
        "conditions": [],
        "actions": [{
            "type": "create_notification",
            "config": {
                "user_id": "{{business_id}}",
                "title": "Invoice sent (${{invoice.total}})",
                "message": "Invoice {{invoice.id}} was sent.",
                "route": "/invoices/{{invoice.id}}",
                "target_type": "invoice",
                "target_id": "{{invoice.id}}",
                "notification_type": "invoice_sent",
            },
        }],
    },
    {
        "key": "invoice_paid_notify_owner",
        "name": "Invoice paid → notify me",
        "description": "Celebrate every payment — get a notification when any invoice is marked paid.",
        "trigger": "invoice_paid",
        "condition_mode": "all",
        "conditions": [],
        "actions": [{
            "type": "create_notification",
            "config": {
                "user_id": "{{business_id}}",
                "title": "Invoice paid: ${{invoice.total}}",
                "message": "Invoice {{invoice.id}} was marked paid.",
                "route": "/invoices/{{invoice.id}}",
                "target_type": "invoice",
                "target_id": "{{invoice.id}}",
                "notification_type": "invoice_paid",
            },
        }],
    },
    {
        "key": "invoice_overdue_reminder",
        "name": "Invoice overdue → reminder to chase it",
        "description": "Nightly scan catches unpaid invoices past their due date — this pings you to follow up.",
        "trigger": "invoice_overdue",
        "condition_mode": "all",
        "conditions": [],
        "actions": [{
            "type": "create_notification",
            "config": {
                "user_id": "{{business_id}}",
                "title": "Invoice overdue: ${{invoice.total}}",
                "message": "{{invoice.days_overdue}} days past due. Time to chase it.",
                "route": "/invoices/{{invoice.id}}",
                "target_type": "invoice",
                "target_id": "{{invoice.id}}",
                "notification_type": "invoice_overdue",
            },
        }],
    },
    # -------- TEAM --------
    {
        "key": "team_invite_notify_manager",
        "name": "Team member invited → notify me",
        "description": "Keep a running log of every teammate invited to the business.",
        "trigger": "team_member_invited",
        "condition_mode": "all",
        "conditions": [],
        "actions": [{
            "type": "create_notification",
            "config": {
                "user_id": "{{business_id}}",
                "title": "New teammate invited: {{team_member.email}}",
                "message": "Role: {{team_member.role}}.",
                "route": "/team",
                "target_type": "team_member",
                "target_id": "{{team_member.id}}",
                "notification_type": "team_member_invited",
            },
        }],
    },
    # -------- RECURRING --------
    {
        "key": "recurring_notify_worker",
        "name": "Recurring job generated → notify worker",
        "description": "When your recurring cadence spins up a new job, ping the assigned worker immediately.",
        "trigger": "recurring_job_generated",
        "condition_mode": "all",
        "conditions": [{"path": "job.worker_id", "op": "not_blank", "value": ""}],
        "actions": [{
            "type": "create_notification",
            "config": {
                "user_id": "{{job.worker_id}}",
                "title": "New recurring job: {{job.title}}",
                "message": "Scheduled for {{job.scheduled_date}}.",
                "route": "/worker/jobs/{{job.id}}",
                "target_type": "job",
                "target_id": "{{job.id}}",
                "notification_type": "job_assigned",
            },
        }],
    },
    {
        "key": "recurring_notify_owner",
        "name": "Recurring job generated → notify me",
        "description": "Get notified each time the recurring engine spins up a new occurrence.",
        "trigger": "recurring_job_generated",
        "condition_mode": "all",
        "conditions": [],
        "actions": [{
            "type": "create_notification",
            "config": {
                "user_id": "{{business_id}}",
                "title": "Recurring job created: {{job.title}}",
                "message": "Frequency: {{job.recurring_frequency}}.",
                "route": "/jobs/{{job.id}}",
                "target_type": "job",
                "target_id": "{{job.id}}",
                "notification_type": "recurring_job_generated",
            },
        }],
    },
    # -------- PAYROLL --------
    {
        "key": "timesheet_notify_payroll",
        "name": "Timesheet updated → notify payroll",
        "description": "Ping your payroll admin whenever a timesheet changes.",
        "trigger": "timesheet_updated",
        "condition_mode": "all",
        "conditions": [],
        "actions": [{
            "type": "create_notification",
            "config": {
                "user_id": "{{business_id}}",
                "title": "Timesheet updated ({{timesheet.hours}}h)",
                "message": "Worker {{timesheet.worker_id}} · week {{timesheet.week_of}}.",
                "route": "/payroll",
                "target_type": "timesheet",
                "target_id": "{{timesheet.id}}",
                "notification_type": "timesheet_updated",
            },
        }],
    },
    {
        "key": "payroll_status_notify_owner",
        "name": "Payroll status updated → notify me",
        "description": "Get notified on every payroll run status change (draft / approved / paid).",
        "trigger": "payroll_status_updated",
        "condition_mode": "all",
        "conditions": [],
        "actions": [{
            "type": "create_notification",
            "config": {
                "user_id": "{{business_id}}",
                "title": "Payroll {{payroll.status}} ({{payroll.period}})",
                "message": "Payroll run status changed to {{payroll.status}}.",
                "route": "/payroll",
                "target_type": "payroll",
                "target_id": "{{payroll.id}}",
                "notification_type": "payroll_status_updated",
            },
        }],
    },
    # -------- POWER-USER --------
    {
        "key": "big_paid_invoice_alert",
        "name": "Large invoice paid → extra alert",
        "description": "Ping me extra loud when an invoice over $500 is paid.",
        "trigger": "invoice_paid",
        "condition_mode": "all",
        "conditions": [{"path": "invoice.total", "op": "gte", "value": 500}],
        "actions": [{
            "type": "create_notification",
            "config": {
                "user_id": "{{business_id}}",
                "title": "Large invoice paid: ${{invoice.total}}",
                "message": "Nice one — invoice {{invoice.id}} just cleared.",
                "route": "/invoices/{{invoice.id}}",
                "notification_type": "invoice_paid",
            },
        }],
    },
    {
        "key": "tag_urgent_jobs",
        "name": "Urgent jobs → auto-tag high priority",
        "description": "Stamp any job with 'urgent' in the title as high priority the moment it's created.",
        "trigger": "job_assigned",
        "condition_mode": "all",
        "conditions": [{"path": "job.title", "op": "contains", "value": "urgent"}],
        "actions": [{
            "type": "set_field_on_record",
            "config": {
                "collection": "jobs",
                "id": "{{job.id}}",
                "field": "priority",
                "value": "high",
            },
        }],
    },
]
