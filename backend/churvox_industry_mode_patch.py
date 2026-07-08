from __future__ import annotations

from datetime import datetime, timezone
import importlib
import importlib.abc
import importlib.machinery
import sys

TARGETS = {"server", "backend.server"}
INSTALLED = set()
SOURCE = "churvox_industry_mode"


def text(value):
    return str(value or "").strip()


def key(value):
    return "".join(ch for ch in text(value).lower() if ch.isalnum())


def now():
    return datetime.now(timezone.utc).isoformat()


def profile(
    profile_key,
    name,
    mode,
    group,
    description,
    labels,
    required,
    optional,
    hidden,
    command,
    templates,
    quick_setup,
):
    return {
        "key": profile_key,
        "name": name,
        "mode": mode,
        "group": group,
        "description": description,
        "labels": labels,
        "required_features": required,
        "optional_features": optional,
        "hide_by_default": hidden,
        "command_signals": command,
        "templates": templates,
        "quick_setup": quick_setup,
    }


PROFILES = [
    profile(
        "field_service",
        "Field service / trade",
        "field_service",
        "Trades & field work",
        "For jobs done at customer sites: tradies, maintenance, repairs, landscaping, pest, pool and mobile work.",
        {"jobs": "Jobs", "job": "Job", "workers": "Workers", "client": "Client", "schedule": "Run sheet", "proof": "Proof", "quote": "Quote", "invoice": "Invoice"},
        ["client records", "job scheduling", "site address", "worker assignment", "proof photos", "quotes", "invoices", "owner approvals"],
        ["GPS / onsite signal", "recurring jobs", "Xero draft sync", "payroll review", "client reminders"],
        [],
        ["job issue", "worker needs decision", "quote ready", "invoice ready", "unassigned job", "customer reply", "payment problem"],
        ["New job", "Quote follow-up", "Invoice review", "Worker issue", "Customer reply"],
        ["Add service areas", "Add workers", "Add common services", "Turn on proof photos", "Choose recurring defaults"],
    ),
    profile(
        "lawn_landscape",
        "Lawn care / landscaping",
        "field_service",
        "Trades & field work",
        "Recurring outdoor work, crews, route days, proof photos, weather delays and quotes for bigger jobs.",
        {"jobs": "Jobs", "job": "Job", "workers": "Crew", "client": "Client", "schedule": "Run sheet", "proof": "Photos", "quote": "Quote", "invoice": "Invoice"},
        ["recurring visits", "site access notes", "crew assignment", "before/after photos", "weather delay notes", "quotes", "invoices"],
        ["GPS / route view", "materials", "seasonal reminders", "Xero draft sync"],
        [],
        ["weather delay", "extra work found", "gate locked", "crew running late", "quote needed", "invoice ready"],
        ["Mow visit", "Garden tidy", "Landscape quote", "Weather delay", "Extra work approval"],
        ["Set recurring defaults", "Add service zones", "Add crew", "Add access-note fields", "Enable photo proof"],
    ),
    profile(
        "cleaning",
        "Cleaning / housekeeping",
        "visit_service",
        "Recurring visits",
        "For residential or commercial cleaning where checklists, keys, access notes and repeat visits matter.",
        {"jobs": "Visits", "job": "Visit", "workers": "Cleaners", "client": "Client", "schedule": "Visit sheet", "proof": "Checklist", "quote": "Estimate", "invoice": "Invoice"},
        ["recurring visits", "cleaning checklist", "access notes", "key/alarm notes", "assigned cleaner", "before/after photos", "invoices"],
        ["GPS optional", "supplies", "inspection notes", "client reminders"],
        [],
        ["access problem", "client not ready", "cleaner late", "checklist failed", "extra time needed", "invoice overdue"],
        ["Weekly clean", "End-of-tenancy clean", "Checklist issue", "Access problem", "Extra time approval"],
        ["Create checklists", "Add access-note fields", "Set repeat visits", "Add cleaners", "Enable proof photos"],
    ),
    profile(
        "property_maintenance",
        "Property maintenance / handyman",
        "field_service",
        "Trades & field work",
        "Mixed jobs, quotes, site notes, photos, materials, client replies and owner decisions.",
        {"jobs": "Jobs", "job": "Job", "workers": "Workers", "client": "Client", "schedule": "Run sheet", "proof": "Proof", "quote": "Quote", "invoice": "Invoice"},
        ["job scheduling", "site notes", "materials", "photos", "quotes", "invoices", "worker updates"],
        ["GPS / onsite signal", "recurring maintenance", "Xero draft sync"],
        [],
        ["extra materials", "cannot finish", "quote needed", "tenant not home", "invoice ready", "owner decision"],
        ["Small repair", "Maintenance visit", "Tenant access issue", "Material approval", "Invoice review"],
        ["Add job types", "Add material fields", "Add workers", "Enable proof photos", "Set quote defaults"],
    ),
    profile(
        "plumbing_electrical_hvac",
        "Plumbing / electrical / HVAC",
        "field_service",
        "Trades & field work",
        "Urgent calls, diagnosis, compliance notes, materials, technician updates, quotes and invoices.",
        {"jobs": "Jobs", "job": "Job", "workers": "Technicians", "client": "Client", "schedule": "Dispatch", "proof": "Job proof", "quote": "Quote", "invoice": "Invoice"},
        ["dispatch schedule", "site address", "technician assignment", "diagnosis notes", "materials", "photos", "quotes", "invoices"],
        ["GPS / onsite signal", "emergency priority", "compliance note", "Xero draft sync"],
        [],
        ["urgent job", "parts needed", "safety note", "quote approval", "job cannot continue", "invoice ready"],
        ["Call-out", "Repair", "Install", "Parts approval", "Safety note"],
        ["Add technician skills", "Add call-out fees", "Add material fields", "Set urgent priority", "Enable proof photos"],
    ),
    profile(
        "painting_building",
        "Painting / building projects",
        "project_service",
        "Projects & quoted work",
        "Quoted projects with stages, deposits, variations, progress photos, workers and invoices.",
        {"jobs": "Projects", "job": "Project", "workers": "Crew", "client": "Client", "schedule": "Project plan", "proof": "Progress photos", "quote": "Quote", "invoice": "Invoice"},
        ["quotes", "project stages", "deposit tracking", "variation approvals", "crew assignment", "progress photos", "invoices"],
        ["GPS optional", "materials", "milestone invoices", "Xero draft sync"],
        ["simple daily route"],
        ["variation requested", "deposit missing", "stage complete", "materials needed", "quote ready", "invoice ready"],
        ["Project quote", "Stage check", "Variation approval", "Deposit reminder", "Progress invoice"],
        ["Create project stages", "Add deposit defaults", "Add variation fields", "Add crew", "Enable progress photos"],
    ),
    profile(
        "appointment_beauty",
        "Hair / barber / beauty",
        "appointment_service",
        "Appointments",
        "For salons, barbers, brows, lashes, beauty and wellness rooms where appointments, deposits and client history matter.",
        {"jobs": "Appointments", "job": "Appointment", "workers": "Staff", "client": "Client", "schedule": "Calendar", "proof": "Before/after", "quote": "Consult", "invoice": "Payment"},
        ["appointment calendar", "services", "duration", "staff", "client notes", "deposit / cancellation policy", "reminders", "payments"],
        ["before/after photos", "rebooking prompts", "retail products", "waitlist", "forms"],
        ["GPS / onsite signal", "route view", "field slips", "site access"],
        ["late cancellation", "deposit missing", "client message", "rebook due", "staff double-booked", "appointment running over", "payment unpaid"],
        ["Cut", "Colour", "Barber service", "Consult", "Deposit reminder", "Rebook message"],
        ["Add services and durations", "Add staff", "Set deposit rules", "Turn on reminders", "Add client note fields"],
    ),
    profile(
        "nails_lashes_brows",
        "Nails / lashes / brows",
        "appointment_service",
        "Appointments",
        "Detailed appointment work with add-ons, product notes, client preferences, photos, deposits and rebooking.",
        {"jobs": "Appointments", "job": "Appointment", "workers": "Artists", "client": "Client", "schedule": "Calendar", "proof": "Photo history", "quote": "Consult", "invoice": "Payment"},
        ["appointment calendar", "services and add-ons", "duration", "client preferences", "product notes", "deposit policy", "reminders", "payments"],
        ["photo history", "rebooking prompts", "forms", "retail products"],
        ["GPS / onsite signal", "route view", "field slips", "site access"],
        ["deposit missing", "client no-show", "allergy note", "rebook due", "appointment overrun", "payment unpaid"],
        ["Full set", "Fill", "Lash set", "Brow service", "Product note", "Rebook message"],
        ["Add service durations", "Add product-note fields", "Set deposit rules", "Turn on reminders", "Enable photo history"],
    ),
    profile(
        "mobile_beauty_wellness",
        "Mobile beauty / wellness",
        "mobile_appointment_service",
        "Mobile appointments",
        "Appointment business that travels to clients: mobile hair, nails, massage, pet grooming and wellness.",
        {"jobs": "Appointments", "job": "Appointment", "workers": "Staff", "client": "Client", "schedule": "Route calendar", "proof": "Notes/photos", "quote": "Consult", "invoice": "Payment"},
        ["appointment calendar", "client address", "travel buffer", "services", "duration", "deposit policy", "reminders", "payments"],
        ["GPS / route optional", "before/after photos", "forms", "rebooking prompts"],
        [],
        ["travel clash", "deposit missing", "client not home", "running late", "rebook due", "payment unpaid"],
        ["Mobile appointment", "Travel buffer", "Deposit reminder", "Running late message", "Rebook message"],
        ["Add travel buffer", "Add service areas", "Add service durations", "Set deposits", "Turn on reminders"],
    ),
    profile(
        "massage_wellness",
        "Massage / wellness / fitness",
        "appointment_service",
        "Appointments",
        "Appointments, client notes, forms, packages, reminders, payments and rebooking without field-service clutter.",
        {"jobs": "Appointments", "job": "Appointment", "workers": "Practitioners", "client": "Client", "schedule": "Calendar", "proof": "Session notes", "quote": "Plan", "invoice": "Payment"},
        ["appointment calendar", "services", "duration", "client notes", "forms", "packages", "reminders", "payments"],
        ["rebooking prompts", "membership/package tracking", "room/resource booking"],
        ["GPS / onsite signal", "route view", "field slips", "site access"],
        ["form missing", "client no-show", "package nearly used", "rebook due", "payment unpaid", "room clash"],
        ["Session", "Package", "Form reminder", "Rebook message", "Payment reminder"],
        ["Add services", "Add forms", "Set package defaults", "Turn on reminders", "Add practitioners"],
    ),
    profile(
        "pet_grooming",
        "Pet grooming",
        "appointment_service",
        "Appointments",
        "Salon or mobile grooming with pet profiles, coat notes, appointment reminders, photos and payments.",
        {"jobs": "Appointments", "job": "Appointment", "workers": "Groomers", "client": "Owner", "schedule": "Calendar", "proof": "Pet notes/photos", "quote": "Estimate", "invoice": "Payment"},
        ["appointment calendar", "pet profile", "service duration", "coat/behaviour notes", "reminders", "payments", "photos"],
        ["mobile address", "rebooking prompts", "vaccination note", "forms"],
        ["heavy field dispatch"],
        ["pet note needed", "client no-show", "running over", "rebook due", "payment unpaid", "mobile travel clash"],
        ["Groom", "Wash", "Clip", "Pet note", "Rebook message", "Payment reminder"],
        ["Add pet-profile fields", "Add services", "Set durations", "Turn on reminders", "Choose salon or mobile"],
    ),
    profile(
        "coaching_tutoring",
        "Coaching / tutoring / lessons",
        "appointment_service",
        "Appointments",
        "Sessions, packages, client/student notes, reminders, attendance, payments and follow-up.",
        {"jobs": "Sessions", "job": "Session", "workers": "Coaches", "client": "Client", "schedule": "Calendar", "proof": "Session notes", "quote": "Plan", "invoice": "Payment"},
        ["session calendar", "client/student notes", "packages", "attendance", "reminders", "payments"],
        ["online meeting link", "resources", "progress notes", "rebooking prompts"],
        ["GPS / onsite signal", "field slips", "route view"],
        ["attendance missed", "package nearly used", "payment unpaid", "rebook due", "follow-up needed"],
        ["Session", "Package", "Attendance note", "Follow-up", "Payment reminder"],
        ["Add session types", "Add package defaults", "Add reminder rules", "Add progress-note fields", "Add coaches"],
    ),
    profile(
        "events_photography",
        "Events / photography / creative services",
        "project_service",
        "Projects & quoted work",
        "Enquiries, quotes, deposits, event dates, project stages, proof galleries, invoices and client messages.",
        {"jobs": "Bookings", "job": "Booking", "workers": "Team", "client": "Client", "schedule": "Bookings", "proof": "Deliverables", "quote": "Proposal", "invoice": "Invoice"},
        ["booking date", "proposal/quote", "deposit", "project stages", "deliverables", "client messages", "invoices"],
        ["second shooter/team", "travel", "gallery link", "contract/form"],
        ["field-service GPS by default"],
        ["deposit missing", "event soon", "deliverable overdue", "proposal ready", "client reply", "invoice due"],
        ["Event booking", "Proposal", "Deposit reminder", "Deliverable check", "Invoice review"],
        ["Add booking types", "Set deposit defaults", "Add deliverable stages", "Add forms", "Add team"],
    ),
]

