from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AUTH = ROOT / "frontend/src/context/AuthContext.js"
APP = ROOT / "frontend/src/App.js"
INDEX = ROOT / "frontend/src/index.js"


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly one source anchor, found {count}")
    return text.replace(old, new, 1)


auth = AUTH.read_text(encoding="utf-8")

anchor = 'const PLATFORM_OWNER_EMAIL = "hello@churvox.com";\n'
insert = '''const PLATFORM_OWNER_EMAIL = "hello@churvox.com";
const AUTH_PUBLIC_PATHS = [
  "/api/auth/login",
  "/api/worker/auth/login",
  "/api/auth/register",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/auth/verify-email",
  "/api/auth/me",
  "/api/auth/logout",
];

function setAxiosAuthToken(token = "") {
  const cleanToken = String(token || "").trim();
  if (cleanToken) axios.defaults.headers.common.Authorization = `Bearer ${cleanToken}`;
  else delete axios.defaults.headers.common.Authorization;
}

function requestPath(value = "") {
  try { return new URL(String(value || ""), window.location.origin).pathname; }
  catch { return String(value || ""); }
}

function isPublicAuthRequest(value = "") {
  const path = requestPath(value);
  return AUTH_PUBLIC_PATHS.some((allowed) => path === allowed || path.startsWith(`${allowed}/`));
}

function publishAuthState(status, nextUser = null) {
  if (typeof window === "undefined") return;
  const detail = Object.freeze({
    status,
    authenticated: status === "authenticated",
    role: String(nextUser?.role || nextUser?.user_role || ""),
    email: String(nextUser?.email || "").trim().toLowerCase(),
    at: Date.now(),
  });
  window.__CHURVOX_AUTH_STATE__ = detail;
  window.dispatchEvent(new CustomEvent("churvox-auth-state", { detail }));
}
'''
auth = replace_once(auth, anchor, insert, "auth helpers")

auth = replace_once(
    auth,
    '  if (clearPlanState) clearAccountPlanState();\n}',
    '  setAxiosAuthToken("");\n  if (clearPlanState) clearAccountPlanState();\n}',
    "clear axios auth token",
)

auth = replace_once(
    auth,
    '  const [user, setUser] = useState(() => readStoredAuthSnapshot());',
    '  // Cached account data is fallback evidence only; it must never render a protected app before /api/auth/me succeeds.\n  const [user, setUser] = useState(null);',
    "provider initial user",
)

auth = replace_once(
    auth,
    '''  const checkAuth = useCallback(async () => {
    const runId = ++authRunRef.current;
    let token = "";
    try { token = localStorage.getItem("token") || ""; } catch {}
''',
    '''  const checkAuth = useCallback(async () => {
    const runId = ++authRunRef.current;
    publishAuthState("checking");
    let token = "";
    try { token = localStorage.getItem("token") || ""; } catch {}
''',
    "check auth state",
)

auth = replace_once(
    auth,
    '''    const fallbackSession = workerSession || businessSession;

    try {
      const me = await fetchMe(token || fallbackSession?.token || undefined);
''',
    '''    const fallbackSession = workerSession || businessSession;
    const requestToken = token || fallbackSession?.token || "";
    setAxiosAuthToken(requestToken);

    try {
      const me = await fetchMe(requestToken || undefined);
''',
    "check auth default header",
)

auth = replace_once(
    auth,
    '''      if (businessAccessFromUser(me)) removePlanFlag();
      if (me?.token) localStorage.setItem("token", me.token);
      saveStoredAuthSnapshot(me);
      rememberPlatformOwner(me);
      if (runId === authRunRef.current) setUser(me);
''',
    '''      if (businessAccessFromUser(me)) removePlanFlag();
      if (me?.token) localStorage.setItem("token", me.token);
      setAxiosAuthToken(me?.token || requestToken);
      saveStoredAuthSnapshot(me);
      rememberPlatformOwner(me);
      publishAuthState("authenticated", me);
      if (runId === authRunRef.current) setUser(me);
''',
    "check auth success",
)

