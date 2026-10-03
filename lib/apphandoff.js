const crypto = require('crypto');

const LIFE = 120000;
const MAX = 200;
const codes = new Map();

function sweep() {
  const now = Date.now();
  for (const [k, v] of codes) if (now - v.at > LIFE) codes.delete(k);
  if (codes.size > MAX) {
    const oldest = [...codes.entries()].sort((a, b) => a[1].at - b[1].at).slice(0, codes.size - MAX);
    oldest.forEach(([k]) => codes.delete(k));
  }
}

function mint(username) {
  sweep();
  const code = crypto.randomBytes(24).toString('base64url');
  codes.set(code, { username, at: Date.now() });
  return code;
}

function redeem(code) {
  sweep();
  const key = String(code || '');
  const found = codes.get(key);
  if (!found) return null;
  codes.delete(key);
  if (Date.now() - found.at > LIFE) return null;
  return found.username;
}

function waiting() { sweep(); return codes.size; }

module.exports = { mint, redeem, waiting, LIFE };
