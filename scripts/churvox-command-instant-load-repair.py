from pathlib import Path

API = Path('frontend/src/churvox-office-lab/OfficeTeamCommandApi.js')
SITE = Path('frontend/src/churvox-office-lab/OfficeTeamLabSite.jsx')


def replace_once(text, old, new, label):
    if old not in text:
        raise RuntimeError(f'missing anchor: {label}')
    return text.replace(old, new, 1)

api = API.read_text(encoding='utf-8')
api = replace_once(api,
'''export const BACKEND_COMMAND_EVENT = "churvox-backend-command-slip";
const SAFE_RESULT = "Owner approval recorded. Nothing was sent, synced, charged or changed.";
''',
'''export const BACKEND_COMMAND_EVENT = "churvox-backend-command-slip";
const SAFE_RESULT = "Owner approval recorded. Nothing was sent, synced, charged or changed.";
const COMMAND_QUEUE_CACHE_KEY = "churvox:command:confirmed-queue:v1";
const COMMAND_QUEUE_CACHE_MAX_AGE_MS = 1000 * 60 * 15;
''', 'cache constants')

api = replace_once(api,
'''export async function fetchBackendCommandDecisions() {
  const base = host();
  if (!base) return { source: "command-unavailable", decisions: [], message: "No API host" };
  const response = await fetchWithRetry(`${base}/api/command/slips`, { credentials: "include", headers: authHeaders({ json: false }), timeoutMs: 6000 }, 2);
''',
'''export function readCachedBackendCommandDecisions(maxAgeMs = COMMAND_QUEUE_CACHE_MAX_AGE_MS) {
  try {
    const raw = localStorage.getItem(COMMAND_QUEUE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const at = Number(parsed?.at || 0);
    const payload = parsed?.payload;
    if (!at || Date.now() - at > maxAgeMs || !payload || !Array.isArray(payload.decisions)) return null;
    return { ...payload, source: payload.source || "backend-command-cache", cached: true, cachedAt: new Date(at).toISOString() };
  } catch { return null; }
}

function cacheBackendCommandDecisions(payload) {
  if (!payload || !Array.isArray(payload.decisions)) return;
  try { localStorage.setItem(COMMAND_QUEUE_CACHE_KEY, JSON.stringify({ at: Date.now(), payload })); } catch {}
}

export async function fetchBackendCommandDecisions({ timeoutMs = 3000, attempts = 1 } = {}) {
  const base = host();
  if (!base) return { source: "command-unavailable", decisions: [], message: "No API host" };
  const response = await fetchWithRetry(`${base}/api/command/slips`, { credentials: "include", headers: authHeaders({ json: false }), timeoutMs }, attempts);
''', 'fast fetch signature')

api = replace_once(api,
'''  const slips = Array.isArray(body?.slips) ? body.slips : [];
  return { source: slips.length ? "backend-command" : "backend-command-clear", decisions: slips.map(mapCommandSlipToDecision), message: body?.safety || SAFE_RESULT, fetchedAt: new Date().toISOString() };
}
''',
'''  const slips = Array.isArray(body?.slips) ? body.slips : [];
  const payload = { source: slips.length ? "backend-command" : "backend-command-clear", decisions: slips.map(mapCommandSlipToDecision), message: body?.safety || SAFE_RESULT, fetchedAt: new Date().toISOString() };
  cacheBackendCommandDecisions(payload);
  return payload;
}
''', 'cache successful queue')
API.write_text(api, encoding='utf-8')

site = SITE.read_text(encoding='utf-8')
site = replace_once(site,
'''import { BACKEND_COMMAND_EVENT, fetchBackendCommandAudit, fetchBackendCommandDecisions, recordBackendCommandDecision, runBackendOfficeEngineScan } from "./OfficeTeamCommandApi";
''',
'''import { BACKEND_COMMAND_EVENT, fetchBackendCommandAudit, fetchBackendCommandDecisions, readCachedBackendCommandDecisions, recordBackendCommandDecision, runBackendOfficeEngineScan } from "./OfficeTeamCommandApi";
''', 'cache import')

site = replace_once(site,
'''const COMMAND_FAST_LOAD_BUILD = "churvox-command-fast-load-build-20260713c";
''',
'''const COMMAND_FAST_LOAD_BUILD = "churvox-command-instant-load-20260713d";
''', 'build marker')

site = replace_once(site,
'''  const [snapshot, setSnapshot] = useState({ source: "starter", decisions: [] });
  const [backendCommand, setBackendCommand] = useState({ source: "command-unavailable", decisions: [] });
  const [backendAudit, setBackendAudit] = useState({ source: "command-audit-unavailable", audit: [] });
  const [commandLoading, setCommandLoading] = useState(isOwnerApp);
''',
'''  const initialCachedCommand = isOwnerApp ? readCachedBackendCommandDecisions() : null;
  const [snapshot, setSnapshot] = useState({ source: "starter", decisions: [] });
  const [backendCommand, setBackendCommand] = useState(initialCachedCommand || { source: "command-unavailable", decisions: [] });
  const [backendAudit, setBackendAudit] = useState({ source: "command-audit-unavailable", audit: [] });
  const [commandLoading, setCommandLoading] = useState(isOwnerApp && !initialCachedCommand);
''', 'initial cached queue')

site = replace_once(site,
'''      setCommandLoading(true);
      setNotice("Opening the current Command queue. The full business check will continue behind it.");

      const loadCurrentQueue = async ({ afterScan = false, scan = null } = {}) => {
''',
'''      const cachedCommand = readCachedBackendCommandDecisions();
      if (cachedCommand) {
        setBackendCommand(cachedCommand);
        setCommandLoading(false);
        setNotice("Command is open from the last confirmed queue. Churvox is refreshing live records behind it.");
      } else {
        setCommandLoading(true);
        setNotice("Opening the current Command queue. The full business check will continue behind it.");
      }

      const loadCurrentQueue = async ({ afterScan = false, scan = null, timeoutMs = 3000, attempts = 1 } = {}) => {
''', 'cached foreground state')

site = replace_once(site,
'''          const command = await fetchBackendCommandDecisions();
''',
'''          const command = await fetchBackendCommandDecisions({ timeoutMs, attempts });
''', 'configurable queue fetch')

site = replace_once(site,
'''          if (mounted && !afterScan) setNotice(`Command queue could not load: ${error?.message || "connection issue"}. Nothing was changed.`);
''',
'''          if (mounted && !afterScan) setNotice(cachedCommand
            ? `Command is showing the last confirmed queue. Live refresh is still retrying: ${error?.message || "connection issue"}.`
            : `Command opened without waiting for the slow service. Live refresh is still retrying: ${error?.message || "connection issue"}. Nothing was changed.`);
''', 'nonblocking failure notice')

site = replace_once(site,
'''      const queuePromise = loadCurrentQueue();
''',
'''      const queuePromise = loadCurrentQueue({ timeoutMs: 3000, attempts: 1 });
''', 'fast foreground call')

site = replace_once(site,
'''            const command = await loadCurrentQueue({ afterScan: true, scan });
''',
'''            const command = await loadCurrentQueue({ afterScan: true, scan, timeoutMs: 8000, attempts: 1 });
''', 'background refresh timeout')

site = replace_once(site,
'''        }, 180);
''',
'''        }, 900);
''', 'defer deep scan')
SITE.write_text(site, encoding='utf-8')

print('Applied instant Command queue load repair.')
