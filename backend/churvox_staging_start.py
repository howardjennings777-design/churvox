"""Private read-only staging entrypoint for Churvox.

This wraps the proven production entrypoint without changing the production
startup hook or route stack. Render staging starts this module only.
"""

from __future__ import annotations

import os

os.environ.setdefault("CHURVOX_STAGING_READ_ONLY", "true")

import churvox_start as production_start  # noqa: E402
from churvox_staging_readonly_patch import install as install_staging_guard  # noqa: E402

install_staging_guard(production_start.server)
app = production_start.app