PROFILE_BY_KEY = {item["key"]: item for item in PROFILES}
ALIASES = {
    "hair": "appointment_beauty",
    "hairdresser": "appointment_beauty",
    "barber": "appointment_beauty",
    "salon": "appointment_beauty",
    "beauty": "appointment_beauty",
    "nail": "nails_lashes_brows",
    "nails": "nails_lashes_brows",
    "lashes": "nails_lashes_brows",
    "brows": "nails_lashes_brows",
    "massage": "massage_wellness",
    "wellness": "massage_wellness",
    "fitness": "massage_wellness",
    "cleaner": "cleaning",
    "cleaning": "cleaning",
    "landscaping": "lawn_landscape",
    "lawn": "lawn_landscape",
    "gardening": "lawn_landscape",
    "plumber": "plumbing_electrical_hvac",
    "plumbing": "plumbing_electrical_hvac",
    "electrician": "plumbing_electrical_hvac",
    "electrical": "plumbing_electrical_hvac",
    "hvac": "plumbing_electrical_hvac",
    "builder": "painting_building",
    "painting": "painting_building",
    "painter": "painting_building",
    "handyman": "property_maintenance",
    "maintenance": "property_maintenance",
    "pet": "pet_grooming",
    "grooming": "pet_grooming",
    "tutor": "coaching_tutoring",
    "coaching": "coaching_tutoring",
    "photography": "events_photography",
    "events": "events_photography",
}


