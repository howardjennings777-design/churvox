from __future__ import annotations

import importlib
import importlib.abc
import importlib.machinery
import sys

TARGETS = {"server", "backend.server"}
INSTALLED = set()

PATCH_MODULES = [
    "churvox_plan_limits_current_patch",
    "churvox_xero_addon_alias_patch",
    "churvox_worker_role_alias_patch",
    "churvox_worker_jobs_read_patch",
    "churvox_xero_routes_install_patch",
    "churvox_worker_complete_elapsed_patch",
    "churvox_monthly_job_limit",
    "churvox_ai_action_limit",
    "churvox_job_timer_routes_patch",
    "churvox_permissions_policy_patch",
    "churvox_old_backend_bridge_patch",
    "churvox_field_truth_patch",
    "churvox_field_truth_fix_patch",
    "churvox_field_truth_hardening_patch",
    "churvox_command_readiness_patch",
    "churvox_command_readiness_fix_patch",
    "churvox_command_readiness_hardening_patch",
    "churvox_approval_execution_patch",
    "churvox_auto_smart_patch",
    "churvox_auto_smart_safe_patch",
    "churvox_auto_smart_memory_patch",
    "churvox_command_truth_guard_patch",
    "churvox_command_execution_safety_patch",
    "churvox_command_trust_desk_routes_patch",
    "churvox_invoice_vault_patch",
    "churvox_invoice_vault_guard_patch",
    "churvox_plan_usage_guard_patch",
    "churvox_top_player_patch",
    "churvox_top_player_fix_patch",
    "churvox_onsite_patch",
    "churvox_logic_audit_hardening_patch",
    "churvox_logic_audit_idempotency_patch",
    "churvox_command_execution_lock_patch",
    "churvox_worker_onsite_signal_patch",
    "churvox_live_ping_onsite_patch",
    "churvox_onsite_beacon_patch",
    "churvox_onsite_debug_patch",
    "churvox_on_site_payments_patch",
    "churvox_terminal_reader_patch",
    "churvox_payment_account_env_patch",
    "churvox_field_loop_patch",
    "churvox_record_bridge_patch",
    "churvox_owner_visibility_v2_patch",
    "churvox_owner_data_debug_patch",
    "churvox_wiring_health_patch",
    "churvox_admin_recovery_patch",
    "churvox_paid_launch_guard_patch",
    "churvox_billing_portal_paid_launch",
    "churvox_account_deletion_paid_launch",
    "churvox_account_deletion_final_patch",
    "churvox_command_approval_tolerant_routes_patch",
    "churvox_payment_setup_live_patch",
    "churvox_worker_job_payment_summary_patch",
    "churvox_owner_messages_command_smarter_patch",
    "churvox_nav_attention_counts_patch",
    "churvox_nav_attention_counts_status_fix_patch",
    "churvox_industry_mode_patch",
    "churvox_industry_mode_request_fix_patch",
    "churvox_business_profile_required_patch",
    "churvox_industry_isolation_patch",
    "churvox_hq_router_mount_patch",
    "churvox_owner_cockpit_control_patch",
    "churvox_tester_email_send_final_patch",
    "churvox_hq_growth_report_patch",
    "churvox_hq_connection_status_patch",
    "churvox_hq_unique_visitors_patch",
    "churvox_conversion_funnel_patch",
    "churvox_hq_tester_status_patch",
    "churvox_tester_email_case_preserve_patch",
    "churvox_hq_tester_system_patch",
    "churvox_public_tester_application_patch",
    "churvox_tester_outreach_desk_patch",
    "churvox_tester_outreach_import_patch",
    "churvox_hq_control_access_final_patch",
    "churvox_business_logic_health_patch",
    "churvox_business_system_suite_patch",
    "churvox_hq_hello_canonical_patch",
    "churvox_hq_hello_only_guard_patch",
    "churvox_worker_command_visibility_patch",
    "churvox_worker_help_command_patch",
    "churvox_worker_field_slip_decision_patch",
    "churvox_job_completion_final_patch",
    "churvox_command_runs_office_patch",
    "churvox_command_runs_office_finalizer_patch",
]


def import_patch(name: str):
    try:
        return importlib.import_module(name)
    except Exception:
        try:
            return importlib.import_module(f"backend.{name}")
        except Exception as exc:
            print(f"Churvox startup patch import skipped {name}: {exc}", file=sys.stderr)
            return None


def install(module):
    module_name = getattr(module, "__name__", "")
    if module_name in INSTALLED:
        return

    for patch_name in PATCH_MODULES:
        patch = import_patch(patch_name)
        installer = getattr(patch, "install", None) if patch else None
        if installer is None:
            continue
        try:
            installer(module)
        except Exception as exc:
            print(f"Churvox startup patch install skipped {patch_name}: {exc}", file=sys.stderr)

    INSTALLED.add(module_name)


class Loader(importlib.abc.Loader):
    def __init__(self, original_loader):
        self.original_loader = original_loader

    def create_module(self, spec):
        if hasattr(self.original_loader, "create_module"):
            return self.original_loader.create_module(spec)
        return None

    def exec_module(self, module):
        self.original_loader.exec_module(module)
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
