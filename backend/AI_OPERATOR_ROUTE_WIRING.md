# AI Operator route wiring

The AI Operator backend foundation has been added in:

- `backend/ai_operator_engine.py`
- `backend/ai_operator_routes.py`

To mount the routes inside the existing FastAPI backend, add this near the other imports in `backend/server.py`:

```python
from ai_operator_routes import create_ai_operator_router
```

Then add this after `api_router = APIRouter(prefix="/api")` and after `get_current_user` / `get_user_business_id` are defined, before the final router is included into the app:

```python
api_router.include_router(
    create_ai_operator_router(db, get_current_user, get_user_business_id)
)
```

Expected live endpoints after wiring:

```text
GET  /api/ai/operator/queue
POST /api/ai/operator/run-daily-check
POST /api/ai/operator/prepare-today
POST /api/ai/operator/ask
POST /api/ai/operator/actions/{action_id}/approve
POST /api/ai/operator/actions/{action_id}/reject
```

Frontend is already wired to these endpoints through:

- `frontend/src/lib/aiOperator.js`
- `frontend/src/pages/SmartHubHardReset.js`

Until the backend route include is mounted, the Smart Hub safely falls back to prepared demo AI actions rather than breaking.

## Execution model

The backend engine already prepares real action objects from business-scoped data:

- unassigned jobs → worker assignment action
- completed jobs without invoice → invoice draft action
- sent/unanswered quotes → quote follow-up action
- overdue invoices → invoice reminder action

Every action is approval-first and includes:

- action type
- module
- reason
- confidence
- risk level
- target record
- suggested payload
- preview text
- audit log

## Safety rules

The AI Operator must not auto-send, delete, bill, alter payroll, or push MYOB/accounting-impacting changes without owner approval.
