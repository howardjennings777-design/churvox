const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUT_DIR = path.join(__dirname, '..', 'public');
const ICON_VERSION = 'real-graph-logo-20260707';
fs.mkdirSync(OUT_DIR, { recursive: true });

function crcTable() { const table = new Uint32Array(256); for (let n = 0; n < 256; n += 1) { let c = n; for (let k = 0; k < 8; k += 1) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1); table[n] = c >>> 0; } return table; }
const CRC_TABLE = crcTable();
function crc32(buf) { let c = 0xffffffff; for (let i = 0; i < buf.length; i += 1) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(type, data) { const t = Buffer.from(type, 'ascii'); const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0); return Buffer.concat([len, t, data, crc]); }
function writePng(filename, width, height, pixels) { const raw = Buffer.alloc((width * 4 + 1) * height); for (let y = 0; y < height; y += 1) { const row = y * (width * 4 + 1); raw[row] = 0; pixels.copy(raw, row + 1, y * width * 4, (y + 1) * width * 4); } const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 6; const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]); fs.writeFileSync(path.join(OUT_DIR, filename), png); }
function clamp(v, min = 0, max = 1) { return Math.max(min, Math.min(max, v)); }
function mix(a, b, t) { return a + (b - a) * t; }
function smooth(edge0, edge1, x) { const t = clamp((x - edge0) / (edge1 - edge0)); return t * t * (3 - 2 * t); }
function blend(dst, src, a) { const alpha = clamp(a) * (src[3] / 255); const inv = 1 - alpha; return [Math.round(src[0] * alpha + dst[0] * inv), Math.round(src[1] * alpha + dst[1] * inv), Math.round(src[2] * alpha + dst[2] * inv), Math.round(255 * Math.max(dst[3] / 255, alpha))]; }
function lineDistance(px, py, ax, ay, bx, by) { const vx = bx - ax; const vy = by - ay; const wx = px - ax; const wy = py - ay; const c1 = vx * wx + vy * wy; const c2 = vx * vx + vy * vy; const t = c2 ? clamp(c1 / c2) : 0; const x = ax + t * vx; const y = ay + t * vy; return Math.hypot(px - x, py - y); }
function roundedMask(x, y, r = 0.205) { const rx = Math.abs(x - 0.5) - (0.5 - r); const ry = Math.abs(y - 0.5) - (0.5 - r); const qx = Math.max(rx, 0); const qy = Math.max(ry, 0); const outside = Math.hypot(qx, qy) + Math.min(Math.max(rx, ry), 0) - r; return 1 - smooth(-0.008, 0.008, outside); }
function inArc(deg, start, end) { return start < end ? deg >= start && deg <= end : deg >= start || deg <= end; }
function arcAlpha(x, y, cx, cy, radius, width, start, end) { const dx = x - cx; const dy = y - cy; const d = Math.hypot(dx, dy); let deg = Math.atan2(dy, dx) * 180 / Math.PI; if (deg < 0) deg += 360; return (inArc(deg, start, end) ? 1 : 0) * (1 - smooth(width * 0.42, width * 0.56, Math.abs(d - radius))); }
function roundSegmentAlpha(x, y, ax, ay, bx, by, width) { return 1 - smooth(width * 0.42, width * 0.56, lineDistance(x, y, ax, ay, bx, by)); }
function circleRingAlpha(x, y, cx, cy, outer, inner) { const d = Math.hypot(x - cx, y - cy); return (1 - smooth(outer * 0.92, outer, d)) * smooth(inner * 0.86, inner, d); }

function iconColor(x, y) {
  const mask = roundedMask(x, y, 0.225);
  let c = [0, 0, 0, 0];
  if (mask > 0) {
    const warm = clamp((x + y) * 0.5);
    c = [Math.round(mix(18, 5, warm)), Math.round(mix(21, 7, warm)), Math.round(mix(24, 9, warm)), Math.round(255 * mask)];
    c = blend(c, [255, 255, 255, 255], (Math.abs(Math.min(x, y, 1 - x, 1 - y) - 0.042) < 0.006 ? 0.075 : 0) * mask);
    const glow = Math.exp(-((x - 0.38) ** 2 + (y - 0.30) ** 2) / 0.055);
    c = blend(c, [249, 115, 22, 255], glow * 0.10 * mask);
  }

  const orangeTop = arcAlpha(x, y, 0.57, 0.50, 0.305, 0.115, 205, 315);
  const orangeBottom = arcAlpha(x, y, 0.58, 0.50, 0.305, 0.115, 42, 155);
  const orange = [255, Math.round(mix(118, 150, y)), 0, 255];
  c = blend(c, [93, 32, 0, 255], Math.max(orangeTop, orangeBottom) * 0.28);
  c = blend(c, orange, Math.max(orangeTop, orangeBottom));

  const speed = Math.max(
    roundSegmentAlpha(x, y, 0.14, 0.52, 0.27, 0.52, 0.030),
    roundSegmentAlpha(x, y, 0.18, 0.58, 0.29, 0.58, 0.030),
    roundSegmentAlpha(x, y, 0.21, 0.64, 0.38, 0.64, 0.030),
    1 - smooth(0.014, 0.021, Math.hypot(x - 0.105, y - 0.58))
  );
  c = blend(c, [255, 126, 0, 255], speed);

  const graph = Math.max(
    roundSegmentAlpha(x, y, 0.33, 0.55, 0.47, 0.50, 0.048),
    roundSegmentAlpha(x, y, 0.47, 0.50, 0.59, 0.57, 0.048),
    roundSegmentAlpha(x, y, 0.59, 0.57, 0.80, 0.37, 0.048)
  );
  c = blend(c, [58, 61, 65, 255], graph * 0.35);
  c = blend(c, [238, 240, 244, 255], graph);
  const nodes = Math.max(
    circleRingAlpha(x, y, 0.33, 0.55, 0.052, 0.026),
    circleRingAlpha(x, y, 0.47, 0.50, 0.046, 0.023),
    circleRingAlpha(x, y, 0.80, 0.37, 0.046, 0.023)
  );
  c = blend(c, [247, 248, 250, 255], nodes);
  return c;
}

function makeIcon(size, filename) { const pixels = Buffer.alloc(size * size * 4); const samples = size <= 192 ? 3 : 2; for (let y = 0; y < size; y += 1) { for (let x = 0; x < size; x += 1) { let r = 0, g = 0, b = 0, a = 0; for (let sy = 0; sy < samples; sy += 1) for (let sx = 0; sx < samples; sx += 1) { const px = (x + (sx + 0.5) / samples) / size; const py = (y + (sy + 0.5) / samples) / size; const col = iconColor(px, py); r += col[0]; g += col[1]; b += col[2]; a += col[3]; } const n = samples * samples; const i = (y * size + x) * 4; pixels[i] = Math.round(r / n); pixels[i + 1] = Math.round(g / n); pixels[i + 2] = Math.round(b / n); pixels[i + 3] = Math.round(a / n); } } writePng(filename, size, size, pixels); }
[[180, 'apple-touch-icon.png'], [192, 'app-icon-192.png'], [512, 'app-icon-512.png'], [1024, 'app-icon-1024.png']].forEach(([size, file]) => makeIcon(size, file));
console.log(`Generated Churvox PNG app icons (${ICON_VERSION})`);
