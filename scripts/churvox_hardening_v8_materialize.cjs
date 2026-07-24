const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const EXPECTED_SHA256 = "e1bf0047230ac1a02eab0f671dae9efc3791c647c1359fc5e3968e225aba8928";
const PATCH_SHA256 = "5622d422495b6f82c7d382588a450b8b1abb650cd840d247f4fdbba289c06c73";

function text(bytes) {
  const zero = bytes.indexOf(0);
  return bytes.subarray(0, zero === -1 ? bytes.length : zero).toString("utf8").trim();
}

function applyUnifiedPatch(root, patchText) {
  const lines = patchText.match(/.*(?:\n|$)/g).filter(Boolean);
  const hunkHeader = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/;
  let index = 0;
  let changed = 0;
  while (index < lines.length) {
    if (!lines[index].startsWith("--- ")) { index += 1; continue; }
    index += 1;
    if (index >= lines.length || !lines[index].startsWith("+++ ")) throw new Error("Malformed Churvox hardening patch");
    let targetName = lines[index].slice(4).trim();
    if (targetName.startsWith("b/")) targetName = targetName.slice(2);
    const target = path.resolve(root, targetName);
    if (target !== root && !target.startsWith(`${root}${path.sep}`)) throw new Error(`Unsafe patch path: ${targetName}`);
    const source = fs.readFileSync(target, "utf8").match(/.*(?:\n|$)/g).filter((line) => line.length);
    const output = [];
    let cursor = 0;
    index += 1;
    while (index < lines.length && !lines[index].startsWith("--- ")) {
      if (!lines[index].startsWith("@@ ")) { index += 1; continue; }
      const match = hunkHeader.exec(lines[index]);
      if (!match) throw new Error(`Malformed patch hunk for ${targetName}`);
      const oldStart = Number(match[1]) - 1;
      const oldCount = Number(match[2] || 1);
      const newCount = Number(match[4] || 1);
      output.push(...source.slice(cursor, oldStart));
      cursor = oldStart;
      let consumedOld = 0;
      let consumedNew = 0;
      index += 1;
      while (consumedOld < oldCount || consumedNew < newCount) {
        if (index >= lines.length) throw new Error(`Truncated patch hunk for ${targetName}`);
        const line = lines[index];
        if (line.startsWith("\\ No newline")) { index += 1; continue; }
        const prefix = line[0];
        const body = line.slice(1);
        if (prefix === " ") {
          if (source[cursor] !== body) throw new Error(`Patch context mismatch in ${targetName}`);
          output.push(body);
          cursor += 1;
          consumedOld += 1;
          consumedNew += 1;
        } else if (prefix === "-") {
          if (source[cursor] !== body) throw new Error(`Patch removal mismatch in ${targetName}`);
          cursor += 1;
          consumedOld += 1;
        } else if (prefix === "+") {
          output.push(body);
          consumedNew += 1;
        } else {
          throw new Error(`Unexpected patch line in ${targetName}`);
        }
        index += 1;
      }
    }
    output.push(...source.slice(cursor));
    fs.writeFileSync(target, output.join(""));
    changed += 1;
  }
  return changed;
}

function applySecurityPatch(root) {
  const patchPath = path.join(root, "scripts", "churvox_hardening_v8_security_patch.gz.b64");
  const compressed = Buffer.from(fs.readFileSync(patchPath, "utf8").trim(), "base64");
  const digest = crypto.createHash("sha256").update(compressed).digest("hex");
  if (digest !== PATCH_SHA256) throw new Error(`Hardening patch checksum mismatch: ${digest}`);
  return applyUnifiedPatch(root, zlib.gunzipSync(compressed).toString("utf8"));
}

function materialize() {
  const root = path.resolve(__dirname, "..");
  const partsDir = path.join(__dirname, "churvox_hardening_v8_parts");
  const parts = fs.readdirSync(partsDir).filter((name) => name.startsWith("part_")).sort();
  if (parts.length !== 9) throw new Error(`Expected 9 hardening bundle parts, found ${parts.length}`);

  const encoded = parts.map((name) => fs.readFileSync(path.join(partsDir, name), "utf8").trim()).join("");
  const archive = Buffer.from(encoded, "base64");
  const digest = crypto.createHash("sha256").update(archive).digest("hex");
  if (digest !== EXPECTED_SHA256) throw new Error(`Hardening bundle checksum mismatch: ${digest}`);

  const tar = zlib.gunzipSync(archive);
  let offset = 0;
  let written = 0;
  while (offset + 512 <= tar.length) {
    const header = tar.subarray(offset, offset + 512);
    if (header.every((value) => value === 0)) break;
    const name = text(header.subarray(0, 100));
    const prefix = text(header.subarray(345, 500));
    const archivePath = prefix ? `${prefix}/${name}` : name;
    const size = parseInt(text(header.subarray(124, 136)) || "0", 8) || 0;
    const mode = parseInt(text(header.subarray(100, 108)) || "644", 8) || 0o644;
    const type = String.fromCharCode(header[156] || 48);
    const dataStart = offset + 512;
    const dataEnd = dataStart + size;
    const target = path.resolve(root, archivePath);
    if (target !== root && !target.startsWith(`${root}${path.sep}`)) throw new Error(`Unsafe bundle path: ${archivePath}`);

    if (type === "5") {
      fs.mkdirSync(target, { recursive: true });
    } else if (type === "0" || type === "\0") {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, tar.subarray(dataStart, dataEnd));
      fs.chmodSync(target, mode);
      written += 1;
    }
    offset = dataStart + Math.ceil(size / 512) * 512;
  }
  const patched = applySecurityPatch(root);
  console.log(`Materialised ${written} Churvox hardening files and patched ${patched} safety-critical files (${digest.slice(0, 12)}).`);
  return { written, patched, digest };
}

module.exports = materialize;

if (require.main === module) materialize();
