from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text(encoding="utf-8")
    if new in text:
        return
    if old not in text:
        raise SystemExit(f"Expected source block not found in {path}: {old[:180]!r}")
    file.write_text(text.replace(old, new, 1), encoding="utf-8")


worker = "frontend/src/churvox-office-lab/OfficeTeamWorkerRoute.jsx"
replace_once(
    worker,
    'const payKeywords = ["payment", "pay", "invoice", "card", "checkout"];',
    'const payKeywords = ["payment", "pay", "invoice", "card", "checkout"];\nexport const WORKER_MESSAGE_CONTEXT_BUILD = "churvox-worker-message-context-v5-20260713";',
)
replace_once(
    worker,
    '''  async function sendBossUpdate(text = note) {
  if (updateBusy) return;
''',
    '''  async function sendBossUpdate(text = note) {
  if (updateBusy || live.isLoading) return;
''',
)
replace_once(
    worker,
    '''{showMessages ? <><section className="cvWorkerRouteNoteBox"><span>Boss update</span><h3>Send one clear update</h3><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="What changed?" /><button type="button" disabled={updateBusy} onClick={() => sendBossUpdate()}>{updateBusy ? "Sending…" : "Send to Command"}</button></section>''',
    '''{showMessages ? <><section className="cvWorkerRouteNoteBox"><span>Boss update</span><h3>Send one clear update</h3><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="What changed?" /><button type="button" disabled={updateBusy || live.isLoading} onClick={() => sendBossUpdate()}>{updateBusy ? "Sending…" : live.isLoading ? "Loading assigned job…" : "Send to Command"}</button></section>''',
)

marker = Path("frontend/public/churvox-paid-launch-build.json")
marker.write_text(
    '''{
  "build": "churvox-worker-message-context-v5-20260713",
  "backend": "worker-jobs-current-first-v4-20260713",
  "includes": [
    "definitive-worker-jobs-route",
    "current-assignment-first",
    "expanded-worker-live-queue",
    "worker-message-job-context-guard",
    "concise-command-cards",
    "current-wrapper-contract"
  ],
  "safety": "Owner approval remains required. This marker performs no action."
}
''',
    encoding="utf-8",
)

print("CHURVOX_WORKER_MESSAGE_CONTEXT_PATCH_APPLIED")
