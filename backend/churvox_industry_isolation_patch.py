from __future__ import annotations

from datetime import datetime, timezone
import importlib
import importlib.abc
import importlib.machinery
import sys

TARGETS = {"server", "backend.server"}
INSTALLED = set()
SOURCE = "churvox_industry_isolation"

try:
    import churvox_industry_mode_patch as base
except Exception:
    base = None


def text(value):
    return str(value or "").strip()


def key(value):
    return "".join(ch for ch in text(value).lower() if ch.isalnum())


def now():
    return datetime.now(timezone.utc).isoformat()


def mode_rules(mode, profile_key, work_style="auto"):
    style = key(work_style)
    field_like = mode in {"field_service", "visit_service"} or style in {"mobile", "customersite", "clientsite", "both"}
    appointment = mode in {"appointment_service", "mobile_appointment_service"}
    project = mode == "project_service"
    mobile = mode == "mobile_appointment_service" or style in {"mobile", "both"}

    hide_nav = []
    keep_nav = ["today", "command", "jobs", "clients", "workers", "messages", "quotes", "invoices", "settings", "plans", "help"]
    if appointment and profile_key != "events_photography":
        hide_nav.extend(["xero", "payroll"])
    if not field_like and not mobile:
        hide_nav.extend(["xero"])
    if appointment and not mobile:
        hide_nav.extend(["payroll"])
    if project:
        hide_nav.extend(["payroll"])

    forms = {
        "job_title": "Job name",
        "client_name": "Client",
        "site_address": "Site address",
        "scheduled_date": "Date",
        "scheduled_time": "Time",
        "assigned_worker": "Assigned worker",
        "worker_notes": "Worker notes",
        "proof": "Proof",
        "price": "Amount",
        "quote": "Quote",
        "invoice": "Invoice",
    }
    placeholders = {
        "job_title": "Example: repair, service visit, clean, appointment or project stage",
        "site_address": "Customer/site address",
        "worker_notes": "Notes the worker needs before starting",
        "price": "Amount to charge or review",
    }
    page_copy = {
        "jobs_empty": "Create the next job and assign the right person.",
        "command_prompt": "Command watches worker updates, customer replies and money checks for this business.",
    }

    if appointment:
        forms.update({
            "job_title": "Service / appointment",
            "site_address": "Appointment location",
            "assigned_worker": "Staff member",
            "worker_notes": "Client notes",
            "proof": "Notes/photos",
            "quote": "Consult",
            "invoice": "Payment",
            "price": "Payment amount",
        })
        placeholders.update({
            "job_title": "Example: cut, colour, massage, consult, session",
            "site_address": "Leave blank for shop/salon appointments",
            "worker_notes": "Preferences, allergies, formulas, package notes or reminders",
            "price": "Deposit or final payment amount",
        })
        page_copy.update({
            "jobs_empty": "Create the next appointment and keep client notes close.",
            "command_prompt": "Command watches deposits, no-shows, rebooking, overrun and client messages.",
        })

    if profile_key in {"appointment_beauty", "nails_lashes_brows"}:
        forms.update({"client_name": "Client", "proof": "Before/after photos", "worker_notes": "Client preferences"})
        placeholders.update({"job_title": "Example: cut, colour, full set, fill, lash set", "worker_notes": "Colour formula, lash map, nail preference, allergy note"})

    if profile_key == "massage_wellness":
        forms.update({"job_title": "Session", "worker_notes": "Session notes", "quote": "Plan", "invoice": "Payment"})
        placeholders.update({"job_title": "Example: massage session, consult, package session", "worker_notes": "Intake notes, package progress, follow-up reminder"})

    if profile_key == "coaching_tutoring":
        forms.update({"job_title": "Session", "client_name": "Client / student", "worker_notes": "Progress notes", "quote": "Plan", "invoice": "Payment"})
        placeholders.update({"job_title": "Example: tutoring session, coaching call, lesson", "worker_notes": "Attendance, progress, homework or follow-up"})

    if profile_key == "pet_grooming":
        forms.update({"client_name": "Pet owner", "job_title": "Grooming appointment", "worker_notes": "Pet notes", "proof": "Pet photos"})
        placeholders.update({"job_title": "Example: full groom, wash, clip", "worker_notes": "Pet name, coat, behaviour, allergies, vaccination note"})

    if mode == "visit_service" or profile_key == "cleaning":
        forms.update({"job_title": "Visit", "assigned_worker": "Cleaner", "proof": "Checklist", "worker_notes": "Access / checklist notes"})
        placeholders.update({"job_title": "Example: weekly clean, end-of-tenancy clean, office clean", "worker_notes": "Key, alarm, access, checklist or supplies notes"})
        page_copy.update({"command_prompt": "Command watches access problems, checklist issues, cleaner delays and extra time."})

    if profile_key == "lawn_landscape":
        forms.update({"assigned_worker": "Crew", "proof": "Before/after photos", "worker_notes": "Access / outdoor notes"})
        placeholders.update({"job_title": "Example: mow, hedge trim, garden tidy, landscape quote", "worker_notes": "Gate, dog, green waste, weather or extra work notes"})
        page_copy.update({"command_prompt": "Command watches weather, gate access, extra work, crew delays and quote needs."})

    if profile_key == "plumbing_electrical_hvac":
        forms.update({"assigned_worker": "Technician", "worker_notes": "Diagnosis / safety notes", "proof": "Job proof"})
        placeholders.update({"job_title": "Example: call-out, repair, install, service", "worker_notes": "Diagnosis, parts, safety note, compliance note"})
        page_copy.update({"command_prompt": "Command watches urgent jobs, parts, safety notes, quote approvals and cannot-continue updates."})

    if project:
        forms.update({"job_title": "Project / stage", "assigned_worker": "Crew", "proof": "Progress photos", "quote": "Proposal", "invoice": "Invoice"})
        placeholders.update({"job_title": "Example: stage one, variation, event booking, deliverable", "worker_notes": "Stage notes, deposit, variation, material or deliverable detail"})
        page_copy.update({"jobs_empty": "Create the next project stage or booking.", "command_prompt": "Command watches deposits, variations, stage completion, deliverables and invoice review."})

    feature_policy = {
        "gps": bool(field_like or mobile),
        "route_view": bool(field_like or mobile),
        "site_address": bool(field_like or mobile),
        "appointment_calendar": bool(appointment or mobile),
        "checklists": bool(mode == "visit_service" or profile_key == "cleaning"),
        "deposits": bool(appointment or project),
        "rebooking": bool(appointment),
        "project_stages": bool(project),
        "proof_photos": True,
        "quotes": not (appointment and profile_key not in {"events_photography", "pet_grooming"}),
        "invoices": True,
        "worker_app": bool(field_like or mobile),
        "hide_payroll": bool(appointment or project),
        "hide_xero_until_money_setup": bool(appointment and profile_key not in {"events_photography"}),
    }

    return {
        "feature_policy": feature_policy,
        "hidden_nav": sorted(set(hide_nav)),
        "keep_nav": keep_nav,
        "form_labels": forms,
        "form_placeholders": placeholders,
        "page_copy": page_copy,
        "isolation_rules": [
            "Hide route/GPS language for shop or appointment businesses unless mobile work is selected.",
            "Keep money tools available, but rename quote/invoice wording for consults, plans, proposals or payments.",
            "Use industry-specific form labels and placeholders so owners are not filling generic tradie fields.",
            "Keep Command as the same approval desk, but watch industry-specific risks.",
        ],
    }


