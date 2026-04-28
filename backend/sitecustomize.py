"""Auto-install Churvox launch/top-player boot layers when backend server loads.

Python imports sitecustomize automatically on startup when this directory is on
sys.path. Render/uvicorn commonly starts from backend with `server:app`, so this
small import hook safely installs focused boot modules without editing server.py.
"""
from __future__ import annotations

import importlib.abc
import importlib.machinery
import sys


class _ServerBootLoader(importlib.abc.Loader):
    def __init__(self, wrapped):
        self.wrapped = wrapped

    def create_module(self, spec):
        if hasattr(self.wrapped, "create_module"):
            return self.wrapped.create_module(spec)
        return None

    def exec_module(self, module):
        self.wrapped.exec_module(module)
        boot_steps = [
            ("top_player_boot", "install_top_player_boot", "TOP_PLAYER_BOOT_INSTALL_ERR"),
            ("platform_admin_boot", "install_platform_admin_boot", "PLATFORM_ADMIN_BOOT_INSTALL_ERR"),
            ("business_reports_boot", "install_business_reports_boot", "BUSINESS_REPORTS_BOOT_INSTALL_ERR"),
            ("followups_boot", "install_followups_boot", "FOLLOWUPS_BOOT_INSTALL_ERR"),
            ("recurring_jobs_boot", "install_recurring_jobs_boot", "RECURRING_JOBS_BOOT_INSTALL_ERR"),
            ("checklist_automation_boot", "install_checklist_automation_boot", "CHECKLIST_AUTOMATION_BOOT_INSTALL_ERR"),
            ("notifications_boot", "install_notifications_boot", "NOTIFICATIONS_BOOT_INSTALL_ERR"),
            ("job_invoice_boot", "install_job_invoice_boot", "JOB_INVOICE_BOOT_INSTALL_ERR"),
            ("quote_job_boot", "install_quote_job_boot", "QUOTE_JOB_BOOT_INSTALL_ERR"),
            ("client_360_boot", "install_client_360_boot", "CLIENT_360_BOOT_INSTALL_ERR"),
            ("launch_audit_boot", "install_launch_audit_boot", "LAUNCH_AUDIT_BOOT_INSTALL_ERR"),
            ("launch_ops_boot", "install_launch_ops_boot", "LAUNCH_OPS_BOOT_INSTALL_ERR"),
            ("ai_router", "install_ai_router", "AI_ASSISTANT_BOOT_INSTALL_ERR"),
        ]
        for module_name, function_name, error_label in boot_steps:
            try:
                boot_module = __import__(module_name, fromlist=[function_name])
                getattr(boot_module, function_name)(module)
            except Exception as exc:
                print(f"{error_label} {exc}")


class _ServerBootFinder(importlib.abc.MetaPathFinder):
    def find_spec(self, fullname, path=None, target=None):
        if fullname != "server":
            return None
        spec = importlib.machinery.PathFinder.find_spec(fullname, path)
        if not spec or not spec.loader:
            return spec
        if isinstance(spec.loader, _ServerBootLoader):
            return spec
        spec.loader = _ServerBootLoader(spec.loader)
        return spec


if not any(isinstance(finder, _ServerBootFinder) for finder in sys.meta_path):
    sys.meta_path.insert(0, _ServerBootFinder())
