const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const EXPECTED_SHA256 = "e1bf0047230ac1a02eab0f671dae9efc3791c647c1359fc5e3968e225aba8928";

function text(bytes) {
  const zero = bytes.indexOf(0);
  return bytes.subarray(0, zero === -1 ? bytes.length : zero).toString("utf8").trim();
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
  console.log(`Materialised ${written} Churvox hardening files (${digest.slice(0, 12)}).`);
  return { written, digest };
}

module.exports = materialize;

if (require.main === module) materialize();
