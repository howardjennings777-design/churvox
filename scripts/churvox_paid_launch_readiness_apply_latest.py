#!/usr/bin/env python3
from pathlib import Path

source = Path("scripts/churvox_paid_launch_readiness_apply_v5.py").read_text(encoding="utf-8")
exec(compile(source, "scripts/churvox_paid_launch_readiness_apply_v5.py", "exec"), {"__name__": "__main__"})
