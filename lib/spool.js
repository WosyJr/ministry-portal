const S = require('./store');

const FILE = 'spool.json';
const MAX = 500;

let runner = null;
let flushing = false;
let apply = null;

function register(fn) { apply = fn; }

function held() {
  const list = S.read(FILE, []);
  return Array.isArray(list) ? list : [];
}

function offline(err) {
  const msg = String((err && err.message) || err || '');
  const code = (err && (err.code || (err.response && err.response.status))) || '';
  if (/not connected to Google|archives are not connected/i.test(msg)) return false;
  if (/ENOTFOUND|ECONNRESET|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|socket hang up|network|getaddrinfo/i.test(msg)) return true;
  if (/invalid_grant|unauthorized_client|invalid_client|Token has been expired or revoked/i.test(msg)) return true;
  if (/^(408|429|500|502|503|504)$/.test(String(code))) return true;
  if (/\b(500|502|503|504)\b.*(Internal|Bad Gateway|Service Unavailable|Gateway Timeout)/i.test(msg)) return true;
  if (/The service is currently unavailable|backendError|rateLimitExceeded|userRateLimitExceeded/i.test(msg)) return true;
  return false;
}

function add(op, args, by, shown) {
  const entry = {
    id: S.id(),
    op,
    args,
    at: new Date().toISOString(),
    by: (by && by.name) || '',
    byUser: (by && by.username) || '',
    shown: shown || null,
    tries: 0,
    lastError: ''
  };
  S.update(FILE, [], list => {
    if (list.length >= MAX) throw new Error('Too much work is already held. The Minister must clear it before more can be taken.');
    list.push(entry);
  });
  begin();
  return entry;
}

function remove(id) {
  S.update(FILE, [], list => {
    const i = list.findIndex(x => x.id === id);
    if (i > -1) list.splice(i, 1);
  });
}

function note(id, err) {
  S.update(FILE, [], list => {
    const e = list.find(x => x.id === id);
    if (!e) return;
    e.tries = (e.tries || 0) + 1;
    e.lastError = String((err && err.message) || err || '').slice(0, 300);
    e.lastTry = new Date().toISOString();
  });
}

function rowsHeld() {
  return held().filter(e => e.op === 'file' && e.shown && e.shown.row).map(e => ({
    ...e.shown.row,
    __held: true,
    __heldId: e.id,
    __heldAt: e.at
  }));
}

function marks() {
  const out = {};
  held().forEach(e => {
    const no = e.op === 'file'
      ? (e.shown && e.shown.row && e.shown.row['Record No'])
      : (e.args && e.args[0]);
    if (!no) return;
    out[no] = (out[no] || 0) + 1;
  });
  return out;
}

function state() {
  const list = held();
  const bad = list.find(e => e.lastError);
  return {
    count: list.length,
    oldest: list.length ? list[0].at : '',
    flushing,
    lastError: bad ? bad.lastError : '',
    items: list.map(e => ({
      id: e.id, op: e.op, at: e.at, by: e.by, tries: e.tries || 0, lastError: e.lastError || '',
      what: describe(e)
    }))
  };
}

const OP_WORDS = {
  file: 'A new record laid',
  edit: 'An amendment',
  approve: 'A seal set',
  sealNow: 'A seal set',
  sendBack: 'A record sent back',
  resubmit: 'A record laid again',
  setStatus: 'A change of standing',
  assign: 'A record given to an officer',
  setPublic: 'A change to what the public may read',
  setHold: 'A change of Hold',
  link: 'A record tied to another'
};

function describe(e) {
  const word = OP_WORDS[e.op] || 'A change';
  const no = e.op === 'file'
    ? (e.shown && e.shown.row && e.shown.row['Record No']) || ''
    : (e.args && e.args[0]) || '';
  return no ? `${word} — ${no}` : word;
}

async function flush() {
  if (flushing || !apply) return { sent: 0, stopped: false };
  const list = held();
  if (!list.length) return { sent: 0, stopped: false };
  flushing = true;
  let sent = 0;
  let stopped = false;
  try {
    for (const e of list) {
      try {
        await apply(e);
        remove(e.id);
        sent += 1;
      } catch (err) {
        note(e.id, err);
        stopped = true;
        break;
      }
    }
  } finally {
    flushing = false;
  }
  if (!held().length) stop();
  return { sent, stopped };
}

function begin() {
  if (runner) return;
  runner = setInterval(() => { flush().catch(() => {}); }, 60000);
  if (runner.unref) runner.unref();
}

function stop() {
  if (!runner) return;
  clearInterval(runner);
  runner = null;
}

function wake() {
  if (held().length) flush().catch(() => {});
}

function resume() { if (held().length) begin(); }

module.exports = { FILE, held, add, remove, offline, flush, wake, resume, state, rowsHeld, marks, register, describe };
