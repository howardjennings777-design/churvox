from pathlib import Path
import re

ALLOWED = "hello@churvox.com"
EMAIL_RE = re.compile(r"\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b")

SKIP_DIRS = {
    ".git", "node_modules", "build", "dist", ".next", ".venv", "venv",
    "__pycache__", ".pytest_cache", ".mypy_cache", ".cache"
}

TEXT_EXTS = {
    ".py", ".js", ".jsx", ".ts", ".tsx", ".json", ".md", ".txt", ".html",
    ".css", ".scss", ".env", ".example", ".yml", ".yaml", ".cjs", ".mjs",
    ".toml", ".ini", ".cfg", ".sh"
}

changed = []
found = {}

def should_skip(path: Path) -> bool:
    return any(part in SKIP_DIRS for part in path.parts)

def is_text_file(path: Path) -> bool:
    if path.suffix.lower() in TEXT_EXTS:
        return True
    return path.name in {"Dockerfile", "Procfile", ".env", ".env.example"}

for path in Path(".").rglob("*"):
    if not path.is_file() or should_skip(path) or not is_text_file(path):
        continue

    try:
        original = path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        continue

    emails = sorted(set(EMAIL_RE.findall(original)))
    bad = [e for e in emails if e.lower() != ALLOWED]
    if not bad:
        continue

    found[str(path)] = bad

    def repl(match):
        email = match.group(0)
        return email if email.lower() == ALLOWED else ALLOWED

    updated = EMAIL_RE.sub(repl, original)

    if updated != original:
        path.write_text(updated, encoding="utf-8")
        changed.append(str(path))

print("===== EMAILS REPLACED =====")
for file, emails in found.items():
    print(file)
    for email in emails:
        print("  -", email)

print("")
print("===== FILES CHANGED =====")
for file in changed:
    print(file)

if not changed:
    print("No hello@churvox.com emails found.")
