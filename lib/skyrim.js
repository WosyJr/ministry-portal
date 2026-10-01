const MONTHS = ['Morning Star', "Sun's Dawn", 'First Seed', "Rain's Hand", 'Second Seed', 'Midyear', "Sun's Height", 'Last Seed', 'Hearthfire', 'Frostfall', "Sun's Dusk", 'Evening Star'];
const DAYS = ['Sundas', 'Morndas', 'Tirdas', 'Middas', 'Turdas', 'Fredas', 'Loredas'];
const LENGTHS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function roman(n) {
  const map = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let out = '';
  for (const [v, s] of map) while (n >= v) { out += s; n -= v; }
  return out;
}
function fromRoman(s) {
  const v = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  const str = String(s || '').toUpperCase();
  if (!/^[IVXLCDM]+$/.test(str)) return 0;
  let total = 0;
  for (let i = 0; i < str.length; i++) {
    const a = v[str[i]], b = v[str[i + 1]] || 0;
    total += a < b ? -a : a;
  }
  return roman(total) === str ? total : 0;
}

function formatDate(day, month, year, weekday) {
  const d = parseInt(day, 10), m = parseInt(month, 10), y = parseInt(year, 10);
  if (!d || isNaN(m) || m < 0 || m > 11 || !y) return '';
  const wd = weekday && DAYS.includes(weekday) ? weekday + ', ' : '';
  return `${wd}the ${ordinal(d)} day of ${MONTHS[m]}, 4E ${y}`;
}

function realParts(tz) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: 'numeric', day: 'numeric', weekday: 'short' }).formatToParts(new Date()).map(p => [p.type, p.value]));
  const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday);
  return { day: +parts.day, month: +parts.month - 1, weekday: wd };
}

function today(cal, defaultYear, tz) {
  const c = cal || {};
  let day, month, year, weekday;
  if (c.mode === 'set' && c.anchor) {
    const rate = Math.max(0, Number(c.rate) || 1);
    const elapsed = Math.max(0, Math.floor((Date.now() - Date.parse(c.anchor)) / 86400000 * rate));
    day = +c.day; month = +c.month; year = +c.year; weekday = +c.weekday || 0;
    for (let i = 0; i < elapsed; i++) {
      day += 1; weekday = (weekday + 1) % 7;
      if (day > LENGTHS[month]) { day = 1; month += 1; if (month > 11) { month = 0; year += 1; } }
    }
  } else {
    const r = realParts(tz || 'America/Detroit');
    day = r.day; month = r.month; weekday = r.weekday; year = +c.year || defaultYear;
  }
  return { day, month, year, weekday: DAYS[weekday], text: formatDate(day, month, year, DAYS[weekday]) };
}

module.exports = { MONTHS, DAYS, LENGTHS, ordinal, roman, fromRoman, formatDate, today };
