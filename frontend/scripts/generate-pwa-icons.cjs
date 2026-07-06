const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUT_DIR = path.join(__dirname, '..', 'public');
const ICON_VERSION = 'real-pwa-icon-20260707';
fs.mkdirSync(OUT_DIR, { recursive: true });

function crcTable() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    table[n] = c >>> 0;
  }
  return table;
}

const CRC_TABLE = crcTable();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}

function writePng(filename, width, height, pixels) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const row = y * (width * 4 + 1);
    raw[row] = 0;
    pixels.copy(raw, row + 1, y * width * 4, (y + 1) * width * 4);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);

  fs.writeFileSync(path.join(OUT_DIR, filename), png);
}

function clamp(v, min = 0, max = 1) {
  return Math.max(min, Math.min(max, v));
}

function mix(a, b, t) {
  return a + (b - a) * t;
}

function blend(dst, src, a) {
  const alpha = clamp(a) * (src[3] / 255);
  const inv = 1 - alpha;
  return [
    Math.round(src[0] * alpha + dst[0] * inv),
    Math.round(src[1] * alpha + dst[1] * inv),
    Math.round(src[2] * alpha + dst[2] * inv),
    255,
  ];
}

function lineDistance(px, py, ax, ay, bx, by) {
  const vx = bx - ax;
  const vy = by - ay;
  const wx = px - ax;
  const wy = py - ay;
  const c1 = vx * wx + vy * wy;
  const c2 = vx * vx + vy * vy;
  const t = c2 ? clamp(c1 / c2) : 0;
  const x = ax + t * vx;
  const y = ay + t * vy;
  return Math.hypot(px - x, py - y);
}

function smooth(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function roundedMask(x, y, r = 0.215) {
  const rx = Math.abs(x - 0.5) - (0.5 - r);
  const ry = Math.abs(y - 0.5) - (0.5 - r);
  const qx = Math.max(rx, 0);
  const qy = Math.max(ry, 0);
  const outside = Math.hypot(qx, qy) + Math.min(Math.max(rx, ry), 0) - r;
  return 1 - smooth(-0.008, 0.008, outside);
}

function iconColor(x, y) {
  const mask = roundedMask(x, y, 0.235);
  const warm = clamp((x + y) * 0.5);
  let c = [
    Math.round(mix(9, 24, warm)),
    Math.round(mix(12, 30, warm * 0.7)),
    Math.round(mix(10, 25, warm * 0.5)),
    255,
  ];

  const glow = Math.exp(-((x - 0.28) ** 2 + (y - 0.22) ** 2) / 0.04);
  c = blend(c, [249, 115, 22, 255], glow * 0.16);

  const border = Math.abs(Math.min(x, y, 1 - x, 1 - y) - 0.045);
  c = blend(c, [255, 255, 255, 255], border < 0.006 ? 0.08 : 0);

  const cx = 0.49;
  const cy = 0.51;
  const dx = x - cx;
  const dy = y - cy;
  const radius = Math.hypot(dx, dy);
  let deg = Math.atan2(dy, dx) * 180 / Math.PI;
  if (deg < 0) deg += 360;
  const ring = 1 - smooth(0.055, 0.068, Math.abs(radius - 0.305));
  const cGap = deg > 318 || deg < 38;
  const cOpen = cGap ? 0 : 1;
  const upper = deg > 190 && deg < 335;
  const orange = upper ? [255, 145, 30, 255] : [222, 66, 23, 255];
  c = blend(c, orange, ring * cOpen * 0.98);

  const lowerArc = ring * (deg > 42 && deg < 123 ? 1 : 0);
  c = blend(c, [47, 52, 49, 255], lowerArc * 0.82);

  const d1 = lineDistance(x, y, 0.345, 0.55, 0.455, 0.665);
  const d2 = lineDistance(x, y, 0.455, 0.665, 0.735, 0.36);
  const tick = 1 - smooth(0.038, 0.058, Math.min(d1, d2));
  c = blend(c, [246, 248, 250, 255], tick);

  const shine = 1 - smooth(0.055, 0.075, Math.min(d1, d2));
  c = blend(c, [255, 255, 255, 255], shine * 0.38);

  const dot = 1 - smooth(0.034, 0.046, Math.hypot(x - 0.742, y - 0.305));
  c = blend(c, [249, 115, 22, 255], dot);

  if (mask < 1) c = blend([0, 0, 0, 255], c, mask);
  return c;
}

function makeIcon(size, filename) {
  const pixels = Buffer.alloc(size * size * 4);
  const samples = size <= 192 ? 3 : 2;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < samples; sy += 1) {
        for (let sx = 0; sx < samples; sx += 1) {
          const px = (x + (sx + 0.5) / samples) / size;
          const py = (y + (sy + 0.5) / samples) / size;
          const col = iconColor(px, py);
          r += col[0]; g += col[1]; b += col[2]; a += col[3];
        }
      }
      const n = samples * samples;
      const i = (y * size + x) * 4;
      pixels[i] = Math.round(r / n);
      pixels[i + 1] = Math.round(g / n);
      pixels[i + 2] = Math.round(b / n);
      pixels[i + 3] = Math.round(a / n);
    }
  }

  writePng(filename, size, size, pixels);
}

[
  [180, 'apple-touch-icon.png'],
  [192, 'app-icon-192.png'],
  [512, 'app-icon-512.png'],
  [1024, 'app-icon-1024.png'],
].forEach(([size, file]) => makeIcon(size, file));

console.log(`Generated Churvox PNG app icons (${ICON_VERSION})`);
