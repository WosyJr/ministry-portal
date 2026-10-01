const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const W = 952;
const H = 636;
const FILE = '/map-skyrim.jpg';

const SHAPES = [
  {
    id: 'haafingar', name: 'Haafingar', seat: 'Solitude',
    pts: '118,118 165,82 230,60 300,52 352,72 378,100 362,140 330,172 285,188 215,182 160,176 128,150',
    badge: [250, 152],
    note: 'The seat of the Empire in Skyrim, and the port everything arrives through.'
  },
  {
    id: 'hjaalmarch', name: 'Hjaalmarch', seat: 'Morthal',
    pts: '378,100 432,96 452,122 472,170 480,236 470,292 400,296 330,290 312,230 316,180 348,140',
    badge: [398, 268],
    note: 'Marsh and fog. Half the Hold is water that has not decided to be a lake.'
  },
  {
    id: 'pale', name: 'The Pale', seat: 'Dawnstar',
    pts: '432,96 492,86 545,92 580,120 616,170 644,232 652,272 600,302 530,306 472,292 480,214 452,122',
    badge: [556, 288],
    note: 'Snowfield and mine, from the Sea of Ghosts down to the plains.'
  },
  {
    id: 'winterhold', name: 'Winterhold', seat: 'Winterhold',
    pts: '545,92 616,66 700,56 790,62 848,92 876,146 866,168 790,202 716,232 660,264 644,232 596,146',
    badge: [700, 190],
    note: 'Ice, and what is left of a city after the sea took most of it.'
  },
  {
    id: 'reach', name: 'The Reach', seat: 'Markarth',
    pts: '128,150 160,176 215,182 285,188 296,250 300,310 310,374 332,434 338,470 300,486 240,452 180,412 120,360 72,308 54,262 70,208 96,170',
    badge: [212, 332],
    note: 'Stone and gorge all the way to the Hammerfell line. The hardest Hold to hold.'
  },
  {
    id: 'whiterun', name: 'Whiterun', seat: 'Whiterun',
    pts: '312,294 330,290 400,296 470,292 530,306 556,340 552,392 580,432 540,462 476,466 400,466 338,462 330,400 318,340',
    badge: [398, 408],
    note: 'The plains in the middle of everything. Every road crosses it.'
  },
  {
    id: 'eastmarch', name: 'Eastmarch', seat: 'Windhelm',
    pts: '660,264 716,232 790,202 866,168 892,214 908,286 902,356 884,430 800,468 716,478 652,456 604,400 566,342 600,302 652,272',
    badge: [756, 432],
    note: 'Hot springs, cold stone, and the Morrowind border on its shoulder.'
  },
  {
    id: 'falkreath', name: 'Falkreath', seat: 'Falkreath',
    pts: '338,470 400,466 476,466 540,462 580,432 596,486 586,548 540,586 480,606 410,608 346,576 304,520 300,486',
    badge: [396, 548],
    note: 'Old forest along the Cyrodiil road. More graves than houses.'
  },
  {
    id: 'rift', name: 'The Rift', seat: 'Riften',
    pts: '652,456 716,478 800,468 884,430 902,480 886,540 850,586 780,612 700,618 622,598 586,548 596,486 580,432 616,442',
    badge: [716, 552],
    note: 'Autumn the whole year and a lake at the bottom of it.'
  }
];

function load(open, max) {
  if (!open) return 0;
  return 0.12 + 0.34 * Math.min(1, open / Math.max(1, max));
}

function svg(counts, opts) {
  const o = opts || {};
  const byName = counts || {};
  const showCounts = o.counts !== false;
  const max = Math.max(1, ...SHAPES.map(h => (byName[h.name] || {}).open || 0));
  const here = o.active || '';
  const link = o.link || (h => `/staff/holds/${h.id}`);
  const v = o.v ? `?v=${encodeURIComponent(o.v)}` : '';

  const regions = SHAPES.map(h => {
    const c = byName[h.name] || {};
    const open = c.open || 0;
    const a = showCounts ? load(open, max) : 0;
    const on = here === h.id;
    const title = `${h.name} — seat of ${h.seat}${showCounts ? ` · ${open ? open + ' open' : 'nothing open'}` : ''}`;
    return `<a class="hmhold${on ? ' here' : ''}" href="${esc(link(h))}" aria-label="${esc(title)}">
      <title>${esc(title)}${h.note ? ' — ' + esc(h.note) : ''}</title>
      <polygon class="hmland" points="${h.pts}" style="--load:${a.toFixed(3)}"></polygon>
    </a>`;
  }).join('');

  const badges = showCounts ? SHAPES.map(h => {
    const open = (byName[h.name] || {}).open || 0;
    if (!open) return '';
    const n = String(open);
    const r = n.length > 2 ? 16 : 13;
    return `<g class="hmbadge" pointer-events="none" transform="translate(${h.badge[0]},${h.badge[1]})">
      <circle r="${r}"></circle>
      <text y="5" text-anchor="middle">${esc(n)}</text>
    </g>`;
  }).join('') : '';

  return `<svg class="holdmap sheet" viewBox="0 0 ${W} ${H}" role="img" aria-label="A map of the nine Holds of Skyrim">
  <image href="${FILE}${v}" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="none"></image>
  <g class="hmregions">${regions}</g>
  ${badges}
</svg>`;
}

module.exports = { SHAPES, svg, W, H };
