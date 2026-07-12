from pathlib import Path

source_path = Path("scripts/churvox_growth_pack_checkout_apply.py")
source = source_path.read_text()
source = source.replace(
    "jsx.includes('Growth Packs are only available with Command'))],",
    "jsx.includes('Growth Packs are only available with Command')],",
)
if "Growth Packs are only available with Command'))]," in source:
    raise SystemExit("Growth Pack contract correction did not apply")
exec(compile(source, str(source_path), "exec"), {"__name__": "__main__"})
