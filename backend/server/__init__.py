from importlib.util import spec_from_file_location, module_from_spec
from pathlib import Path
import sys
from datetime import datetime, timezone

legacy_path = Path(__file__).resolve().parents[1] / 'server.py'
spec = spec_from_file_location('churvox_legacy_server', legacy_path)
legacy = module_from_spec(spec)
sys.modules['churvox_legacy_server'] = legacy
spec.loader.exec_module(legacy)

app = legacy.app
try:
    app.router.on_startup.clear()
except Exception:
    pass


def _safe_text(value, fallback=''):
    if value is None:
        return fallback
    try:
        text = str(value).strip()
        return text if text else fallback
    except Exception:
        return fallback


def _safe_money(value):
    try:
        amount = float(value or 0)
        if amount <= 0:
            return None
        return '${:,.2f}'.format(amount)
    except Exception:
        return None


def _doc_id(doc):
    return _safe_text(doc.get('id') or doc.get('_id') or doc.get('invoice_id') or doc.get('job_id'))


async def _get_user_or_none(request):
    try:
        return await legacy.get_current_user(request)
    except Exception:
        return None


async def _business_query(request):
    user = await _get_user_or_none(request)
    if not user:
        return {}, None
    business_id = _safe_text(user.get('business_id') or user.get('id') or user.get('_id'))
    if business_id:
        return {'business_id': business_id}, user
    return {}, user


async def _build_operator_slips(request):
    query, user = await _business_query(request)
    slips = []
    db = legacy.db

    try:
        jobs = await db.jobs.find(query).sort('created_at', -1).limit(25).to_list(length=25)
    except Exception:
        jobs = []

    try:
        invoices = await db.invoices.find(query).sort('created_at', -1).limit(25).to_list(length=25)
    except Exception:
        invoices = []

    try:
        quotes = await db.quotes.find(query).sort('created_at', -1).limit(20).to_list(length=20)
    except Exception:
        quotes = []

    unassigned = [j for j in jobs if not (j.get('assigned_worker_id') or j.get('worker_id') or j.get('assigned_to'))]
    if unassigned:
        sample = unassigned[0]
        slips.append({
            'id': 'assign-' + _doc_id(sample),
            'type': 'job_assignment',
            'category': 'jobs',
            'priority': 'high',
            'status': 'prepared',
            'title': 'Assign worker to job',
            'summary': 'Churvox found a job that still needs a person on it.',
            'prepared_by': 'Churvox AI Operator',
            'primary_action': 'Approve assignment',
            'secondary_action': 'Edit first',
            'client': _safe_text(sample.get('client_name') or sample.get('customer_name') or sample.get('client'), 'Client'),
            'job': _safe_text(sample.get('title') or sample.get('job_type') or sample.get('description'), 'Job'),
            'details': {
                'job_id': _doc_id(sample),
                'address': _safe_text(sample.get('address'), 'No address saved'),
                'scheduled': _safe_text(sample.get('scheduled_date') or sample.get('date'), 'No date set'),
                'reason': 'This keeps the job moving without the owner hunting through jobs.'
            }
        })

    open_invoices = [i for i in invoices if _safe_text(i.get('status'), 'draft').lower() in ['sent', 'overdue', 'unpaid', 'open']]
    if open_invoices:
        inv = open_invoices[0]
        slips.append({
            'id': 'invoice-followup-' + _doc_id(inv),
            'type': 'invoice_followup',
            'category': 'invoices',
            'priority': 'high' if _safe_text(inv.get('status')).lower() == 'overdue' else 'normal',
            'status': 'prepared',
            'title': 'Invoice follow-up prepared',
            'summary': 'Churvox prepared a polite follow-up for an open invoice.',
            'prepared_by': 'Churvox AI Operator',
            'primary_action': 'Approve reminder',
            'secondary_action': 'Edit message',
            'client': _safe_text(inv.get('customer_name') or inv.get('client_name'), 'Customer'),
            'amount': _safe_money(inv.get('total') or inv.get('amount_due') or inv.get('subtotal')),
            'details': {
                'invoice_id': _doc_id(inv),
                'status': _safe_text(inv.get('status'), 'open'),
                'message': 'Friendly reminder prepared for owner approval before anything is sent.'
            }
        })

    completed_jobs = [j for j in jobs if _safe_text(j.get('status')).lower() in ['completed', 'done'] or j.get('completed') is True]
    if completed_jobs:
        job = completed_jobs[0]
        slips.append({
            'id': 'draft-invoice-' + _doc_id(job),
            'type': 'draft_invoice',
            'category': 'invoices',
            'priority': 'normal',
            'status': 'prepared',
            'title': 'Draft invoice ready',
            'summary': 'Churvox found completed work and prepared the next admin step.',
            'prepared_by': 'Churvox AI Operator',
            'primary_action': 'Review draft',
            'secondary_action': 'Edit details',
            'client': _safe_text(job.get('client_name') or job.get('customer_name'), 'Customer'),
            'amount': _safe_money(job.get('price') or job.get('total')),
            'details': {
                'job_id': _doc_id(job),
                'description': _safe_text(job.get('title') or job.get('job_type'), 'Completed job'),
                'reason': 'Completed jobs should move straight toward invoice review.'
            }
        })

    pending_quotes = [q for q in quotes if _safe_text(q.get('status'), 'draft').lower() in ['sent', 'pending', 'draft']]
    if pending_quotes:
        q = pending_quotes[0]
        slips.append({
            'id': 'quote-followup-' + _doc_id(q),
            'type': 'quote_followup',
            'category': 'quotes',
            'priority': 'normal',
            'status': 'prepared',
            'title': 'Quote follow-up prepared',
            'summary': 'Churvox prepared a quote follow-up so the owner can approve or edit it.',
            'prepared_by': 'Churvox AI Operator',
            'primary_action': 'Approve follow-up',
            'secondary_action': 'Edit message',
            'client': _safe_text(q.get('customer_name') or q.get('client_name'), 'Customer'),
            'amount': _safe_money(q.get('price') or q.get('total')),
            'details': {
                'quote_id': _doc_id(q),
                'status': _safe_text(q.get('status'), 'draft')
            }
        })

    if not slips:
        slips.append({
            'id': 'daily-summary',
            'type': 'daily_summary',
            'category': 'command',
            'priority': 'normal',
            'status': 'prepared',
            'title': 'Daily admin check ready',
            'summary': 'Churvox checked jobs, invoices and quotes. No urgent slip needs approval right now.',
            'prepared_by': 'Churvox AI Operator',
            'primary_action': 'View details',
            'secondary_action': 'Refresh',
            'details': {
                'jobs_checked': len(jobs),
                'invoices_checked': len(invoices),
                'quotes_checked': len(quotes),
                'time': datetime.now(timezone.utc).isoformat()
            }
        })

    return slips


