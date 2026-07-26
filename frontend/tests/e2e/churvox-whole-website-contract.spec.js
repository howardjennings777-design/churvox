const fs = require("fs");
const path = require("path");
const { test, expect } = require("@playwright/test");

const ROOT = path.resolve(__dirname, "../..");
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");

test.describe("Churvox whole website rebuild contract", () => {
  test("keeps public owner HQ and blueprint surfaces isolated behind the private lab route", async () => {
    const route = read("src/churvox-office-lab/OfficeTeamLab.jsx");
    expect(route).toContain("window.location.pathname === '/new-command-lab'");
    expect(route).toContain("value === 'public' || value === 'hq' || value === 'blueprint'");
    expect(route).toContain("<PublicSiteConnected />");
    expect(route).toContain("<HQConnected />");
    expect(route).toContain("<OfficeOSWorkingConnected />");
    expect(route).toContain("<OfficeOSPreview />");
  });

  test("connects the owner replacement to real records without inventing fallback data", async () => {
    const connected = read("src/churvox-office-os/OfficeOSConnected.jsx");
    const liveData = read("src/churvox-office-os/officeOSLiveData.js");

    expect(connected).toContain('data-connected-replacement="true"');
    expect(connected).toContain("No sample data will be substituted");
    expect(connected).toContain("OFFICE_OS_CONNECTED_BUILD");

    expect(liveData).toContain("window.location.origin");
    expect(liveData).toContain('method: "GET"');
    expect(liveData).toContain("No sample records were substituted");
    expect(liveData).toContain("fetchBackendCommandDecisions");
    expect(liveData).toContain('command: "/dashboard#command"');
    expect(liveData).not.toContain('method: "POST"');
  });

  test("prepares and approves the complete safe draft set through Command only", async () => {
    const working = read("src/churvox-office-os/OfficeOSWorkingConnected.jsx");
    const quickPrepare = read("src/churvox-office-os/OfficeOSQuickPrepare.jsx");
    const approvalDesk = read("src/churvox-office-os/OfficeOSApprovalDesk.jsx");

    expect(working).toContain("OFFICE_OS_WORKING_CONNECTED_BUILD");
    expect(working).toContain("<OfficeOSQuickPrepare />");
    expect(working).toContain("<OfficeOSApprovalDesk />");
    expect(quickPrepare).toContain("OFFICE_OS_QUICK_PREPARE_BUILD");
    expect(quickPrepare).toContain("createBackendCommandSlip");
    expect(quickPrepare).toContain("connected_office_os_quick_prepare");
    expect(quickPrepare).toContain("prepared_only: true");
    expect(quickPrepare).toContain("owner_review_only: true");
    expect(quickPrepare).toContain("no_auto_send: true");
    expect(quickPrepare).toContain("no_auto_sync: true");
    expect(quickPrepare).toContain("no_auto_charge: true");
    expect(quickPrepare).toContain("no_auto_record_change: true");
    expect(quickPrepare).toContain('href="/dashboard#command"');

    for (const tab of ["Clients", "Jobs", "Quotes", "Invoices", "Messages", "Staff"]) {
      expect(approvalDesk).toContain(`tab: "${tab}"`);
    }
    expect(approvalDesk).toContain("recordBackendCommandDecision");
    expect(approvalDesk).toContain("fetchBackendCommandAudit");
    expect(approvalDesk).not.toContain('method: "POST"');
  });

  test("covers the complete public and customer page set", async () => {
    const contract = read("src/churvox-site-next/siteContract.js");
    const publicSite = read("src/churvox-site-next/PublicSiteNext.jsx");
    for (const page of ["home", "product", "pricing", "industries", "demo", "security", "support", "contact"]) {
      expect(contract).toContain(`key: "${page}"`);
    }
    for (const customerPage of ["request", "quote", "invoice", "portal", "proof"]) {
      expect(contract).toContain(`["${customerPage}"`);
    }
    expect(publicSite).toContain('page.startsWith("customer-")');
    expect(publicSite).toContain('page.replace("customer-", "")');
    expect(publicSite).toContain("CHURVOX_WHOLE_PUBLIC_REBUILD_20260721");
  });

  test("hands preview visitors into the current verified public journeys", async () => {
    const connectedPublic = read("src/churvox-site-next/PublicSiteConnected.jsx");
    expect(connectedPublic).toContain("PUBLIC_SITE_CONNECTED_BUILD");
    expect(connectedPublic).toContain('href: "/signup"');
    expect(connectedPublic).toContain('href: "/login"');
    expect(connectedPublic).toContain('href: "/request"');
    expect(connectedPublic).toContain('href: "mailto:hello@churvox.com"');
    expect(connectedPublic).toContain("Verified routes, not preview submissions");
    expect(connectedPublic).toContain("no visitor receives a false success");
  });

  test("wires the private HQ rebuild to the same live platform-owner workspace", async () => {
    const connectedHq = read("src/churvox-site-next/HQConnected.jsx");
    const liveData = read("src/churvox-site-next/hqLiveData.js");
    const liveHq = read("src/pages/ChurvoxHQPage.jsx");

    expect(connectedHq).toContain("HQ_CONNECTED_BUILD");
    expect(connectedHq).toContain('href="/admin"');
    expect(connectedHq).toContain('import ChurvoxHQPage from "../pages/ChurvoxHQPage"');
    expect(connectedHq).toContain("<ChurvoxHQPage embedded />");
    expect(connectedHq).toContain('data-live-hq-workspace="true"');
    expect(connectedHq).not.toContain("<HQNext />");

    expect(liveHq).toContain("My Churvox HQ");
    expect(liveHq).toContain("Live control");
    expect(liveHq).toContain("Outreach");
    expect(liveHq).toContain("Tester applications");
    expect(liveHq).toContain('data-live-hq="true"');

    expect(liveData).toContain("HQ_LIVE_DATA_BUILD");
    expect(liveData).toContain("window.location.origin");
    expect(liveData).toContain('method: "GET"');
    expect(liveData).toContain("/api/admin/owner/paid-launch-report");
    expect(liveData).toContain("/api/admin/owner/testers");
    expect(liveData).not.toContain('method: "POST"');
  });

  test("preserves the locked NZD plan prices", async () => {
    const contract = read("src/churvox-site-next/siteContract.js");
    for (const [name, price] of [["Start", "$39"], ["Crew", "$89"], ["Operator", "$149"], ["Command", "$299"]]) {
      expect(contract).toContain(`name: "${name}"`);
      expect(contract).toContain(`price: "${price}"`);
    }
    expect(contract).toContain("Command Growth Pack");
    expect(contract).toContain("$99");
  });

  test("gives My HQ the complete live platform operating surface", async () => {
    const hqPage = read("src/pages/ChurvoxHQPage.jsx");
    const liveControl = read("src/pages/PaidLaunchHQSystem.jsx");

    for (const workspace of ["Live control", "Outreach", "Tester applications"]) {
      expect(hqPage).toContain(workspace);
    }
    for (const area of ["Command", "Launch", "Users", "Billing", "Testers", "Businesses", "Activity", "System", "Data"]) {
      expect(liveControl).toContain(area);
    }
    expect(liveControl).toContain("Live backend responses, truthful empty states, and no demo number substitution.");
    expect(liveControl).toContain("RemoveCustomerDataCard");
  });

  test("repairs and audits pill wording as text a person can actually see", async () => {
    const runtime = read("src/runtime/churvoxVisibleControlTextRuntime.js");
    const audit = read("tests/e2e/churvox-wording-flow-human-audit.spec.js");
    const entry = read("src/index.js");

    expect(entry).toContain("./runtime/churvoxVisibleControlTextRuntime");
    expect(runtime).toContain("cvVisibleControlTextRepair");
    expect(runtime).toContain("cvNeedsVisibleControlLabel");
    expect(runtime).toContain("textLooksHidden");
    expect(runtime).toContain("MutationObserver");
    expect(audit).toContain("pill text not human-visible");
    expect(audit).toContain("owner can move through the whole working site");
    expect(audit).toContain("worker can move through field pages");
  });

  test("locks owner authority and whole-site release gates into the contract", async () => {
    const contract = read("src/churvox-site-next/siteContract.js");
    const status = read("../docs/churvox-office-os/CONNECTED_REPLACEMENT_STATUS.md");
    expect(contract).toContain("Churvox does the admin. The owner checks and approves.");
    expect(contract).toContain("Customer-facing pages never expose another business");
    expect(contract).toContain("Migration has preview, duplicate checks, rollback rehearsal");
    expect(contract).toContain("Staging passes build, browser, accessibility, security, billing and real-business workflow gates");
    expect(status).toContain("Remaining live-cutover gates");
    expect(status).toContain("Obtain explicit owner approval before any live route cutover");
  });
});
