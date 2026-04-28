from pathlib import Path

path = Path('frontend/src/pages/TeamPage.js')
text = path.read_text(encoding='utf-8')

if 'filterWorkerJobsForWorkerRegion' in text:
    print('Team worker region filter already patched')
    raise SystemExit(0)

helpers_anchor = '''function jobMatchesWorker(job, worker) {
  const id = str(workerId(worker));
  const email = lower(worker?.email);
  const name = lower(worker?.name);
  const jobWorkerIds = [job?.assigned_worker_id, job?.worker_id, job?.assigned_to, job?.assigned_worker?.id, job?.assigned_worker?._id].map(str);
  const jobWorkerEmail = lower(job?.assigned_worker_email || job?.worker_email || job?.assigned_worker?.email);
  const jobWorkerName = lower(job?.assigned_worker_name || job?.worker_name || job?.assigned_worker?.name);

  if (id && jobWorkerIds.includes(id)) return true;
  if (email && jobWorkerEmail === email) return true;
  if (name && jobWorkerName === name) return true;
  return false;
}
'''

region_helpers = helpers_anchor + r'''

function normalizeRegionName(value) {
  return lower(value).replace(/[^a-z0-9]+/g, " ").trim();
}

const ADDRESS_REGION_HINTS = [
  { region: "northland", words: ["northland", "whangarei", "whangārei", "kaitaia", "kerikeri", "kaikohe", "dargaville", "paihia", "ruakaka", "mangawhai"] },
  { region: "auckland", words: ["auckland", "manukau", "waitakere", "albany", "takapuna", "papakura", "pukekohe"] },
  { region: "waikato", words: ["waikato", "hamilton", "cambridge", "te awamutu", "huntly", "taupo", "matamata"] },
  { region: "bay of plenty", words: ["bay of plenty", "tauranga", "rotorua", "whakatane", "katikati", "te puke"] },
  { region: "gisborne", words: ["gisborne", "tairawhiti"] },
  { region: "hawke s bay", words: ["hawke", "napier", "hastings", "wairoa"] },
  { region: "taranaki", words: ["taranaki", "new plymouth", "hawera", "stratford"] },
  { region: "manawatu whanganui", words: ["manawatu", "whanganui", "palmerston north", "levin", "feilding"] },
  { region: "wellington", words: ["wellington", "porirua", "lower hutt", "upper hutt", "kapiti", "paraparaumu", "masterton", "wainuiomata"] },
  { region: "tasman", words: ["tasman", "motueka", "richmond"] },
  { region: "nelson", words: ["nelson"] },
  { region: "marlborough", words: ["marlborough", "blenheim", "picton"] },
  { region: "west coast", words: ["west coast", "greymouth", "hokitika", "westport"] },
  { region: "canterbury", words: ["canterbury", "christchurch", "ashburton", "timaru", "rangiora"] },
  { region: "otago", words: ["otago", "dunedin", "queenstown", "wanaka", "alexandra"] },
  { region: "southland", words: ["southland", "invercargill", "gore"] },
];

function inferRegionFromAddress(job) {
  const text = normalizeRegionName([
    job?.region,
    job?.job_region,
    job?.service_region,
    job?.client_region,
    job?.customer_region,
    job?.client?.region,
    job?.customer?.region,
    job?.address,
    job?.client_address,
    job?.customer_address,
  ].filter(Boolean).join(" "));
  if (!text) return "";
  for (const hint of ADDRESS_REGION_HINTS) {
    if (hint.words.some((word) => text.includes(normalizeRegionName(word)))) return hint.region;
  }
  return text;
}

function jobMatchesWorkerRegion(job, worker) {
  const workerRegion = normalizeRegionName(worker?.region);
  if (!workerRegion) return true;
  const jobRegion = inferRegionFromAddress(job);
  if (!jobRegion) return true;
  return normalizeRegionName(jobRegion) === workerRegion;
}

function filterWorkerJobsForWorkerRegion(jobs, worker) {
  if (!Array.isArray(jobs)) return [];
  return jobs.filter((job) => jobMatchesWorkerRegion(job, worker));
}
'''

if helpers_anchor not in text:
    raise SystemExit('Could not find jobMatchesWorker helper block')
text = text.replace(helpers_anchor, region_helpers, 1)

old = '  const workerClients = useMemo(() => buildWorkerClientHistory(workerJobs), [workerJobs]);'
new = '''  const regionMatchedWorkerJobs = useMemo(() => filterWorkerJobsForWorkerRegion(workerJobs, selectedWorker), [workerJobs, selectedWorker]);
  const hiddenRegionMismatchCount = Math.max(0, workerJobs.length - regionMatchedWorkerJobs.length);
  const workerClients = useMemo(() => buildWorkerClientHistory(regionMatchedWorkerJobs), [regionMatchedWorkerJobs]);'''
if old not in text:
    raise SystemExit('Could not find workerClients useMemo')
text = text.replace(old, new, 1)

text = text.replace('{workerJobs.length} job{workerJobs.length !== 1 ? "s" : ""}', '{regionMatchedWorkerJobs.length} job{regionMatchedWorkerJobs.length !== 1 ? "s" : ""}')
text = text.replace('Client history is built from jobs assigned to this worker. Clients still belong to the business.', 'Client history is built from jobs assigned to this worker in their saved region. Clients still belong to the business.')
text = text.replace('Jobs currently linked to this worker', 'Jobs currently linked to this worker in their saved region')
text = text.replace('workerJobsLoading ? <div className="text-sm text-slate-500">Loading assigned jobs...</div> : workerJobs.length > 0 ? (', 'workerJobsLoading ? <div className="text-sm text-slate-500">Loading assigned jobs...</div> : regionMatchedWorkerJobs.length > 0 ? (')
text = text.replace('{workerJobs.map((job, index) => {', '{regionMatchedWorkerJobs.map((job, index) => {')

badge_anchor = '''                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">{workerClients.length} client{workerClients.length !== 1 ? "s" : ""} served</span>
                      </div>'''
if badge_anchor in text:
    text = text.replace(badge_anchor, '''                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">{workerClients.length} client{workerClients.length !== 1 ? "s" : ""} served</span>
                      </div>
                      {hiddenRegionMismatchCount > 0 ? <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">Hidden {hiddenRegionMismatchCount} out-of-region job{hiddenRegionMismatchCount !== 1 ? "s" : ""} for this worker location.</div> : null}''', 1)

path.write_text(text, encoding='utf-8')
print('Patched TeamPage worker profile to hide out-of-region assigned jobs and client history')