def choose_profile(value):
    raw = key(value)
    if raw in PROFILE_BY_KEY:
        return raw
    for alias, mapped in ALIASES.items():
        if alias in raw:
            return mapped
    return "field_service"


def selected_from_user(user):
    raw = (
        (user or {}).get("industry_profile")
        or (user or {}).get("industry_key")
        or (user or {}).get("business_type")
        or (user or {}).get("profession")
        or "field_service"
    )
    profile_key = choose_profile(raw)
    work_style = text((user or {}).get("work_style") or (user or {}).get("service_location") or "auto") or "auto"
    return profile_key, work_style


def feature_switches(item, work_style="auto"):
    mode = item.get("mode")
    style = key(work_style)
    field_like = mode in {"field_service", "visit_service"} or style in {"mobile", "customersite", "clientsite", "both"}
    appointment_like = mode in {"appointment_service", "mobile_appointment_service"}
    mobile_appointment = mode == "mobile_appointment_service" or style in {"mobile", "both"}
    return {
        "gps": bool(field_like or mobile_appointment),
        "route_view": bool(field_like or mobile_appointment),
        "site_address": bool(field_like or mobile_appointment),
        "appointment_calendar": bool(appointment_like or mobile_appointment),
        "deposits": bool(appointment_like or mode == "project_service"),
        "rebooking": bool(appointment_like),
        "proof_photos": True,
        "quotes": mode != "appointment_service" or item.get("key") in {"events_photography"},
        "invoices": True,
        "worker_app": mode in {"field_service", "visit_service", "mobile_appointment_service"},
        "staff_calendar": appointment_like,
        "recurring": mode in {"visit_service", "field_service", "appointment_service"},
    }