auth = replace_once(
    auth,
    '''      if (transient && workerSession && offlineWorkerSnapshot(workerSession)) {
        if (runId === authRunRef.current) setUser(workerSession);
        return workerSession;
      }
      if (transient && businessSession && offlineBusinessSnapshot(businessSession)) {
        if (runId === authRunRef.current) setUser(businessSession);
        return businessSession;
      }
      if (status === 401 || status === 403) clearStoredAuth({ clearPlanState: true });
      if (runId === authRunRef.current) setUser(null);
''',
    '''      if (transient && workerSession && offlineWorkerSnapshot(workerSession)) {
        setAxiosAuthToken(workerSession.token || requestToken);
        publishAuthState("authenticated", workerSession);
        if (runId === authRunRef.current) setUser(workerSession);
        return workerSession;
      }
      if (transient && businessSession && offlineBusinessSnapshot(businessSession)) {
        setAxiosAuthToken(businessSession.token || requestToken);
        publishAuthState("authenticated", businessSession);
        if (runId === authRunRef.current) setUser(businessSession);
        return businessSession;
      }
      if (status === 401 || status === 403) clearStoredAuth({ clearPlanState: true });
      publishAuthState("anonymous");
      if (runId === authRunRef.current) setUser(null);
''',
    "check auth failure",
)

listener_anchor = '''  useEffect(() => {
    const refreshAuth = () => checkAuth().catch(() => {});
    window.addEventListener("churvox-auth-refresh", refreshAuth);
    window.addEventListener("storage", refreshAuth);
    return () => {
      window.removeEventListener("churvox-auth-refresh", refreshAuth);
      window.removeEventListener("storage", refreshAuth);
    };
  }, [checkAuth]);
'''
listener_insert = listener_anchor + '''

  useEffect(() => {
    const expireSession = () => {
      ++authRunRef.current;
      clearStoredAuth({ clearPlanState: true });
      setUser(null);
      setLoading(false);
      publishAuthState("anonymous");
    };
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        const status = error?.response?.status;
        const url = error?.config?.url || "";
        if (status === 401 && !isPublicAuthRequest(url)) {
          window.dispatchEvent(new Event("churvox-auth-expired"));
        }
        return Promise.reject(error);
      }
    );
    window.addEventListener("churvox-auth-expired", expireSession);
    return () => {
      axios.interceptors.response.eject(interceptor);
      window.removeEventListener("churvox-auth-expired", expireSession);
    };
  }, []);
'''
auth = replace_once(auth, listener_anchor, listener_insert, "auth expiry listener")

auth = replace_once(
    auth,
    '''  const login = useCallback(async (email, password) => {
    const runId = ++authRunRef.current;
    setLoading(true);
''',
    '''  const login = useCallback(async (email, password) => {
    const runId = ++authRunRef.current;
    publishAuthState("checking");
    setLoading(true);
''',
    "login checking",
)

auth = replace_once(
    auth,
    '''      if (token) {
        nextUser.token = token;
        localStorage.setItem("token", token);
      } else {
        safeStorageRemove("token");
      }

      if (businessAccessFromUser(nextUser)) removePlanFlag();
      saveStoredAuthSnapshot(nextUser);
      rememberPlatformOwner(nextUser);
      if (runId === authRunRef.current) setUser(nextUser);
''',
    '''      if (token) {
        nextUser.token = token;
        localStorage.setItem("token", token);
      } else {
        safeStorageRemove("token");
      }
      setAxiosAuthToken(token);

      if (businessAccessFromUser(nextUser)) removePlanFlag();
      saveStoredAuthSnapshot(nextUser);
      rememberPlatformOwner(nextUser);
      publishAuthState("authenticated", nextUser);
      if (runId === authRunRef.current) setUser(nextUser);
''',
    "login success",
)

auth = replace_once(
    auth,
    '''      if (runId === authRunRef.current) {
        clearStoredAuth({ clearPlanState: true });
        setUser(null);
      }
      throw error;
''',
    '''      if (runId === authRunRef.current) {
        clearStoredAuth({ clearPlanState: true });
        setUser(null);
        publishAuthState("anonymous");
      }
      throw error;
''',
    "login failure",
)

auth = replace_once(
    auth,
    '''  const register = useCallback(async (userData) => {
    const runId = ++authRunRef.current;
    setLoading(true);
''',
    '''  const register = useCallback(async (userData) => {
    const runId = ++authRunRef.current;
    publishAuthState("checking");
    setLoading(true);
''',
    "register checking",
)

