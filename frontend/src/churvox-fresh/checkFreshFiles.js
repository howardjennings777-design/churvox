const fs = require("fs");
const path = require("path");

const dir = __dirname;
const appPath = path.join(dir, "FreshApp.jsx");

if (!fs.existsSync(appPath)) {
  throw new Error("Missing FreshApp.jsx");
}

const app = fs.readFileSync(appPath, "utf8");
const imports = [...app.matchAll(/import\s+([A-Za-z0-9_]+)\s+from\s+"\.\/([^"]+)";/g)];

const missing = [];

for (const match of imports) {
  const importPath = match[2];

  if (importPath.endsWith(".css")) continue;

  const jsx = path.join(dir, `${importPath}.jsx`);
  const js = path.join(dir, `${importPath}.js`);

  if (!fs.existsSync(jsx) && !fs.existsSync(js)) {
    missing.push(importPath);
  }
}

if (missing.length) {
  console.error("Fresh app is missing these files:");
  for (const item of missing) console.error(`- ${item}.jsx`);
  process.exit(1);
}

console.log("Fresh app file check passed.");
