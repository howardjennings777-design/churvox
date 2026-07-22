const fs = require("fs");
const path = require("path");
const { test, expect } = require("@playwright/test");

const ROOT = path.resolve(__dirname, "../..");
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");

test.describe("Churvox rebuild brand contract", () => {
  test("loads the approved C-check mark across every private rebuild surface", async () => {
    const route = read("src/churvox-office-lab/OfficeTeamLab.jsx");
    const brandCss = read("src/churvox-office-os/churvoxCurrentBrand.css");
    const component = read("src/components/ChurvoxLogo.js");
    const currentMark = read("public/churvox-current-mark.svg");
    const publicMark = read("public/churvox-mark.svg");

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

    for (const source of [component, currentMark, publicMark]) {
      expect(source).toContain("M44.2 19.7C40.9 15.9");
      expect(source).toContain("M22.5 33.4l7 6.8 14.7-17");
      expect(source).not.toContain(">CV<");
    }

    expect(component).toContain("CHURVOX");
    expect(component).toContain("DOES THE ADMIN");
    expect(currentMark).toContain('aria-label="Churvox logo mark"');
    expect(publicMark).toContain('aria-label="Churvox logo mark"');
  });
});
