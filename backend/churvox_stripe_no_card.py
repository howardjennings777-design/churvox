"""Deprecated Stripe helper.

No runtime monkey-patching here. Stripe trial behaviour belongs in the real
billing checkout route: backend/churvox_plan_consistency.py.
"""

from __future__ import annotations

def install_no_card_trial_defaults():
    return True