def build_brain(item, work_style="auto"):
    switches = feature_switches(item, work_style)
    labels = item.get("labels", {})
    hidden = list(item.get("hide_by_default") or [])
    if not switches.get("gps") and "GPS / onsite signal" not in hidden:
        hidden.append("GPS / onsite signal")
    return {
        "source": SOURCE,
        "profile_key": item.get("key"),
        "mode": item.get("mode"),
        "work_style": work_style or "auto",
        "labels": labels,
        "feature_switches": switches,
        "hide_by_default": hidden,
        "required_features": item.get("required_features", []),
        "optional_features": item.get("optional_features", []),
        "command_signals": item.get("command_signals", []),
        "templates": item.get("templates", []),
        "quick_setup": item.get("quick_setup", []),
        "copy_rules": [
            f"Use {labels.get('job', 'job').lower()} language instead of generic job language where it helps.",
            "Do not show field/GPS tools when the business is shop or appointment based unless mobile work is selected.",
            "Keep Command as the same approval brain: prepare, explain, ask owner to approve/edit/park.",
            "Only surface tools that match the selected business profile.",
        ],
    }


def context_payload(profile_key="field_service", work_style="auto", saved=False):
    chosen = PROFILE_BY_KEY.get(choose_profile(profile_key), PROFILE_BY_KEY["field_service"])
    return {
        "success": True,
        "source": SOURCE,
        "saved": bool(saved),
        "industry_profile": chosen,
        "industry_key": chosen["key"],
        "work_style": work_style or "auto",
        "brain": build_brain(chosen, work_style or "auto"),
        "updated_at": now(),
    }


