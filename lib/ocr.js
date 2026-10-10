const path = require('path');
const os = require('os');

const LANG = path.join(__dirname, '..', 'vendor', 'tessdata');
const IDLE_MS = 5 * 60 * 1000;
const MAX_BYTES = 6 * 1024 * 1024;

let worker = null;
let chain = Promise.resolve();
let idle = null;

function touch() {
  clearTimeout(idle);
  idle = setTimeout(() => { const w = worker; worker = null; if (w) w.terminate().catch(() => {}); }, IDLE_MS);
  if (idle.unref) idle.unref();
}

async function getWorker() {
  if (worker) { touch(); return worker; }
  const { createWorker } = require('tesseract.js');
  worker = await createWorker('eng', 1, { langPath: LANG, gzip: false, cachePath: path.join(os.tmpdir(), 'ministry-tess'), logger: () => {} });
  await worker.setParameters({ preserve_interword_spaces: '1' });
  touch();
  return worker;
}

function decode(dataUrl) {
  const m = /^data:image\/(png|jpe?g|webp|gif|bmp);base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''));
  if (!m) throw new Error('That is not a picture this can read. Use a PNG or JPG screenshot.');
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > MAX_BYTES) throw new Error('That screenshot is too large. Crop it to the log, or paste the text instead.');
  return buf;
}

async function prepare(buf) {
  const Jimp = require('jimp');
  const img = await Jimp.read(buf);
  const w = img.bitmap.width, h = img.bitmap.height;
  const k = w * h > 6000000 ? 1 : w < 1600 ? 2 : 1.5;
  if (k !== 1) img.scale(k, Jimp.RESIZE_BICUBIC);
  img.greyscale();
  let sum = 0, n = 0;
  const d = img.bitmap.data;
  for (let i = 0; i < d.length; i += 4 * 37) { sum += d[i]; n++; }
  const dark = sum / n < 110;
  if (dark) img.invert();
  return { png: await img.getBufferAsync(Jimp.MIME_PNG), dark, scale: k };
}

function readImage(dataUrl) {
  const buf = decode(dataUrl);
  const job = chain.then(async () => {
    const t0 = Date.now();
    const { png, dark } = await prepare(buf);
    const w = await getWorker();
    const { data } = await w.recognize(png);
    touch();
    return { text: data.text || '', confidence: Math.round(data.confidence || 0), dark, ms: Date.now() - t0 };
  });
  chain = job.catch(() => {});
  return job;
}

module.exports = { readImage };
