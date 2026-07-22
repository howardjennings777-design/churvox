const fs = require("fs");
const path = require("path");
const { test, expect } = require("@playwright/test");

const ROOT = path.resolve(__dirname, "../..");
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");

test.describe("Churvox rebuild brand contract", () => {
  test("loads the current Churvox mark across every private rebuild surface", async () => {
    const route = read("src/churvox-office-lab/OfficeTeamLab.jsx");
    const brandCss = read("src/churvox-office-os/churvoxCurrentBrand.css");
    const mark = read("public/churvox-current-mark.svg");

    expect(route).toContain("churvoxCurrentBrand.css");
    expect(brandCss).toContain("/churvox-current-mark.svg");

    for (const selector of [
      ".cvoscBrand",
      ".cvosBrand",
      ".cvnextBrand",
      ".cvnextFooterBrand",
      ".cvnextAuthStory",
      ".cvnextCustomerBrand",
      ".cvhqBrand",
    ]) {
      expect(brandCss).toContain(selector);
    }

    expect(mark).toContain('aria-label="Churvox logo mark"');
    expect(mark).toContain("M44.2 19.7C40.9 15.9");
    expect(mark).toContain("M22.5 33.4l7 6.8 14.7-17");
    expect(mark).not.toContain(">CV<");
  });
});
