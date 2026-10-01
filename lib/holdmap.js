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
  const here = o.active || '';
  const link = o.link || (h => `/staff/holds/${h.id}`);
  const v = o.v ? `?v=${encodeURIComponent(o.v)}` : '';

  const pins = SHAPES.map(h => {
    const c = byName[h.name] || {};
    const open = showCounts ? (c.open || 0) : 0;
    const on = here === h.id;
    const n = String(open);
    const r = open ? (n.length > 2 ? 15 : 12.5) : 6;
    const bits = [];
    if (showCounts) {
      bits.push(open ? `${open} open` : 'nothing open');
      if (c.petitions) bits.push(`${c.petitions} ${c.petitions === 1 ? 'petition' : 'petitions'}`);
      if (c.delegates) bits.push(c.delegates);
      else bits.push('no Delegate');
    } else if (on) bits.push('you are here');
    return `<a class="hmhold${on ? ' here' : ''}${open ? ' busy' : ''}" href="${esc(link(h))}"
      data-name="${esc(h.name)}" data-seat="${esc(h.seat)}" data-note="${esc(bits.join(' \u00b7 '))}"
      data-x="${h.badge[0]}" data-y="${h.badge[1]}" aria-label="${esc(h.name + ', seat of ' + h.seat + (bits.length ? ' \u2014 ' + bits.join(', ') : ''))}">
      <title>${esc(h.name)} \u2014 seat of ${esc(h.seat)}${bits.length ? '. ' + esc(bits.join(' \u00b7 ')) : ''}</title>
      <polygon class="hmhit" points="${h.pts}"></polygon>
      <g class="hmpin" transform="translate(${h.badge[0]},${h.badge[1]})">
        <circle class="hmhalo" r="${r + 7}"></circle>
        <circle class="hmdot" r="${r}"></circle>
        ${open ? `<text y="5" text-anchor="middle">${esc(n)}</text>` : ''}
      </g>
    </a>`;
  }).join('');

  return `<div class="holdmapwrap">
  <svg class="holdmap sheet" viewBox="0 0 ${W} ${H}" role="img" aria-label="A map of the nine Holds of Skyrim">
    <image href="${FILE}${v}" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="none"></image>
    <g class="hmregions">${pins}</g>
  </svg>
  <div class="hmcard" id="hmcard" hidden aria-hidden="true">
    <b class="hmcardname"></b>
    <span class="hmcardseat"></span>
    <span class="hmcardnote"></span>
  </div>
  <script src="/holdmap.js" defer></script>
</div>`;
}

module.exports = { SHAPES, svg, W, H };
