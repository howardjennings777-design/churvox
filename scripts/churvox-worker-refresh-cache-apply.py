from pathlib import Path

path = Path("frontend/src/churvox-office-lab/officeTeamApi.js")
text = path.read_text(encoding="utf-8")

marker = 'export const WORKER_LIVE_READ_BUILD = "churvox-worker-live-read-no-cache-20260713b";'
if marker not in text:
    text = text.replace(
        'import API_BASE from "../lib/apiBase";\n',
        'import API_BASE from "../lib/apiBase";\n\nexport const WORKER_LIVE_READ_BUILD = "churvox-worker-live-read-no-cache-20260713b";\nif (typeof window !== "undefined") window.__CHURVOX_WORKER_LIVE_READ_BUILD__ = WORKER_LIVE_READ_BUILD;\n',
        1,
    )

old_fetch = '''      const response = await fetch(`${base}${path}`, {
        credentials: "include",
        headers: authHeaders({ json: false }),
      });'''
new_fetch = '''      const response = await fetch(`${base}${path}`, {
        credentials: "include",
        cache: "no-store",
        headers: authHeaders({ json: false }),
      });'''
if 'cache: "no-store"' not in text:
    if old_fetch not in text:
        raise SystemExit("safeRead fetch block was not found")
    text = text.replace(old_fetch, new_fetch, 1)

old_loop = '''  for (const endpoint of endpoints) {
    try {
      const result = await safeRead(endpoint);'''
new_loop = '''  for (const endpoint of endpoints) {
    try {
      const requestEndpoint = area === "worker"
        ? `${endpoint}${endpoint.includes("?") ? "&" : "?"}ts=${Date.now()}`
        : endpoint;
      const result = await safeRead(requestEndpoint);'''
if 'const requestEndpoint = area === "worker"' not in text:
    if old_loop not in text:
        raise SystemExit("fetchOfficeTeamRows loop was not found")
    text = text.replace(old_loop, new_loop, 1)

path.write_text(text, encoding="utf-8")
print("CHURVOX_WORKER_REFRESH_CACHE_PATCH_APPLIED")
