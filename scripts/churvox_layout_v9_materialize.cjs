const fs = require("fs");
const path = require("path");

function replaceOnce(source, before, after, label) {
  if (source.includes(after)) return source;
  if (!source.includes(before)) {
    throw new Error(`Control Room V9 materializer could not find ${label}`);
  }
  return source.replace(before, after);
}

function materializeLayoutV9() {
  const root = path.resolve(__dirname, "..");
  const entryTarget = path.join(root, "frontend", "src", "churvox-fresh", "FreshApp.jsx");
  const appTarget = path.join(root, "frontend", "src", "churvox-product", "ProductAppV9.jsx");
  const entryContent = 'import ProductAppV9Gate from "../churvox-product/ProductAppV9Gate";\n\nexport default ProductAppV9Gate;\n';

  fs.mkdirSync(path.dirname(entryTarget), { recursive: true });
  if (!fs.existsSync(entryTarget) || fs.readFileSync(entryTarget, "utf8") !== entryContent) {
    fs.writeFileSync(entryTarget, entryContent);
  }

  if (!fs.existsSync(appTarget)) {
    throw new Error("Control Room V9 application source is missing");
  }

  let app = fs.readFileSync(appTarget, "utf8");
  app = replaceOnce(
    app,
    'work: [["jobs", "Board"], ["schedule", "Schedule"], ["recurring", "Recurring"]],',
    'work: [["jobs", "Jobs"], ["schedule", "Schedule"], ["recurring", "Recurring"]],',
    "Work navigation labels",
  );
  app = replaceOnce(
    app,
    'team: [["crew", "Crew"], ["field", "Field"], ["timesheets", "Timesheets"], ["access", "Access"]],',
    'team: [["crew", "Crew"], ["field", "Field activity"], ["timesheets", "Timesheets"], ["access", "Access"]],',
    "Team navigation labels",
  );
  app = replaceOnce(
    app,
    'function TopBar({ page, go, search, create, updates, notificationCount }) {',
    'function TopBar({ page, go, search, create, updates, notificationCount, access }) {',
    "TopBar access input",
  );
  app = replaceOnce(
    app,
    '  const tabs = SUBTABS[area] || [];',
    '  const tabs = (SUBTABS[area] || []).filter(([id]) => id === "timesheets" ? access.can("payroll") : id === "accounting" ? access.accounting : true);',
    "plan-aware subnavigation",
  );
  app = replaceOnce(
    app,
    '<nav className="cv9TopTabs" aria-label={`${title} views`}>',
    '<nav className="cv9TopTabs" aria-label={`${area} navigation`}>',
    "subnavigation accessibility name",
  );
  app = replaceOnce(
    app,
    '<nav className="cv9RailNav" aria-label="Main navigation">',
    '<nav className="cv9RailNav cvOwnerNavigation" aria-label="Main navigation" data-plan={access.planKey}>',
    "owner navigation compatibility hook",
  );
  app = replaceOnce(
    app,
    '<button type="button" key={item.id} className={area === item.id ? "active" : ""} onClick={() => go(item.page)}><span>{item.mark}</span><b>{item.label}</b>',
    '<button type="button" key={item.id} className={area === item.id ? "active" : ""} aria-label={item.label} onClick={() => go(item.page)}><span>{item.mark}</span><b>{item.label}</b>',
    "plain accessible rail labels",
  );
  app = replaceOnce(
    app,
    'className="cv9Account"',
    'className="cv9Account cv7Profile"',
    "visible profile compatibility hook",
  );
  app = replaceOnce(
    app,
    '<nav className="cv9MobileNav">',
    '<nav className="cv9MobileNav cv7MobileNav">',
    "mobile navigation compatibility hook",
  );
  app = replaceOnce(
    app,
    '<div className="cv9MobileMore" role="dialog" aria-modal="true">',
    '<div className="cv9MobileMore cv7MobileMore" role="dialog" aria-modal="true">',
    "mobile More compatibility hook",
  );
  app = replaceOnce(
    app,
    'title="See your current access first"',
    'title="See your current access before comparing anything."',
    "paid plan truth heading",
  );
  app = replaceOnce(
    app,
    '<main className={`cv7Product cv9Product cvOwnerReady page-${page}`} data-version="CHURVOX_CONTROL_ROOM_V9_20260725">',
    '<main className={`cv7Product cv9Product cvOwnerReady page-${page}`} data-version="CHURVOX_CONTROL_ROOM_V9_20260725" data-screen={page}>',
    "current screen marker",
  );
  app = replaceOnce(
    app,
    '<TopBar page={page} go={go} search={() => setOverlay("search")} create={() => setOverlay("create")} updates={() => setOverlay("notifications")} notificationCount={notifications.length} />',
    '<TopBar page={page} go={go} search={() => setOverlay("search")} create={() => setOverlay("create")} updates={() => setOverlay("notifications")} notificationCount={notifications.length} access={access} />',
    "TopBar access wiring",
  );
  app = replaceOnce(
    app,
    'onClick={async () => { setOpen(false); await logout(); window.location.assign("/login"); }}>Log out</button>',
    'onClick={async () => { setOpen(false); await logout(); }}>Log out</button>',
    "single desktop logout navigation",
  );
  app = replaceOnce(
    app,
    'onClick={async () => { setMore(false); await logout(); window.location.assign("/login"); }}>Log out</button>',
    'id="churvox-control-board-mobile-logout" aria-label="Log out" onClick={async () => { setMore(false); await logout(); }}>Log out</button>',
    "single mobile logout navigation",
  );

  fs.writeFileSync(appTarget, app);
  return { entryTarget, appTarget };
}

module.exports = materializeLayoutV9;

if (require.main === module) {
  materializeLayoutV9();
  console.log("Materialised Churvox Control Room V9 entrypoint and compatibility hooks.");
}
