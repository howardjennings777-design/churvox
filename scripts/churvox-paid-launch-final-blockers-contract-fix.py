from pathlib import Path

path = Path("scripts/churvox-hardcore-owner-worker-audit.cjs")
text = path.read_text(encoding="utf-8")
old = '''check(
  'live owner and worker screens never inject sample records',
  all(liveRows, [
    'const allowFallback = isOfficeTeamPreviewRoute()',
    'source: rows.length ? "live" : allowFallback ? "preview" : "empty"',
    'rows: [],',
  ])
    && officeApi.includes('worker: ["/api/worker/jobs"]')
    && officeApi.includes('staff: ["/api/team/workers", "/api/team", "/api/workers"]'),
  'Fallback rows are acceptable only in the explicit lab routes',
);'''
new = '''check(
  'live owner and worker screens never inject sample records',
  liveRows.includes('const allowFallback = isOfficeTeamPreviewRoute()')
    && (
      liveRows.includes('source: rows.length ? "live" : allowFallback ? "preview" : "empty"')
      || liveRows.includes('source: nextRows.length ? "live" : allowFallback ? "preview" : "empty"')
    )
    && liveRows.includes('rows: [],')
    && officeApi.includes('worker: ["/api/worker/jobs"]')
    && officeApi.includes('staff: ["/api/team/workers", "/api/team", "/api/workers"]'),
  'Fallback rows are acceptable only in the explicit lab routes',
);'''
if old not in text:
    raise SystemExit("Expected live-row truth contract was not found")
path.write_text(text.replace(old, new, 1), encoding="utf-8")
print("PAID_LAUNCH_LIVE_ROWS_CONTRACT_ALIGNED")
