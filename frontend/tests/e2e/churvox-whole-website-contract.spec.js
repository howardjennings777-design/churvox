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
    expect(route).toContain("<OfficeOSConnected />");
    expect(route).toContain("<OfficeOSPreview />");
  });

  test("connects the owner replacement to real read-only records without inventing fallback data", async () => {
    const connected = read("src/churvox-office-os/OfficeOSConnected.jsx");
    const liveData = read("src/churvox-office-os/officeOSLiveData.js");

    expect(connected).toContain("data-connected-replacement=\"true\"");
    expect(connected).toContain("Real read-only records");
    expect(connected).toContain("No sample data will be substituted");
    expect(connected).toContain("OFFICE_OS_CONNECTED_BUILD");

    expect(liveData).toContain("window.location.origin");
    expect(liveData).toContain('method: "GET"');
    expect(liveData).toContain("No sample records were substituted");
    expect(liveData).toContain("fetchBackendCommandDecisions");
    expect(liveData).toContain('command: "/dashboard#command"');
    expect(liveData).not.toContain('method: "POST"');
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

  test("connects HQ to platform reads without exposing a second mutation path", async () => {
    const connectedHq = read("src/churvox-site-next/HQConnected.jsx");
    const liveData = read("src/churvox-site-next/hqLiveData.js");
    expect(connectedHq).toContain("HQ_CONNECTED_BUILD");
    expect(connectedHq).toContain('href="/admin"');
    expect(connectedHq).toContain("No sample platform totals are substituted");
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

  test("gives HQ the full platform operating surface", async () => {
    const contract = read("src/churvox-site-next/siteContract.js");
    const hq = read("src/churvox-site-next/HQNext.jsx");
    for (const area of ["Command", "Businesses", "Billing", "Testers", "Support", "Incidents", "Releases", "Data"]) {
      expect(contract).toContain(`["${area}"`);
      expect(hq).toContain(area);
    }
    expect(hq).toContain("CHURVOX_HQ_REBUILD_20260721");
    expect(hq).toContain("No live endpoint, account, subscription or customer record is changed");
  });

  test("locks owner authority and whole-site release gates into the contract", async () => {
    const contract = read("src/churvox-site-next/siteContract.js");
    expect(contract).toContain("Churvox does the admin. The owner checks and approves.");
    expect(contract).toContain("Customer-facing pages never expose another business");
    expect(contract).toContain("Migration has preview, duplicate checks, rollback rehearsal");
    expect(contract).toContain("Staging passes build, browser, accessibility, security, billing and real-business workflow gates");
  });
});
