// Generates pixel-art PNG sprites for Scream Flappy. Run once with `node scripts/generate-sprites.js`.
// Zero dependencies — emits raw PNGs using Node's built-in zlib.
//
// Outputs in scream-flappy/assets/:
//   bird-up.png   (11x9)  — bird frame, wing raised
//   bird-down.png (11x9)  — bird frame, wing lowered
//   pipe-body.png (14x4)  — vertical pipe body tile (tiles vertically, stretches horizontally)
//   pipe-lip.png  (16x4)  — pipe end-cap (lip)

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// --- minimal PNG encoder (RGBA, 8-bit) ---
const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}

function writePng(outPath, w, h, pixels) {
  const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const raw = Buffer.alloc(h * (1 + w * 4));
  for (let y = 0; y < h; y++) {
    raw[y * (1 + w * 4)] = 0;
    for (let x = 0; x < w; x++) {
      const c = pixels[y * w + x];
      const o = y * (1 + w * 4) + 1 + x * 4;
      raw[o] = c[0]; raw[o + 1] = c[1]; raw[o + 2] = c[2]; raw[o + 3] = c[3];
    }
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  const png = Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, png);
  console.log('wrote', path.relative(process.cwd(), outPath), `${w}x${h}`, png.length + 'B');
}

function hex(s) {
  const h = s.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 255];
}
const T = [0, 0, 0, 0];

// --- bird ---
const birdPal = {
  outline:  hex('#2d1b2e'),
  body:     hex('#e0cb21'),
  belly:    hex('#fff8c9'),
  wing:     hex('#fff6d7'),
  beak:     hex('#f59e0b'),
  wingDark: hex('#f97316'),
  wingLight:hex('#fb7185'),
  eyeWhite: hex('#ffffff'),
  eyePupil: hex('#111827'),
  cheek:    hex('#fde68a'),
};

const birdBase = [
  [1,0,'outline'], [2,0,'outline'], [3,0,'outline'], [4,0,'outline'], [5,0,'outline'], [6,0,'outline'],
  [0,1,'outline'], [1,1,'belly'], [2,1,'belly'], [3,1,'belly'], [4,1,'body'], [5,1,'body'], [6,1,'body'], [7,1,'outline'],
  [0,2,'outline'], [1,2,'belly'], [2,2,'body'], [3,2,'body'], [4,2,'body'], [5,2,'body'], [6,2,'body'], [7,2,'wing'], [8,2,'outline'],
  [0,3,'outline'], [1,3,'body'], [2,3,'body'], [3,3,'body'], [4,3,'body'], [5,3,'body'], [6,3,'body'], [7,3,'wing'], [8,3,'eyeWhite'], [9,3,'eyeWhite'], [10,3,'outline'],
  [0,4,'outline'], [1,4,'body'], [2,4,'body'], [3,4,'body'], [4,4,'body'], [5,4,'body'], [6,4,'body'], [7,4,'wing'], [8,4,'eyeWhite'], [9,4,'eyeWhite'], [10,4,'outline'],
  [0,5,'outline'], [1,5,'body'], [2,5,'body'], [3,5,'body'], [4,5,'body'], [5,5,'body'], [6,5,'body'], [7,5,'outline'], [8,5,'wingDark'], [9,5,'wingDark'], [10,5,'outline'],
  [0,6,'outline'], [1,6,'belly'], [2,6,'belly'], [3,6,'body'], [4,6,'body'], [5,6,'beak'], [6,6,'beak'], [7,6,'outline'], [8,6,'wingLight'], [9,6,'wingLight'], [10,6,'outline'],
  [1,7,'outline'], [2,7,'belly'], [3,7,'beak'], [4,7,'beak'], [5,7,'beak'], [6,7,'outline'], [7,7,'wingDark'], [8,7,'wingDark'], [9,7,'outline'],
  [2,8,'outline'], [3,8,'outline'], [4,8,'outline'], [5,8,'outline'], [6,8,'outline'],
  [8,3,'eyeWhite'], [9,3,'eyeWhite'], [8,4,'eyePupil'],
];

const wingUp = [
  [7,1,'wing'], [8,1,'outline'],
  [7,2,'wing'], [8,2,'wing'],
  [7,3,'wing'], [8,3,'wing'],
];

const wingDown = [
  [7,5,'wingDark'], [8,5,'wingLight'],
  [7,6,'wingDark'], [8,6,'wingLight'], [9,6,'wingLight'],
  [7,7,'wingDark'], [8,7,'wingDark'], [9,7,'outline'],
];

function buildBird(extra) {
  const w = 11, h = 9;
  const px = new Array(w * h).fill(null).map(() => T.slice());
  for (const [x, y, c] of birdBase.concat(extra)) px[y * w + x] = birdPal[c];
  return { w, h, px };
}

// --- pipes ---
const pipePal = {
  outline: hex('#17351d'),
  body:    hex('#2dbd4f'),
  dark:    hex('#1f7a34'),
  light:   hex('#8df59b'),
  stripe:  [62, 194, 93, 255], // body blended with ~8% white, matches old stripe overlay
};

function buildPipeBody() {
  const w = 14, h = 4;
  const c = pipePal;
  const px = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let p;
      if (x === 0 || x === w - 1) p = c.outline;
      else if (x === 1 || x === 2) p = c.light;
      else if (x >= w - 4 && x <= w - 2) p = c.dark;
      else p = (y === 1 && (x === 4 || x === 6 || x === 8)) ? c.stripe : c.body;
      px.push(p);
    }
  }
  return { w, h, px };
}

function buildPipeLip() {
  const w = 16, h = 4;
  const c = pipePal;
  const px = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let p;
      if (y === 0 || y === h - 1) p = c.outline;
      else if (x === 0 || x === w - 1) p = c.outline;
      else if (x === 1 || x === 2) p = c.light;
      else if (x >= w - 3 && x <= w - 2) p = c.dark;
      else p = (y === 2 && (x === 5 || x === 8 || x === 11)) ? c.stripe : c.body;
      px.push(p);
    }
  }
  return { w, h, px };
}

const outDir = path.resolve(__dirname, '..', 'scream-flappy', 'assets');

const bU = buildBird(wingUp);
writePng(path.join(outDir, 'bird-up.png'), bU.w, bU.h, bU.px);

const bD = buildBird(wingDown);
writePng(path.join(outDir, 'bird-down.png'), bD.w, bD.h, bD.px);

const pB = buildPipeBody();
writePng(path.join(outDir, 'pipe-body.png'), pB.w, pB.h, pB.px);

const pL = buildPipeLip();
writePng(path.join(outDir, 'pipe-lip.png'), pL.w, pL.h, pL.px);
