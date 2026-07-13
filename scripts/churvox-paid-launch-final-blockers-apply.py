from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text(encoding="utf-8")
    if old not in text:
        raise SystemExit(f"Expected source block not found in {path}: {old[:120]!r}")
    file.write_text(text.replace(old, new, 1), encoding="utf-8")


site = "frontend/src/churvox-office-lab/OfficeTeamLabSite.jsx"
replace_once(
    site,
    '        .catch(() => setNotice("Command refresh failed. No fallback decisions were shown and nothing changed."));',
    '        .catch(() => setNotice("Command refresh failed. No fallback or browser-only decisions are being shown. Nothing changed."));',
)
replace_once(
    site,
    '    <p className="cvSlipPlainSummary">{plainSlipSummary(item)}</p>',
    '    <p className="cvSlipPlainSummary">{plainSlipSummary(item)}</p>\n    {Array.isArray(item.checked) && item.checked.length ? <section className="cvSlipEvidence"><b>Evidence checked</b><div>{item.checked.slice(0, 5).map((entry, index) => <span key={`${entry}-${index}`}>{briefDecisionText(entry, 72)}</span>)}</div></section> : null}',
)
replace_once(
    site,
    'function Decision({ item, onOpen, selected }) { return <article className={`cvSiteDecisionCard ${selected ? "selected" : ""}`}><div><span>{item.level}</span><em>{item.tray}</em></div><h3>{item.title}</h3><p>{item.happened}</p><dl><dt>Checked</dt><dd>{(item.checked || []).map((x) => <small key={x}>{x}</small>)}</dd><dt>Prepared</dt><dd>{item.prepared}</dd><dt>Owner decision</dt><dd>{item.need}</dd></dl><footer><button type="button" className="openSlip" onClick={onOpen}>Open slip</button></footer><small>Open the full slip to inspect the evidence and prepared form</small></article>; }',
    '''function Decision({ item, onOpen, selected }) {
  const happened = briefDecisionText(item.happened, 96);
  const prepared = briefDecisionText(item.prepared, 88);
  const need = briefDecisionText(item.need, 88);
  return <article className={`cvSiteDecisionCard ${selected ? "selected" : ""}`}><div><span>{item.level}</span><em>{item.tray}</em></div><h3>{item.title}</h3><p>{happened}</p><dl><dt>Checked</dt><dd>{(item.checked || []).slice(0, 5).map((x, index) => <small key={`${x}-${index}`}>{briefDecisionText(x, 64)}</small>)}</dd><dt>Prepared</dt><dd>{prepared}</dd><dt>Owner decision</dt><dd>{need}</dd></dl><footer><button type="button" className="openSlip" onClick={onOpen}>Open slip</button></footer><small>Open the full slip to inspect the evidence and prepared form</small></article>;
}''',
)
replace_once(
    site,
    'function plainSlipSummary(item = {}) { return firstValue(item.happened, item.detail, item.raw?.found, "Churvox found something that needs an owner decision."); }',
    '''function briefDecisionText(value, limit = 96) {
  const raw = cleanText(value).replace(/\\s+/g, " ");
  const concise = raw.split(/\\bEvidence used:/i)[0].trim() || raw;
  if (!concise) return "Owner review needed.";
  return concise.length > limit ? `${concise.slice(0, Math.max(1, limit - 1)).trimEnd()}…` : concise;
}
function plainSlipSummary(item = {}) { return briefDecisionText(firstValue(item.happened, item.detail, item.raw?.found, "Churvox found something that needs an owner decision."), 108); }''',
)

forms = "frontend/src/churvox-office-lab/OfficeTeamWorkForms.jsx"
replace_once(
    forms,
    '  const [busy, setBusy] = useState(false);\n  const ownerRoute = isOwnerRoute();',
    '  const [busy, setBusy] = useState(false);\n  const [dirty, setDirty] = useState(false);\n  const ownerRoute = isOwnerRoute();',
)
replace_once(
    forms,
    '''  useEffect(() => {
    setValues(initialValues(config, selectedRecord));
  }, [config, selectedRecord]);

  function setField(key, value) {
    setValues((current) => ({ ...current, [key]: value }));
  }''',
    '''  useEffect(() => {
    if (!dirty) setValues(initialValues(config, selectedRecord));
  }, [config, selectedRecord, dirty]);

  function setField(key, value) {
    setDirty(true);
    setValues((current) => ({ ...current, [key]: value }));
  }''',
)

