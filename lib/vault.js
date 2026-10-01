const fs = require('fs');
const path = require('path');
const C = require('./config');

const DIR = () => path.join(C.DATA_DIR, 'vault');
const LIVE = () => path.join(DIR(), 'docket-latest.json');
const KEEP = 21;

function ensure() {
  try { fs.mkdirSync(DIR(), { recursive: true }); return true; } catch (_) { return false; }
}

function stamp(d) {
  const t = d || new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
}

function keep(rows) {
  if (!Array.isArray(rows) || !rows.length) return false;
  if (!ensure()) return false;
  const body = JSON.stringify({ at: new Date().toISOString(), count: rows.length, rows });
  try {
    const tmp = LIVE() + '.tmp';
    fs.writeFileSync(tmp, body);
    fs.renameSync(tmp, LIVE());
  } catch (_) { return false; }
  const day = path.join(DIR(), `docket-${stamp()}.json`);
  try {
    if (!fs.existsSync(day)) {
      fs.writeFileSync(day, body);
      sweep();
    }
  } catch (_) {}
  return true;
}

function sweep() {
  try {
    const files = fs.readdirSync(DIR()).filter(f => /^docket-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
    while (files.length > KEEP) {
      const f = files.shift();
      try { fs.unlinkSync(path.join(DIR(), f)); } catch (_) {}
    }
  } catch (_) {}
}

function read() {
  try {
    const raw = JSON.parse(fs.readFileSync(LIVE(), 'utf8'));
    if (!raw || !Array.isArray(raw.rows)) return null;
    return raw;
  } catch (_) { return null; }
}

function rows() {
  const r = read();
  return r ? r.rows : null;
}

function state() {
  const r = read();
  let days = [];
  try {
    days = fs.readdirSync(DIR()).filter(f => /^docket-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort().reverse();
  } catch (_) {}
  return {
    has: !!r,
    at: r ? r.at : '',
    count: r ? r.count : 0,
    days: days.map(f => ({ file: f, day: f.slice(7, 17) })),
    dir: DIR()
  };
}

function dayFile(day) {
  const f = path.join(DIR(), `docket-${String(day).slice(0, 10)}.json`);
  try {
    const raw = JSON.parse(fs.readFileSync(f, 'utf8'));
    return raw && Array.isArray(raw.rows) ? raw : null;
  } catch (_) { return null; }
}

module.exports = { keep, read, rows, state, dayFile, stamp, DIR, KEEP };