def enrich_payload(payload):
    if not isinstance(payload, dict):
        return payload
    profile = payload.get("industry_profile") or {}
    brain = payload.get("brain") or {}
    profile_key = profile.get("key") or brain.get("profile_key") or payload.get("industry_key") or "field_service"
    mode = profile.get("mode") or brain.get("mode") or "field_service"
    work_style = payload.get("work_style") or brain.get("work_style") or "auto"
    rules = mode_rules(mode, profile_key, work_style)
    brain = {**brain, **rules, "source": SOURCE}
    payload = {**payload, "source": SOURCE, "brain": brain, "industry_isolation_ready": True}
    return payload


def install(module):
    name = getattr(module, "__name__", "")
    if name in INSTALLED:
        return
    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    get_current_user = getattr(module, "get_current_user", None)
    ObjectId = getattr(module, "ObjectId", None)
    if not app or db is None or get_current_user is None or ObjectId is None or base is None:
        return

    def remove_route(path, method):
        try:
            app.router.routes = [route for route in app.router.routes if not (getattr(route, "path", "") == path and method.upper() in set(getattr(route, "methods", set()) or set()))]
        except Exception:
            pass

    async def get_context(request):
        user = await get_current_user(request)
        profile_key, work_style = base.selected_from_user(user)
        saved = bool((user or {}).get("industry_profile") or (user or {}).get("industry_key"))
        return enrich_payload(base.context_payload(profile_key, work_style, saved=saved))

    async def save_context(request):
        user = await get_current_user(request)
        try:
            body = await request.json()
        except Exception:
            body = {}
        profile_key = base.choose_profile(body.get("industry_key") or body.get("industry_profile") or body.get("profile") or body.get("profession") or body.get("business_type"))
        work_style = text(body.get("work_style") or body.get("service_location") or body.get("location_mode") or "auto") or "auto"
        selected = base.PROFILE_BY_KEY.get(profile_key, base.PROFILE_BY_KEY["field_service"])
        brain = enrich_payload(base.context_payload(selected["key"], work_style, saved=True)).get("brain")
        update = {"$set": {
            "industry_profile": selected["key"],
            "industry_key": selected["key"],
            "industry_mode": selected["mode"],
            "work_style": work_style,
            "industry_brain": brain,
            "business_profile": {
                "business_name": text(body.get("business_name")),
                "business_phone": text(body.get("business_phone")),
                "service_area": text(body.get("service_area")),
                "main_services": text(body.get("main_services")),
                "team_size": text(body.get("team_size")),
                "industry_key": selected["key"],
                "work_style": work_style,
                "completed": True,
            },
            "business_profile_completed": True,
            "updated_at": datetime.now(timezone.utc),
        }}
        filters = base.user_filters(user, ObjectId)
        try:
            await db.users.update_many({"$or": filters}, update)
        except Exception:
            pass
        try:
            bid = text((user or {}).get("business_id") or (user or {}).get("businessId") or (user or {}).get("owner_business_id"))
            email = text((user or {}).get("email")).lower()
            business_filters = []
            if bid:
                business_filters.extend([{"_id": bid}, {"business_id": bid}])
                try:
                    business_filters.append({"_id": ObjectId(bid)})
                except Exception:
                    pass
            if email:
                business_filters.extend([{"owner_email": email}, {"email": email}])
            if business_filters:
                await db.businesses.update_many({"$or": business_filters}, update)
        except Exception:
            pass
        response = enrich_payload(base.context_payload(selected["key"], work_style, saved=True))
        response["business_profile_completed"] = True
        response["business_profile"] = update["$set"]["business_profile"]
        response["saved_payload"] = {"industry_key": selected["key"], "work_style": work_style}
        return response

    for path, endpoint, method in [
        ("/api/industry/context", get_context, "GET"),
        ("/api/industry/profile", get_context, "GET"),
        ("/api/business/industry", get_context, "GET"),
        ("/api/industry/context", save_context, "POST"),
        ("/api/industry/profile", save_context, "POST"),
        ("/api/business/industry", save_context, "POST"),
    ]:
        remove_route(path, method)
        app.add_api_route(path, endpoint, methods=[method])

    INSTALLED.add(name)


class Loader(importlib.abc.Loader):
    def __init__(self, original):
        self.original = original
    def create_module(self, spec):
        return self.original.create_module(spec) if hasattr(self.original, "create_module") else None
    def exec_module(self, module):
        self.original.exec_module(module)
        install(module)


class Finder(importlib.abc.MetaPathFinder):
    def find_spec(self, fullname, path=None, target=None):
        if fullname not in TARGETS:
            return None
        spec = importlib.machinery.PathFinder.find_spec(fullname, path)
        if spec and spec.loader and not isinstance(spec.loader, Loader):
            spec.loader = Loader(spec.loader)
        return spec


if not any(isinstance(finder, Finder) for finder in sys.meta_path):
    sys.meta_path.insert(0, Finder())
for module_name in list(TARGETS):
    loaded = sys.modules.get(module_name)
    if loaded:
        install(loaded)