rows = "frontend/src/churvox-office-lab/OfficeTeamLiveRows.js"
replace_once(
    rows,
    '  const [state, setState] = useState({ source: "loading", rows: [], message: "Checking live records" });',
    '  const [state, setState] = useState({ source: "loading", rows: [], message: "Checking live records" });\n  const refreshMs = Math.max(0, Number(options.refreshMs ?? (area === "worker" ? 3000 : 0)));',
)
replace_once(
    rows,
    '''  useEffect(() => {
    let mounted = true;
    setState({ source: "loading", rows: [], message: "Checking live records" });
    fetchOfficeTeamRows(area)
      .then((next) => {
        if (!mounted) return;
        const rows = Array.isArray(next?.rows) ? next.rows : [];
        setState({
          ...(next || {}),
          source: rows.length ? "live" : allowFallback ? "preview" : "empty",
          rows,
          message: rows.length
            ? next?.message || `Live read-only · ${rows.length} records`
            : allowFallback
              ? "Example preview records"
              : emptyMessage,
        });
      })
      .catch(() => {
        if (!mounted) return;
        setState({
          source: allowFallback ? "preview" : "error",
          rows: [],
          message: allowFallback ? "Example preview records" : "Live records unavailable",
        });
      });
    return () => {
      mounted = false;
    };
  }, [allowFallback, area, emptyMessage]);''',
    '''  useEffect(() => {
    let mounted = true;
    let timer = null;
    let loading = false;
    setState({ source: "loading", rows: [], message: "Checking live records" });

    const load = async () => {
      if (loading) return;
      loading = true;
      try {
        const next = await fetchOfficeTeamRows(area);
        if (!mounted) return;
        const nextRows = Array.isArray(next?.rows) ? next.rows : [];
        setState({
          ...(next || {}),
          source: nextRows.length ? "live" : allowFallback ? "preview" : "empty",
          rows: nextRows,
          message: nextRows.length
            ? next?.message || `Live read-only · ${nextRows.length} records`
            : allowFallback
              ? "Example preview records"
              : emptyMessage,
        });
      } catch {
        if (!mounted) return;
        setState((current) => Array.isArray(current?.rows) && current.rows.length ? {
          ...current,
          message: "Live refresh retrying",
        } : {
          source: allowFallback ? "preview" : "error",
          rows: [],
          message: allowFallback ? "Example preview records" : "Live records unavailable",
        });
      } finally {
        loading = false;
      }
    };

    load();
    if (refreshMs > 0) timer = window.setInterval(load, refreshMs);
    return () => {
      mounted = false;
      if (timer) window.clearInterval(timer);
    };
  }, [allowFallback, area, emptyMessage, refreshMs]);''',
)

cleanup = "scripts/churvox-hardcore-human-cleanup.cjs"
replace_once(
    cleanup,
    '  const settled = new Set();\n  let matched = 0;',
    '  const settled = new Set();\n  const commandSeen = new Set();\n  let matched = 0;',
)
replace_once(
    cleanup,
    '''  for (const row of await list('/api/command/slips?limit=400', headers)) {
    if (!matches(row)) continue;
    matched += 1;
    const id = idOf(row);
    if (await resolveCommandSlip(row, headers)) { cleaned += 1; if (id) settled.add(`command:${id}`); }
    else failures.push(`command:${id || 'missing-id'}`);
  }''',
    '''  // The live Command endpoint can expose a bounded page. Drain successive
  // pages until no matching active audit slips remain instead of cleaning only page one.
  for (let round = 0; round < 24; round += 1) {
    const commandRows = (await list('/api/command/slips?limit=400', headers)).filter((row) => matches(row) && !inactiveRecord(row));
    if (!commandRows.length) break;
    let progressed = 0;
    for (const row of commandRows) {
      const id = idOf(row);
      if (id && !commandSeen.has(id)) { commandSeen.add(id); matched += 1; }
      if (await resolveCommandSlip(row, headers)) {
        progressed += 1;
        cleaned += 1;
        if (id) settled.add(`command:${id}`);
      } else {
        failures.push(`command:${id || 'missing-id'}`);
      }
    }
    if (!progressed) break;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }''',
)
replace_once(
    cleanup,
    "  for (const row of await list('/api/command/slips?limit=400', headers)) { const key = `command:${idOf(row)}`; if (matches(row) && !settled.has(key)) remainingActive.push(key); }",
    "  for (const row of await list('/api/command/slips?limit=400', headers)) { const key = `command:${idOf(row)}`; if (matches(row) && !inactiveRecord(row) && !settled.has(key)) remainingActive.push(key); }",
)

gate = ".github/workflows/churvox-paid-launch-final-gate-v2.yml"
replace_once(
    gate,
    '''        run: |
          npm start > /tmp/churvox-final-v2-local-server.txt 2>&1 &
          for i in {1..75}; do
            if curl -fsS http://127.0.0.1:3000/ >/dev/null; then exit 0; fi
            sleep 2
          done
          cat /tmp/churvox-final-v2-local-server.txt
          exit 1''',
    '''        run: |
          setsid npm start </dev/null > /tmp/churvox-final-v2-local-server.txt 2>&1 &
          echo $! > /tmp/churvox-final-v2-local-server.pid
          for i in {1..90}; do
            status=$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/login || true)
            if [[ "$status" =~ ^[234] ]]; then
              echo "Local owner build ready with HTTP $status"
              exit 0
            fi
            sleep 2
          done
          cat /tmp/churvox-final-v2-local-server.txt
          exit 1''',
)

print("PAID_LAUNCH_FINAL_BLOCKERS_PATCH_APPLIED")
