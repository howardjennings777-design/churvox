const { test, expect } = require("@playwright/test");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("Control Room V9 replaces the rejected shell without replacing V8 logic", async () => {
  const shell = read("src/churvox-product/ProductAppV9.jsx");
  const css = read("src/churvox-product/productAppV9.css");
  const craco = read("craco.config.js");

  expect(shell).toContain('import ProductAppV8 from "./ProductAppV8"');
  expect(shell).toContain('data-churvox-layout="control-room-v9"');
  expect(craco).toContain("materializeHardening();");
  expect(craco).toContain('ProductAppV9 from "./ProductAppV9"');
  expect(craco).toContain("future bundle refreshes cannot");

  expect(css).toContain("padding-left: 224px");
  expect(css).toContain("position: fixed !important");
  expect(css).toContain("grid-template-columns:minmax(0,1.65fr)");
  expect(css).toContain("width:min(520px,94vw)");
  expect(css).toContain("grid-template-columns:repeat(5,1fr)");
});
