#!/usr/bin/env python3
from pathlib import Path

source = Path("scripts/churvox_paid_launch_readiness_apply_v5.py").read_text(encoding="utf-8")
exec(compile(source, "scripts/churvox_paid_launch_readiness_apply_v5.py", "exec"), {"__name__": "__main__"})

path = Path("backend/churvox_command_human_mimic_v3_routes.py")
text = path.read_text(encoding="utf-8")
old = '''        request_words = bool(re.search(r"\\b(can|could|would|when|where|how|what|why|book|available|appointment|schedule|invoice|price|cost|charge|payment|late|delay|change|cancel|help|please)\\b", text)) or "?" in body
        acknowledgement = bool(re.fullmatch(r"[\\s\\W]*(thanks|thank you|great|perfect|awesome|ok|okay|cheers|all good)[\\s\\W]*", text))
        return bool(request_words or not acknowledgement)
'''
new = '''        request_words = bool(re.search(r"\\b(can|could|would|when|where|how|what|why|book|available|appointment|schedule|invoice|price|cost|charge|payment|late|delay|change|cancel|help|please)\\b", text)) or "?" in body
        acknowledgement = bool(re.fullmatch(r"[\\s\\W]*(thanks|thank you|great|perfect|awesome|ok|okay|cheers|all good)[\\s\\W]*", text))
        informational_preference = memory_candidate(body) and not request_words
        if informational_preference:
            return False
        return bool(request_words or not acknowledgement)
'''
if new in text:
    print("already patched: informational preference reply suppression")
elif old in text:
    path.write_text(text.replace(old, new, 1), encoding="utf-8")
    print("patched: informational preference reply suppression")
else:
    raise SystemExit("missing anchor for informational preference reply suppression")

final = path.read_text(encoding="utf-8")
if "informational_preference = memory_candidate(body) and not request_words" not in final:
    raise SystemExit("informational preference reply suppression did not apply")
