const fs = require("fs");
const path = require("path");
const { test, expect } = require("@playwright/test");

const ROOT = path.resolve(__dirname, "../..");
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");

test.describe("Churvox whole website rebuild contract", () => {
  test("keeps the public owner and HQ previews isolated behind the private lab route", async () => {
    const route = read("src/churvox-office-lab/OfficeTeamLab.jsx");
    expect(route).toContain("window.location.pathname === '/new-command-lab'");
    expect(route).toContain("value === 'public' || value === 'hq'");
    expect(route).toContain("<PublicSiteNext />");
    expect(route).toContain("<HQNext />");
    expect(route).toContain("<OfficeOSPreview />");
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