auth = replace_once(
    auth,
    '''      if (token) {
        nextUser.token = token;
        localStorage.setItem("token", token);
      } else {
        safeStorageRemove("token");
      }

      if (testerAccess(nextUser) || inferredWorker(nextUser) || inferredPayroll(nextUser)) {
''',
    '''      if (token) {
        nextUser.token = token;
        localStorage.setItem("token", token);
      } else {
        safeStorageRemove("token");
      }
      setAxiosAuthToken(token);

      if (testerAccess(nextUser) || inferredWorker(nextUser) || inferredPayroll(nextUser)) {
''',
    "register token",
)

auth = replace_once(
    auth,
    '''        saveStoredAuthSnapshot(nextUser);
        if (runId === authRunRef.current) setUser(nextUser);
        return { ...response.data, user: nextUser, ...nextUser };
''',
    '''        saveStoredAuthSnapshot(nextUser);
        publishAuthState("authenticated", nextUser);
        if (runId === authRunRef.current) setUser(nextUser);
        return { ...response.data, user: nextUser, ...nextUser };
''',
    "register tester success",
)

auth = replace_once(
    auth,
    '''      saveStoredAuthSnapshot(locked);
      if (runId === authRunRef.current) setUser(locked);
''',
    '''      saveStoredAuthSnapshot(locked);
      publishAuthState("authenticated", locked);
      if (runId === authRunRef.current) setUser(locked);
''',
    "register locked success",
)

auth = replace_once(
    auth,
    '''    clearStoredAuth({ clearPlanState: true });
    safeStorageRemove(PLAN_REQUIRED_KEY);
    if (runId === authRunRef.current) {
''',
    '''    clearStoredAuth({ clearPlanState: true });
    safeStorageRemove(PLAN_REQUIRED_KEY);
    publishAuthState("anonymous");
    if (runId === authRunRef.current) {
''',
    "logout state",
)

AUTH.write_text(auth, encoding="utf-8")

app = APP.read_text(encoding="utf-8")
app = replace_once(app, '  if (loading && !user) return <Spinner />;', '  if (loading) return <Spinner />;', "owner route loading gate")
app = replace_once(app, '  if (loading && !user) return <Spinner />;', '  if (loading) return <Spinner />;', "worker route loading gate")
app = replace_once(app, 'version: "churvox-paid-launch-readiness-20260713a"', 'version: "churvox-auth-401-storm-repair-20260713b"', "frontend marker")
APP.write_text(app, encoding="utf-8")

index = INDEX.read_text(encoding="utf-8")
index = replace_once(
    index,
    "import './runtime/churvoxExplicitLogoutGuardRuntime';\nimport App from './App';",
    "import './runtime/churvoxExplicitLogoutGuardRuntime';\nimport './runtime/churvoxProtectedFetchAuthGuardRuntime';\nimport App from './App';",
    "fetch auth guard import",
)
index = replace_once(
    index,
    "function currentPath() { return typeof window === 'undefined' ? '' : window.location.pathname || ''; }",
    "function currentPath() { return typeof window === 'undefined' ? '' : window.location.pathname || ''; }\nfunction protectedAuthReady() { return typeof window !== 'undefined' && window.__CHURVOX_AUTH_STATE__?.status === 'authenticated'; }",
    "runtime auth state helper",
)
index = replace_once(
    index,
    "  if (!isOwnerApp) return;\n  if (!ownerRuntimeLoaded) {",
    "  if (!isOwnerApp || !protectedAuthReady()) return;\n  if (!ownerRuntimeLoaded) {",
    "owner runtime gate",
)
index = replace_once(
    index,
    "  if (!path.startsWith('/worker')) return;\n  workerRuntimeLoaded = true;",
    "  if (!path.startsWith('/worker') || !protectedAuthReady()) return;\n  workerRuntimeLoaded = true;",
    "worker runtime gate",
)
index = replace_once(
    index,
    "  window.addEventListener('popstate', checkRuntimeLoads);\n  window.addEventListener('hashchange', checkRuntimeLoads);",
    "  window.addEventListener('popstate', checkRuntimeLoads);\n  window.addEventListener('hashchange', checkRuntimeLoads);\n  window.addEventListener('churvox-auth-state', checkRuntimeLoads);",
    "runtime auth listener",
)
INDEX.write_text(index, encoding="utf-8")

print("Applied stale-session and 401 request-storm repair.")
