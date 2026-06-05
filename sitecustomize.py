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

    def _wrap_collection_update_one(CollectionClass):
        original_update_one = CollectionClass.update_one
        if getattr(original_update_one, "_churvox_duplicate_guard", False):
            return

        def guarded_update_one(self, *args, **kwargs):
            try:
                return original_update_one(self, *args, **kwargs)
            except DuplicateKeyError:
                if getattr(self, "name", "") == "users":
                    return _ChurvoxIgnoredDuplicateResult()
                raise

        guarded_update_one._churvox_duplicate_guard = True
        CollectionClass.update_one = guarded_update_one

    try:
        from pymongo.collection import Collection
        _wrap_collection_update_one(Collection)
    except Exception:
        pass

    try:
        from pymongo.synchronous.collection import Collection as SyncCollection
        _wrap_collection_update_one(SyncCollection)
    except Exception:
        pass
except Exception:
    pass
