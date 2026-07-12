from pathlib import Path

source_path = Path("scripts/churvox_growth_pack_checkout_apply.py")
source = source_path.read_text()
replacements = {
    "jsx.includes('Growth Packs are only available with Command'))],": "jsx.includes('Growth Packs are only available with Command')],",
    "css.includes('grid-template-columns: 1fr'))],": "css.includes('grid-template-columns: 1fr')],",
}
for old, new in replacements.items():
    source = source.replace(old, new)
    if old in source:
        raise SystemExit(f"Growth Pack contract correction did not apply: {old}")
exec(compile(source, str(source_path), "exec"), {"__name__": "__main__"})
