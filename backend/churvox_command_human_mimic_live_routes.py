from __future__ import annotations

try:
    from churvox_command_human_mimic_v3_routes import build_command_human_mimic_v3_router
except Exception:
    from .churvox_command_human_mimic_v3_routes import build_command_human_mimic_v3_router


class _CommandSlipCollectionView:
    """Hide strict-v3 slips only from the legacy candidate builder.

    The v2 builder uses find_one without a version filter as an early duplicate
    check. Strict v3 must rebuild the candidate every scan so it can compare the
    current evidence fingerprint with the existing v3 decision. V3's own queries
    explicitly include payload.human_mimic_intelligence_v3 and still see the real
    collection unchanged.
    """

    def __init__(self, real_collection):
        self.real_collection = real_collection

    async def find_one(self, query=None, *args, **kwargs):
        query = dict(query or {})
        version_filter = query.get("payload.human_mimic_intelligence_v3")
        if version_filter is None:
            query["payload.human_mimic_intelligence_v3"] = {"$ne": True}
        return await self.real_collection.find_one(query, *args, **kwargs)

    def __getattr__(self, name):
        return getattr(self.real_collection, name)


class _StrictLiveDBView:
    def __init__(self, real_db):
        self.real_db = real_db
        self.command_slips_view = _CommandSlipCollectionView(real_db["command_slips"])

    def __getitem__(self, name):
        if name == "command_slips":
            return self.command_slips_view
        return self.real_db[name]

    def __getattr__(self, name):
        return self[name]


def build_command_human_mimic_live_router(db, get_current_user, ObjectId):
    return build_command_human_mimic_v3_router(_StrictLiveDBView(db), get_current_user, ObjectId)
