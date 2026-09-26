const fs = require('fs');
const path = require('path');
const C = require('./config');
const S = require('./store');
const { today: skyToday } = require('./skyrim');
const { LAWS } = require('./content');

const DEFAULTS = { calendar: { mode: 'real', year: C.CURRENT_YEAR }, retentionDays: 30, ministerSeal: '', laws: null };

function get() { return { ...DEFAULTS, ...S.read('settings.json', DEFAULTS) }; }
function set(patch) { return S.update('settings.json', DEFAULTS, d => Object.assign(d, patch)); }

function today() { return skyToday(get().calendar, C.CURRENT_YEAR); }
function laws() { const l = get().laws; return Array.isArray(l) ? l : LAWS; }

function imageType(buf) {
  if (!buf || buf.length < 8) return '';
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) return 'png';
  if (buf[0] === 0xFF && buf[1] === 0xD8) return 'jpg';
  return '';
}
function decodeImage(dataUrl, maxBytes = 1500000) {
  const m = /^data:image\/(png|jpe?g);base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''));
  if (!m) throw new Error('Choose a PNG or JPG image.');
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > maxBytes) throw new Error('That image is too large. Keep it under ' + Math.round(maxBytes / 1000000 * 10) / 10 + ' MB.');
  const type = imageType(buf);
  if (!type) throw new Error('That file is not a PNG or JPG image.');
  return { data: buf, type };
}
function loadImage(rel) {
  if (!rel) return null;
  const data = S.readBinary(rel);
  const type = imageType(data);
  return type ? { data, type } : null;
}

let wax = null;
function ministryWax() {
  if (!wax) { const data = fs.readFileSync(path.join(__dirname, '..', 'public', 'wax-seal.png')); wax = { data, type: 'png' }; }
  return wax;
}
function ministerSeal() { return loadImage(get().ministerSeal); }
function saveMinisterSeal(dataUrl) {
  const im = decodeImage(dataUrl);
  const rel = 'assets/minister-seal.' + im.type;
  S.writeBinary(rel, im.data);
  set({ ministerSeal: rel });
}
function clearMinisterSeal() { const s = get(); if (s.ministerSeal) S.removeFile(s.ministerSeal); set({ ministerSeal: '' }); }

module.exports = { get, set, today, laws, decodeImage, loadImage, imageType, ministryWax, ministerSeal, saveMinisterSeal, clearMinisterSeal };
