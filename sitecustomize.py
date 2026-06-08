try:
    import builtins
    from fastapi import Body
    builtins.Body = Body
except Exception:
    pass

try:
    from pymongo.errors import DuplicateKeyError

    class _ChurvoxIgnoredDuplicateResult:
        acknowledged = True
        matched_count = 1
        modified_count = 0
        upserted_id = None
        raw_result = {"ok": 1, "n": 1, "nModified": 0}

    def _should_ignore(exc):
        text = str(exc).lower()
        return "duplicate key" in text and "email_1" in text

    try:
        from motor.motor_asyncio import AsyncIOMotorCollection
        _old_motor_update_one = AsyncIOMotorCollection.update_one

        async def _safe_motor_update_one(self, *args, **kwargs):
            try:
                return await _old_motor_update_one(self, *args, **kwargs)
            except DuplicateKeyError as exc:
                if _should_ignore(exc):
                    return _ChurvoxIgnoredDuplicateResult()
                raise

        AsyncIOMotorCollection.update_one = _safe_motor_update_one
    except Exception:
        pass
except Exception:
    pass

try:
    import importlib
    import importlib.abc
    import importlib.machinery
    import logging
    import sys

    logger = logging.getLogger(__name__)
    _AI_OPERATOR_TARGETS = {"server", "backend.server"}
    _AI_OPERATOR_INSTALLED = set()

    def _install_ai_operator_for_module(module):
        name = getattr(module, "__name__", "")
        if name in _AI_OPERATOR_INSTALLED:
            return
        app = getattr(module, "app", None)
        db = getattr(module, "db", None)
        get_current_user = getattr(module, "get_current_user", None)
        require_employer = getattr(module, "require_employer", None)
        if not app or db is None or not get_current_user:
            return
        try:
            try:
                routes = importlib.import_module("backend.ai_operator_routes")
            except Exception:
                routes = importlib.import_module("ai_operator_routes")
            routes.install(app, db, get_current_user, require_employer)
            _AI_OPERATOR_INSTALLED.add(name)
            logger.info("Installed AI Operator routes for %s", name)
        except Exception as exc:
            logger.exception("Could not install AI Operator routes: %s", exc)

    class _ChurvoxAiOperatorLoader(importlib.abc.Loader):
        def __init__(self, original_loader):
            self.original_loader = original_loader

        def create_module(self, spec):
            if hasattr(self.original_loader, "create_module"):
                return self.original_loader.create_module(spec)
            return None

        def exec_module(self, module):
            self.original_loader.exec_module(module)
            _install_ai_operator_for_module(module)

    class _ChurvoxAiOperatorFinder(importlib.abc.MetaPathFinder):
        def find_spec(self, fullname, path=None, target=None):
            if fullname not in _AI_OPERATOR_TARGETS:
                return None
            spec = importlib.machinery.PathFinder.find_spec(fullname, path)
            if spec and spec.loader and not isinstance(spec.loader, _ChurvoxAiOperatorLoader):
                spec.loader = _ChurvoxAiOperatorLoader(spec.loader)
            return spec

    if not any(isinstance(finder, _ChurvoxAiOperatorFinder) for finder in sys.meta_path):
        sys.meta_path.insert(0, _ChurvoxAiOperatorFinder())

    for _module_name in list(_AI_OPERATOR_TARGETS):
        _module = sys.modules.get(_module_name)
        if _module:
            _install_ai_operator_for_module(_module)
except Exception:
    pass
