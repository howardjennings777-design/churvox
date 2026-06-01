try:
    import builtins
    from fastapi import Body
    if not hasattr(builtins, "Body"):
        builtins.Body = Body
except Exception:
    pass
