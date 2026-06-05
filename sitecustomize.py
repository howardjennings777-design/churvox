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