def safe_doc(value):
    if isinstance(value, datetime):
        return value.isoformat()
    try:
        from bson import ObjectId
        if isinstance(value, ObjectId):
            return str(value)
    except Exception:
        pass
    if isinstance(value, dict):
        return {k: safe_doc(v) for k, v in value.items() if k not in {"password", "hashed_password", "password_hash", "token", "access_token", "refresh_token"}}
    if isinstance(value, list):
        return [safe_doc(v) for v in value]
    return value


def user_filters(user, ObjectId):
    out = []
    uid = text((user or {}).get("id") or (user or {}).get("_id") or (user or {}).get("user_id"))
    email = text((user or {}).get("email")).lower()
    for field in ["_id", "id", "user_id"]:
        if uid:
            out.append({field: uid})
            try:
                out.append({field: ObjectId(uid)})
            except Exception:
                pass
    if email:
        out.append({"email": email})
    return out or [{"_id": "__never__"}]


def install(module):
    name = getattr(module, "__name__", "")
    if name in INSTALLED:
        return
    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    get_current_user = getattr(module, "get_current_user", None)
    ObjectId = getattr(module, "ObjectId", None)
    if not app or db is None or get_current_user is None or ObjectId is None:
        return

    def remove_route(path, method):
        try:
            app.router.routes = [route for route in app.router.routes if not (getattr(route, "path", "") == path and method.upper() in set(getattr(route, "methods", set()) or set()))]
        except Exception:
            pass

    async def profiles_route(request):
        groups = []
        seen = set()
        for item in PROFILES:
            group = item["group"]
            if group not in seen:
                seen.add(group)
                groups.append(group)
        return {
            "success": True,
            "source": SOURCE,
            "profiles": PROFILES,
            "groups": groups,
            "modes": [
                {"key": "field_service", "name": "Field service", "use_for": "Tradies, maintenance, crews, on-site jobs", "keeps": ["GPS optional", "site address", "proof", "quotes", "invoices"]},
                {"key": "visit_service", "name": "Recurring visits", "use_for": "Cleaning, repeat service runs", "keeps": ["checklists", "access notes", "recurring visits", "proof"]},
                {"key": "appointment_service", "name": "Appointments", "use_for": "Hair, nails, wellness, tutoring", "keeps": ["calendar", "services", "duration", "deposits", "reminders"], "hides": ["GPS", "route view"]},
                {"key": "mobile_appointment_service", "name": "Mobile appointments", "use_for": "Mobile beauty, mobile grooming, home visits", "keeps": ["calendar", "address", "travel buffer", "reminders", "payments"]},
                {"key": "project_service", "name": "Projects", "use_for": "Painting, building, photography, events", "keeps": ["quotes", "deposits", "stages", "deliverables", "invoices"]},
            ],
            "updated_at": now(),
        }

    async def get_context(request):
        user = await get_current_user(request)
        profile_key, work_style = selected_from_user(user)
        saved = bool((user or {}).get("industry_profile") or (user or {}).get("industry_key"))
        return context_payload(profile_key, work_style, saved=saved)

    async def save_context(request):
        user = await get_current_user(request)
        try:
            payload = await request.json()
        except Exception:
            payload = {}
        profile_key = choose_profile(payload.get("industry_key") or payload.get("industry_profile") or payload.get("profile") or payload.get("profession") or payload.get("business_type"))
        work_style = text(payload.get("work_style") or payload.get("service_location") or payload.get("location_mode") or "auto") or "auto"
        selected = PROFILE_BY_KEY.get(profile_key, PROFILE_BY_KEY["field_service"])
        update = {
            "$set": {
                "industry_profile": selected["key"],
                "industry_key": selected["key"],
                "industry_mode": selected["mode"],
                "work_style": work_style,
                "industry_brain": build_brain(selected, work_style),
                "updated_at": datetime.now(timezone.utc),
            }
        }
        filters = user_filters(user, ObjectId)
        try:
            await db.users.update_many({"$or": filters}, update)
        except Exception:
            pass
        try:
            bid = text((user or {}).get("business_id") or (user or {}).get("businessId") or (user or {}).get("owner_business_id"))
            email = text((user or {}).get("email")).lower()
            business_filters = []
            if bid:
                business_filters.append({"_id": bid})
                business_filters.append({"business_id": bid})
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
        response = context_payload(selected["key"], work_style, saved=True)
        response["saved_payload"] = safe_doc({"industry_key": selected["key"], "work_style": work_style})
        return response

    for path, endpoint, method in [
        ("/api/industry/profiles", profiles_route, "GET"),
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
