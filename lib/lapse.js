const K = require('./skyrim');
const Settings = require('./settings');
const { BY_KEY } = require('./forms');

const EXPIRY = {
  license: 'expires',
  requisition: 'requested-return',
  'inquiry-writ': 'date-delivered'
};

const WARN_DAYS = 10;

function yearDays() { return K.LENGTHS.reduce((a, b) => a + b, 0); }

function ordinalOf(d) {
  if (!d) return null;
  const day = parseInt(d.day, 10);
  const month = parseInt(d.month, 10);
  const year = parseInt(d.year, 10);
  if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year)) return null;
  if (month < 0 || month > 11 || day < 1) return null;
  let n = year * yearDays();
  for (let i = 0; i < month; i++) n += K.LENGTHS[i];
  return n + day;
}

function todayOrdinal(today) {
  const t = today || Settings.today();
  return ordinalOf({ day: t.day, month: t.month, year: t.year });
}

function fieldFor(rec) {
  const spec = BY_KEY[rec.Form];
  if (spec && spec.expiryField) return spec.expiryField;
  return EXPIRY[rec.Form] || null;
}

function dueOn(rec, readMeta) {
  const id = fieldFor(rec);
  if (!id) return null;
  const m = (readMeta ? readMeta(rec) : null) || {};
  const d = m.input && m.input.d && m.input.d[id];
  if (!d) return null;
  const n = ordinalOf(d);
  return n === null ? null : { d, n, text: K.formatDate(d.day, d.month, d.year) };
}

function standing(rec, readMeta, today) {
  const due = dueOn(rec, readMeta);
  if (!due) return null;
  const now = todayOrdinal(today);
  const left = due.n - now;
  return {
    due, left,
    lapsed: left < 0,
    soon: left >= 0 && left <= WARN_DAYS,
    label: left < 0
      ? `lapsed ${Math.abs(left)} day${Math.abs(left) === 1 ? '' : 's'} ago`
      : left === 0 ? 'falls due today'
        : `${left} day${left === 1 ? '' : 's'} left`
  };
}

function watchable(rec) {
  return !!fieldFor(rec) && !['Archived', 'Revoked', 'Closed'].includes(rec.Status);
}

function comingDue(rows, readMeta, u, today) {
  const out = [];
  (rows || []).forEach(r => {
    if (!watchable(r)) return;
    const st = standing(r, readMeta, today);
    if (!st || (!st.lapsed && !st.soon)) return;
    if (u) {
      const m = (readMeta ? readMeta(r) : null) || {};
      const mine = m.filer === u.username || r['Assigned To'] === u.username;
      if (!mine && !u.all) return;
    }
    out.push({ rec: r, ...st });
  });
  return out.sort((a, b) => a.left - b.left);
}

function sweep(rows, readMeta, setStatus, notify, today) {
  const done = [];
  (rows || []).forEach(r => {
    if (!watchable(r)) return;
    if (r.Status === 'Lapsed') return;
    const st = standing(r, readMeta, today);
    if (!st || !st.lapsed) return;
    try {
      setStatus(r['Record No'], 'Lapsed');
      done.push({ no: r['Record No'], subject: r.Subject, due: st.due.text });
      const m = (readMeta ? readMeta(r) : null) || {};
      if (notify && m.filer) notify(m.filer, `${r['Record No']} has lapsed — it ran only to ${st.due.text}.`, '/staff/records/' + encodeURIComponent(r['Record No']));
    } catch (_) {}
  });
  return done;
}

module.exports = { EXPIRY, WARN_DAYS, ordinalOf, todayOrdinal, fieldFor, dueOn, standing, watchable, comingDue, sweep };
