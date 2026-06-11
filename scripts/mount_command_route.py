#!/usr/bin/env python3
from pathlib import Path
import os
import re
import sys

root = Path.cwd()

route_file = root / "backend/routes/commandRoutes.js"
if not route_file.exists():
    raise SystemExit("Missing backend/routes/commandRoutes.js")

js_files = []
for base in [root / "backend", root / "server", root / "api"]:
    if not base.exists():
        continue
    for p in base.rglob("*.js"):
        if any(part in {"node_modules", "build", "dist"} for part in p.parts):
            continue
        js_files.append(p)

if not js_files:
    raise SystemExit("No backend JS files found")

def read(p):
    return p.read_text(encoding="utf-8", errors="ignore")

candidates = []

for p in js_files:
    text = read(p)
    score = 0

    if re.search(r'app\.use\s*\(', text):
        score += 10
    if re.search(r'/api/auth|authRoutes|authRouter', text, re.I):
        score += 20
    if re.search(r'/api/(jobs|clients|quotes|invoices|admin|invite)', text, re.I):
        score += 12
    if re.search(r'express\s*\(', text):
        score += 8
    if re.search(r'cors\s*\(', text):
        score += 6
    if re.search(r'app\.listen|server\.listen', text):
        score += 6
    if re.search(r'module\.exports\s*=\s*app', text):
        score += 6

    if score:
        candidates.append((score, p, text.count("app.use")))

candidates.sort(reverse=True, key=lambda item: item[0])

print("---- backend mount candidates ----")
for score, p, uses in candidates[:20]:
    print(f"{score:>3}  app.use={uses:<3}  {p.relative_to(root)}")

if not candidates:
    raise SystemExit("No likely backend mount file found")

mount_file = candidates[0][1]
text = read(mount_file)

print(f"---- chosen mount file: {mount_file.relative_to(root)} ----")

relative = os.path.relpath(route_file, mount_file.parent).replace("\\", "/")
if relative.endswith(".js"):
    relative = relative[:-3]
if not relative.startswith("."):
    relative = "./" + relative

require_line = f'const commandRoutes = require("{relative}");'
mount_line = 'app.use("/api/command", commandRoutes);'

if "/api/command" in text:
    print("Command route already mounted.")
    sys.exit(0)

# Add require after last require/import.
if "commandRoutes" not in text:
    matches = list(re.finditer(
        r'^(?:const|let|var)\s+.+?=\s+require\(.+?\);|^import\s+.+?;$',
        text,
        flags=re.M
    ))

    if matches:
        pos = matches[-1].end()
        text = text[:pos] + "\n" + require_line + text[pos:]
    else:
        text = require_line + "\n" + text

# Insert beside existing API route mounts.
api_mounts = list(re.finditer(r'app\.use\s*\(\s*[\'"`]/api/[^\'"`]+[\'"`]\s*,[^;]+;', text, flags=re.S))
json_mw = list(re.finditer(r'app\.use\s*\(\s*express\.json\([^)]*\)\s*\)\s*;', text, flags=re.S))
cors_mw = list(re.finditer(r'app\.use\s*\(\s*cors\([^)]*\)\s*\)\s*;', text, flags=re.S))

if api_mounts:
    pos = api_mounts[-1].end()
elif json_mw:
    pos = json_mw[-1].end()
elif cors_mw:
    pos = cors_mw[-1].end()
else:
    listen = re.search(r'\n\s*(?:app|server)\.listen\s*\(', text)
    pos = listen.start() if listen else len(text)

text = text[:pos] + "\n" + mount_line + text[pos:]

mount_file.write_text(text, encoding="utf-8")

print(f"Mounted /api/command in {mount_file.relative_to(root)}")
