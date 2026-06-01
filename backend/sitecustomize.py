try:
    import builtins
    from fastapi import Body
    if not hasattr(builtins, "Body"):
        builtins.Body = Body
except Exception:
    pass

for module_name, fn_name in [
    ("ai_command_autoregister", "_install_ai_command_hub"),
    ("proof_pack_autoregister", "_install_proof_pack_routes"),
    ("real_operator_autoregister", "_install_real_operator_routes"),
    ("live_operator_autoregister", "_install_live_operator_routes"),
    ("deep_slips_autoregister", "_install_deep_slips_routes"),
    ("deep_slip_list_autoregister", "_install_safe_deep_slip_list"),
]:
    try:
        mod = __import__(module_name, fromlist=["install"])
        mod.install()
    except Exception:
        try:
            mod = __import__(f"backend.{module_name}", fromlist=["install"])
            mod.install()
        except Exception:
            pass

# CHURVOX_STRONG_SLIPS_AUTOREGISTER
try:
    try:
        from strong_slips_autoregister import install as _install_strong_slips
    except Exception:
        from backend.strong_slips_autoregister import install as _install_strong_slips
    _install_strong_slips()
except Exception:
    pass