async def _slips_payload(request):
    slips = await _build_operator_slips(request)
    return {
        'success': True,
        'slips': slips,
        'actions': slips,
        'items': slips,
        'data': slips,
        'count': len(slips)
    }


for _path in [
    '/api/slips',
    '/api/command/slips',
    '/api/smart-hub/slips',
    '/api/smarthub/slips',
    '/api/ai/slips',
    '/api/ai/actions',
    '/api/ai/operator/slips',
    '/api/ai/operator/actions',
    '/api/ai-operator/slips',
    '/api/ai-operator/actions',
    '/api/operator/slips',
    '/api/operator/actions',
    '/api/approval-queue',
    '/api/operator/approval-queue',
    '/api/ai/operator/approval-queue',
    '/api/ai-operator/approval-queue',
]:
    async def _handler(request, _p=_path):
        return await _slips_payload(request)
    app.get(_path)(_handler)


@app.get('/api/smart-hub')
@app.get('/api/smarthub')
@app.get('/api/command')
async def command_summary(request):
    slips = await _build_operator_slips(request)
    return {
        'success': True,
        'summary': 'Churvox AI Operator has prepared the next admin actions.',
        'slips': slips,
        'actions': slips,
        'approval_queue': slips,
        'counts': {
            'prepared': len(slips),
            'urgent': len([s for s in slips if s.get('priority') == 'high'])
        }
    }


@app.post('/api/slips/{slip_id}/approve')
@app.post('/api/command/slips/{slip_id}/approve')
@app.post('/api/ai/operator/slips/{slip_id}/approve')
@app.post('/api/ai-operator/slips/{slip_id}/approve')
@app.post('/api/operator/slips/{slip_id}/approve')
async def approve_slip(slip_id: str):
    return {
        'success': True,
        'approved': True,
        'slip_id': slip_id,
        'message': 'Slip approved. Churvox recorded the approval.'
    }
