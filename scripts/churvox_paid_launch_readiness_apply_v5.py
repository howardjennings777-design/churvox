#!/usr/bin/env python3
from pathlib import Path

source = Path("scripts/churvox_paid_launch_readiness_apply_v4.py").read_text(encoding="utf-8")
exec(compile(source, "scripts/churvox_paid_launch_readiness_apply_v4.py", "exec"), {"__name__": "__main__"})

path = Path("backend/churvox_command_human_mimic_v3_routes.py")
text = path.read_text(encoding="utf-8")

replacements = [
    (
'''        for row in jobs:
            if client and client_key(row) != client:
                continue
            if service and service_key(row) and service_key(row) != service:
                continue
            value = record_date(row)
''',
'''        for row in jobs:
            if not explicitly_complete(row):
                continue
            if client and client_key(row) != client:
                continue
            if service and service_key(row) and service_key(row) != service:
                continue
            value = record_date(row)
''',
"recurrence cycle completed-history filter",
    ),
    (
'''        for row in jobs:
            if client and client_key(row) != client:
                continue
            if service and service_key(row) and service_key(row) != service:
                continue
            name = worker_name(row, "")
''',
'''        for row in jobs:
            if not explicitly_complete(row):
                continue
            if client and client_key(row) != client:
                continue
            if service and service_key(row) and service_key(row) != service:
                continue
            name = worker_name(row, "")
''',
"recurrence worker completed-history filter",
    ),
    (
'''        for row in jobs:
            if client and client_key(row) != client:
                continue
            if service and service_key(row) and service_key(row) != service:
                continue
            value = record_date(row)
            if value is not None and value <= now():
                dates.append(value)
        return max(dates) if dates else None
''',
'''        for row in jobs:
            if not explicitly_complete(row):
                continue
            if client and client_key(row) != client:
                continue
            if service and service_key(row) and service_key(row) != service:
                continue
            value = record_date(row)
            if value is not None and value <= now():
                dates.append(value)
        return max(dates) if dates else None
''',
"recurrence last-visit completed-history filter",
    ),
]

for old, new, label in replacements:
    if new in text:
        print(f"already patched: {label}")
    elif old in text:
        text = text.replace(old, new, 1)
        print(f"patched: {label}")
    else:
        raise SystemExit(f"missing anchor for {label}")

path.write_text(text, encoding="utf-8")
final = path.read_text(encoding="utf-8")
if final.count("if not explicitly_complete(row):") < 3:
    raise SystemExit("completed-history recurrence filters did not all apply")
