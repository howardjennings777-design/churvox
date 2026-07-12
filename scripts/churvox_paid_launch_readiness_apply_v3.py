#!/usr/bin/env python3
from pathlib import Path

# Apply the complete V2 readiness patch first.
source = Path("scripts/churvox_paid_launch_readiness_apply_v2.py").read_text(encoding="utf-8")
exec(compile(source, "scripts/churvox_paid_launch_readiness_apply_v2.py", "exec"), {"__name__": "__main__"})

path = Path("backend/churvox_command_human_mimic_v3_routes.py")
text = path.read_text(encoding="utf-8")
old = '''    def harden_assignment(doc, job):
        if not job or cancelled(job) or explicitly_complete(job):
            return None
        scheduled = record_date(job)
'''
new = '''    def harden_assignment(doc, job):
        if not job or cancelled(job) or explicitly_complete(job):
            return None
        status = status_text(job)
        words = status_words(job)
        unresolved_completion = (
            "incomplete" in words
            or ("not" in words and bool(words & {"complete", "completed"}))
            or status in {"pending completion", "awaiting completion"}
        )
        if unresolved_completion:
            return None
        scheduled = record_date(job)
'''
if new in text:
    print("already patched: strict v3 incomplete assignment exclusion")
elif old in text:
    path.write_text(text.replace(old, new, 1), encoding="utf-8")
    print("patched: strict v3 incomplete assignment exclusion")
else:
    raise SystemExit("missing anchor for strict v3 incomplete assignment exclusion")

final = path.read_text(encoding="utf-8")
if '"incomplete" in words' not in final or 'if unresolved_completion:' not in final:
    raise SystemExit("strict v3 incomplete assignment exclusion did not apply")
