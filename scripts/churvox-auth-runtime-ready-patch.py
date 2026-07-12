from pathlib import Path

path = Path(__file__).resolve().parents[1] / "frontend/src/index.js"
text = path.read_text(encoding="utf-8")
old = "  window.addEventListener('popstate', checkRuntimeLoads);\n  window.addEventListener('hashchange', checkRuntimeLoads);\n  window.addEventListener('churvox-auth-state', checkRuntimeLoads);"
new = "  window.addEventListener('popstate', checkRuntimeLoads);\n  window.addEventListener('hashchange', checkRuntimeLoads);\n  window.addEventListener('churvox-auth-state', checkRuntimeLoads);\n  window.addEventListener('churvox-owner-app-ready', checkRuntimeLoads);\n  window.addEventListener('churvox-worker-app-ready', checkRuntimeLoads);"
if text.count(old) != 1:
    raise RuntimeError(f"runtime ready listener anchor count was {text.count(old)}")
path.write_text(text.replace(old, new, 1), encoding="utf-8")
print("Added authenticated owner/worker runtime ready listeners.")
