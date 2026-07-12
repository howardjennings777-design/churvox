#!/usr/bin/env python3
from pathlib import Path

source = Path("scripts/churvox_paid_launch_readiness_apply.py").read_text(encoding="utf-8")
source = source.replace(
    "app_marker_old = 'const CHURVOX_DEPLOYMENT_FINGERPRINT = \"churvox-auth-session-authority-20260713d\";'\napp_marker_new = 'const CHURVOX_DEPLOYMENT_FINGERPRINT = \"churvox-paid-launch-readiness-20260713a\";'",
    "app_marker_old = '    version: \"churvox-auth-session-authority-20260713d\",'\napp_marker_new = '    version: \"churvox-paid-launch-readiness-20260713a\",'",
)
if "app_marker_old = '    version:" not in source:
    raise SystemExit("could not rewrite the deployment marker patch")
exec(compile(source, "scripts/churvox_paid_launch_readiness_apply.py", "exec"), {"__name__": "__main__"})
