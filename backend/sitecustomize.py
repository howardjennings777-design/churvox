try:
    import builtins
    from fastapi import Body
    if not hasattr(builtins, "Body"):
        builtins.Body = Body
except Exception:
    pass

# CLEAN CHURVOX STARTUP:
# Only load the one strong slip system. Old AI/operator/slip auto-register files were fighting each other.
try:
    try:
        from strong_slips_autoregister import install as _install_strong_slips
    except Exception:
        from backend.strong_slips_autoregister import install as _install_strong_slips
    _install_strong_slips()
except Exception:
    pass
