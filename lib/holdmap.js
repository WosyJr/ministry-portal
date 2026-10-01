const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const W = 1200;
const H = 820;

const COAST = `M 236 118
C 246 84 292 72 320 92 C 340 106 348 132 338 154 C 362 148 386 126 406 106
C 438 76 488 74 516 102 C 534 120 550 116 562 96 C 594 60 650 56 690 86
C 714 104 742 98 764 78 C 814 44 888 56 938 96 C 976 126 1014 134 1042 160
C 1080 194 1088 252 1072 308 C 1060 356 1074 402 1058 444 C 1040 500 1008 540 978 582
C 954 614 950 646 926 668 C 888 706 832 712 780 706 C 718 698 666 714 612 726
C 550 740 494 752 438 752 C 382 752 336 730 298 692 C 250 644 208 592 176 538
C 140 478 112 422 98 362 C 84 304 86 246 110 200 C 136 150 186 124 236 118 Z`;

const SHAPES = [
  {
    id: 'haafingar', name: 'Haafingar', seat: 'Solitude',
    d: 'M 384 40 C 398 110 366 180 352 240 C 288 268 170 254 40 300 L 10 300 L 10 10 L 384 10 Z',
    label: [252, 206], badge: [252, 232], seatAt: [304, 150],
    note: 'The seat of the Empire in Skyrim, and the port everything arrives through.'
  },
  {
    id: 'hjaalmarch', name: 'Hjaalmarch', seat: 'Morthal',
    d: 'M 384 40 C 398 110 366 180 352 240 C 356 268 362 296 372 318 C 398 302 436 296 470 268 C 490 200 540 130 522 40 L 522 10 L 384 10 Z',
    label: [440, 192], badge: [440, 218], seatAt: [434, 256],
    note: 'Marsh and fog. Half the Hold is water that has not decided to be a lake.'
  },
  {
    id: 'pale', name: 'The Pale', seat: 'Dawnstar',
    d: 'M 522 40 C 540 130 490 200 470 268 C 534 304 626 308 706 344 C 736 322 768 292 790 262 C 802 196 818 120 800 36 L 800 10 L 522 10 Z',
    label: [630, 208], badge: [630, 234], seatAt: [558, 138],
    note: 'Snowfield and mine, from the Sea of Ghosts down to the plains.'
  },
  {
    id: 'winterhold', name: 'Winterhold', seat: 'Winterhold',
    d: 'M 800 36 C 818 120 802 196 790 262 C 884 282 1010 318 1130 316 L 1190 316 L 1190 10 L 800 10 Z',
    label: [948, 172], badge: [948, 198], seatAt: [884, 128],
    note: 'Ice, and what is left of a city after the sea took most of it.'
  },
  {
    id: 'reach', name: 'The Reach', seat: 'Markarth',
    d: 'M 352 240 C 288 268 170 254 40 300 L 10 300 L 10 790 L 240 790 L 240 700 C 312 626 382 538 438 494 C 420 430 390 372 372 318 C 362 296 356 268 352 240 Z',
    label: [246, 384], badge: [246, 410], seatAt: [192, 440],
    note: 'Stone and gorge all the way to the Hammerfell line. The hardest Hold to hold.'
  },
  {
    id: 'whiterun', name: 'Whiterun', seat: 'Whiterun',
    d: 'M 372 318 C 398 302 436 296 470 268 C 534 304 626 308 706 344 C 690 396 658 466 700 548 C 672 552 640 548 610 556 C 556 578 492 524 438 494 C 420 430 390 372 372 318 Z',
    label: [522, 452], badge: [522, 478], seatAt: [486, 408],
    note: 'The plains in the middle of everything. Every road crosses it.'
  },
  {
    id: 'eastmarch', name: 'Eastmarch', seat: 'Windhelm',
    d: 'M 790 262 C 768 292 736 322 706 344 C 690 396 658 466 700 548 C 800 572 950 548 1140 504 L 1190 504 L 1190 316 L 1130 316 C 1010 318 884 282 790 262 Z',
    label: [912, 420], badge: [912, 446], seatAt: [790, 352],
    note: 'Hot springs, cold stone, and the Morrowind border on its shoulder.'
  },
  {
    id: 'falkreath', name: 'Falkreath', seat: 'Falkreath',
    d: 'M 240 700 C 312 626 382 538 438 494 C 492 524 556 578 610 556 C 614 614 600 706 596 790 L 596 800 L 240 800 Z',
    label: [386, 576], badge: [386, 602], seatAt: [436, 660],
    note: 'Old forest along the Cyrodiil road. More graves than houses.'
  },
  {
    id: 'rift', name: 'The Rift', seat: 'Riften',
    d: 'M 700 548 C 800 572 950 548 1140 504 L 1190 504 L 1190 800 L 596 800 L 596 790 C 600 706 614 614 610 556 C 640 548 672 552 700 548 Z',
    label: [810, 586], badge: [810, 612], seatAt: [920, 638],
    note: 'Autumn the whole year and a lake at the bottom of it.'
  }
];

const BORDERS = [
  'M 384 40 C 398 110 366 180 352 240',
  'M 352 240 C 288 268 170 254 40 300',
  'M 522 40 C 540 130 490 200 470 268',
  'M 352 240 C 356 268 362 296 372 318',
  'M 372 318 C 398 302 436 296 470 268',
  'M 470 268 C 534 304 626 308 706 344',
  'M 706 344 C 736 322 768 292 790 262',
  'M 800 36 C 818 120 802 196 790 262',
  'M 790 262 C 884 282 1010 318 1130 316',
  'M 706 344 C 690 396 658 466 700 548',
  'M 700 548 C 800 572 950 548 1140 504',
  'M 700 548 C 672 552 640 548 610 556',
  'M 610 556 C 556 578 492 524 438 494',
  'M 438 494 C 420 430 390 372 372 318',
  'M 438 494 C 382 538 312 626 240 700',
  'M 610 556 C 614 614 600 706 596 790'
];

const RANGES = [
  { pts: [[172, 268], [198, 326], [216, 388], [242, 446], [268, 506], [294, 566]], s: 17 },
  { pts: [[228, 262], [252, 322], [272, 384], [298, 444], [322, 502]], s: 14 },
  { pts: [[290, 310], [310, 368], [328, 426], [352, 480]], s: 13 },
  { pts: [[246, 178], [292, 202], [334, 222]], s: 12 },
  { pts: [[172, 204], [214, 228], [252, 246]], s: 11 },
  { pts: [[476, 250], [520, 264], [566, 252]], s: 11 },
  { pts: [[492, 396], [542, 352], [594, 372], [646, 406]], s: 23 },
  { pts: [[508, 420], [556, 386], [606, 404], [652, 434]], s: 17 },
  { pts: [[438, 334], [488, 344], [540, 340]], s: 12 },
  { pts: [[606, 246], [664, 256], [722, 264], [772, 246]], s: 14 },
  { pts: [[620, 274], [676, 286], [734, 290]], s: 11 },
  { pts: [[812, 194], [872, 214], [932, 226], [988, 246]], s: 18 },
  { pts: [[836, 166], [896, 186], [954, 200]], s: 13 },
  { pts: [[992, 332], [1014, 394], [998, 456], [970, 508]], s: 17 },
  { pts: [[956, 346], [976, 404], [962, 460]], s: 13 },
  { pts: [[832, 412], [884, 434], [916, 464]], s: 14 },
  { pts: [[470, 646], [532, 668], [596, 674], [660, 668], [724, 654], [788, 640]], s: 17 },
  { pts: [[496, 676], [560, 696], [624, 700], [688, 690], [750, 674]], s: 13 },
  { pts: [[822, 580], [880, 576], [932, 554]], s: 15 },
  { pts: [[846, 606], [900, 600], [948, 580]], s: 11 },
  { pts: [[308, 612], [368, 634], [428, 642]], s: 13 },
  { pts: [[646, 490], [704, 478], [744, 500]], s: 14 }
];

const WOODS = [
  { box: [336, 566, 176, 94], n: 24 },
  { box: [768, 594, 156, 58], n: 15 },
  { box: [600, 686, 156, 44], n: 12 }
];

const RIVERS = [
  'M 264 470 C 284 400 300 336 326 282 C 346 240 374 198 392 160',
  'M 560 440 C 530 404 498 384 468 376',
  'M 468 376 C 548 356 648 376 712 424 C 772 468 806 480 848 470',
  'M 470 268 C 452 230 436 198 420 164',
  'M 706 580 C 766 600 826 610 886 600',
  'M 848 470 C 880 500 900 530 904 560'
];

const LAKES = [
  { c: [486, 606], r: [36, 19], rot: -12 },
  { c: [878, 636], r: [42, 21], rot: 6 },
  { c: [762, 316], r: [22, 11], rot: -4 }
];

const NEIGHBOURS = [
  { at: [596, 48], text: 'The Sea of Ghosts', cls: 'sea' },
  { at: [56, 248], text: 'High Rock', cls: 'edge', rot: -90 },
  { at: [64, 566], text: 'Hammerfell', cls: 'edge', rot: -62 },
  { at: [560, 782], text: 'Cyrodiil', cls: 'edge' },
  { at: [1152, 410], text: 'Morrowind', cls: 'edge', rot: 90 }
];

function rng(seed) {
  let t = seed >>> 0;
  return () => { t = (t * 1664525 + 1013904223) >>> 0; return t / 4294967296; };
}

const BOXES = (() => {
  const out = [];
  SHAPES.forEach(h => {
    const w = Math.max(160, h.name.length * 20);
    out.push([h.label[0] - w / 2, h.label[1] - 30, w, 76]);
    out.push([h.seatAt[0] - 58, h.seatAt[1] - 22, 116, 48]);
  });
  out.push([430, 586, 118, 40]);
  out.push([820, 616, 118, 40]);
  out.push([448, 310, 204, 34]);
  return out;
})();

function inBox(x, y) {
  for (let i = 0; i < BOXES.length; i++) {
    const b = BOXES[i];
    if (x > b[0] && x < b[0] + b[2] && y > b[1] && y < b[1] + b[3]) return true;
  }
  return false;
}

function buildPeaks() {
  const r = rng(20261001);
  const out = [];
  RANGES.forEach(range => {
    for (let i = 0; i < range.pts.length - 1; i++) {
      const a = range.pts[i], b = range.pts[i + 1];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const n = Math.max(2, Math.round(len / (range.s * 0.72)));
      for (let k = 0; k <= n; k++) {
        const t = k / n;
        const x = a[0] + (b[0] - a[0]) * t + (r() - 0.5) * range.s * 2.6;
        const y = a[1] + (b[1] - a[1]) * t + (r() - 0.5) * range.s * 1.7;
        if (inBox(x, y)) continue;
        out.push({ x, y, s: range.s * (0.45 + r() * 0.8) });
      }
    }
  });
  return out.sort((p, q) => p.y - q.y);
}

const n1 = v => Math.round(v * 10) / 10;

function peakPath(p) {
  const x = n1(p.x), y = n1(p.y), s = n1(p.s), top = n1(p.y - p.s * 1.32);
  return `<path class="pk-d" d="M ${n1(x - s)} ${y} L ${x} ${top} L ${n1(x + s)} ${y} Z"></path>`
    + `<path class="pk-l" d="M ${x} ${top} L ${n1(x + s)} ${y} L ${n1(x + s * 0.22)} ${y} Z"></path>`
    + `<path class="pk-e" d="M ${n1(x - s)} ${y} L ${x} ${top} L ${n1(x + s)} ${y}"></path>`;
}

function buildWoods() {
  const r = rng(77712);
  const out = [];
  WOODS.forEach(w => {
    for (let i = 0; i < w.n; i++) {
      const x = w.box[0] + r() * w.box[2];
      const y = w.box[1] + r() * w.box[3];
      if (inBox(x, y)) continue;
      out.push({ x, y, s: 5 + r() * 3.2 });
    }
  });
  return out.sort((p, q) => p.y - q.y);
}

function treePath(t) {
  const x = n1(t.x), y = n1(t.y), s = n1(t.s);
  return `<path class="tr" d="M ${x} ${n1(y - s * 2.1)} L ${n1(x + s * 0.8)} ${n1(y - s * 0.7)} L ${n1(x + s * 0.34)} ${n1(y - s * 0.7)} L ${n1(x + s)} ${y} L ${n1(x - s)} ${y} L ${n1(x - s * 0.34)} ${n1(y - s * 0.7)} L ${n1(x - s * 0.8)} ${n1(y - s * 0.7)} Z"></path>`;
}

const PEAKS = buildPeaks().map(peakPath).join('');
const TREES = buildWoods().map(treePath).join('');

function tower(x, y) {
  return `<path class="hmtower" d="M ${x - 5} ${y + 3} L ${x - 5} ${y - 8} L ${x - 2.4} ${y - 11.5} L ${x} ${y - 8} L ${x + 2.4} ${y - 11.5} L ${x + 5} ${y - 8} L ${x + 5} ${y + 3} Z"></path>`;
}

function load(open, max) {
  if (!open) return 0;
  return 0.05 + 0.13 * Math.min(1, open / Math.max(1, max));
}

function svg(counts, opts) {
  const o = opts || {};
  const byName = counts || {};
  const showCounts = o.counts !== false;
  const max = Math.max(1, ...SHAPES.map(h => (byName[h.name] || {}).open || 0));
  const here = o.active || '';
  const link = o.link || (h => `/staff/holds/${h.id}`);
  const uid = 'm' + Math.random().toString(36).slice(2, 8);
  const lit = o.spotlight && here ? SHAPES.find(h => h.id === here) : null;

  const regions = SHAPES.map(h => {
    const c = byName[h.name] || {};
    const open = showCounts ? (c.open || 0) : 0;
    const on = here === h.id;
    const bits = [];
    if (showCounts) {
      bits.push(open ? `${open} open` : 'nothing open');
      if (c.petitions) bits.push(`${c.petitions} ${c.petitions === 1 ? 'petition' : 'petitions'}`);
      bits.push(c.delegates ? c.delegates : 'no Delegate');
    } else if (on) bits.push('you are here');
    const n = String(open);
    const r = n.length > 2 ? 16 : 13.5;
    return `<a class="hmhold${on ? ' here' : ''}${open ? ' busy' : ''}" href="${esc(link(h))}"
      data-name="${esc(h.name)}" data-seat="${esc(h.seat)}" data-note="${esc(bits.join(' · '))}"
      data-x="${h.badge[0]}" data-y="${h.badge[1]}"
      aria-label="${esc(h.name + ', seat of ' + h.seat + (bits.length ? ' — ' + bits.join(', ') : ''))}">
      <title>${esc(h.name)} — seat of ${esc(h.seat)}${bits.length ? '. ' + esc(bits.join(' · ')) : ''}</title>
      <path class="hmland" d="${h.d}" style="--load:${load(open, max).toFixed(3)}"></path>
      ${open ? `<g class="hmpin" transform="translate(${h.badge[0]},${h.badge[1]})" pointer-events="none">
        <circle class="hmdot" r="${r}"></circle>
        <text y="5" text-anchor="middle">${esc(n)}</text>
      </g>` : ''}
    </a>`;
  }).join('');

  const names = SHAPES.map(h => `<g class="hmlabel" pointer-events="none">
      <text class="hm-name" x="${h.label[0]}" y="${h.label[1]}" text-anchor="middle">${esc(h.name)}</text>
      ${tower(h.seatAt[0], h.seatAt[1])}
      <text class="hm-seat" x="${h.seatAt[0]}" y="${h.seatAt[1] + 16}" text-anchor="middle">${esc(h.seat)}</text>
    </g>`).join('');

  return `<div class="holdmapwrap">
  <svg class="holdmap drawn${lit ? ' spotlit' : ''}" viewBox="0 0 ${W} ${H}" role="img"
    aria-label="${esc(lit ? 'A map of Skyrim with ' + lit.name + ' picked out' : 'A map of the nine Holds of Skyrim')}">
  <defs>
    <filter id="grain-${uid}" x="-2%" y="-2%" width="104%" height="104%">
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="4" seed="7" result="n"></feTurbulence>
      <feColorMatrix in="n" type="saturate" values="0"></feColorMatrix>
      <feComponentTransfer result="g"><feFuncA type="linear" slope="0.1"></feFuncA></feComponentTransfer>
      <feBlend in="SourceGraphic" in2="g" mode="multiply"></feBlend>
    </filter>
    <clipPath id="land-${uid}"><path d="${COAST}"></path></clipPath>
    ${lit ? `<filter id="soft-${uid}" x="-25%" y="-25%" width="150%" height="150%"><feGaussianBlur stdDeviation="11"></feGaussianBlur></filter>
    <mask id="spot-${uid}"><rect x="0" y="0" width="${W}" height="${H}" fill="#fff"></rect>
      <path d="${lit.d}" fill="#000" filter="url(#soft-${uid})"></path></mask>` : ''}
  </defs>

  <rect class="hmsea" x="0" y="0" width="${W}" height="${H}"></rect>
  <g class="hmswell" pointer-events="none">
    <path class="hmwash w1" d="${COAST}"></path>
    <path class="hmwash w2" d="${COAST}"></path>
    <path class="hmwash w3" d="${COAST}"></path>
  </g>

  <g filter="url(#grain-${uid})">
    <path class="hmcoast" d="${COAST}"></path>
    <g class="hmregions" clip-path="url(#land-${uid})">${regions}</g>
  </g>

  <g clip-path="url(#land-${uid})" pointer-events="none">
    ${LAKES.map(l => `<ellipse class="hmlake" cx="${l.c[0]}" cy="${l.c[1]}" rx="${l.r[0]}" ry="${l.r[1]}" transform="rotate(${l.rot} ${l.c[0]} ${l.c[1]})"></ellipse>`).join('')}
    ${RIVERS.map(d => `<path class="hmriver" d="${d}"></path>`).join('')}
    <g class="hmwoods">${TREES}</g>
    <g class="hmpeaks">${PEAKS}</g>
    <g class="hmborders">${BORDERS.map(d => `<path class="hmborder" d="${d}"></path>`).join('')}</g>
  </g>

  <path class="hmcoastline" d="${COAST}" pointer-events="none"></path>
  ${names}
  ${lit ? `<rect class="hmveil" x="0" y="0" width="${W}" height="${H}" mask="url(#spot-${uid})" pointer-events="none"></rect>` : ''}

  ${NEIGHBOURS.map(n => `<text class="hm-${n.cls}" x="${n.at[0]}" y="${n.at[1]}" text-anchor="middle"${n.rot ? ` transform="rotate(${n.rot} ${n.at[0]} ${n.at[1]})"` : ''}>${esc(n.text)}</text>`).join('')}
  <text class="hm-range" x="548" y="326" text-anchor="middle" pointer-events="none">The Throat of the World</text>
  <text class="hm-water" x="486" y="610" text-anchor="middle" pointer-events="none">Lake Ilinalta</text>
  <text class="hm-water" x="878" y="640" text-anchor="middle" pointer-events="none">Lake Honrich</text>

  <g class="hmrose" transform="translate(130,706)" pointer-events="none">
    <circle class="hmrosering" cx="0" cy="0" r="34"></circle>
    <circle class="hmrosering in" cx="0" cy="0" r="23"></circle>
    <path class="hmrosex" d="M 0 34 L 7 6 L 0 0 L -7 6 Z M 34 0 L 6 7 L 0 0 L 6 -7 Z M -34 0 L -6 7 L 0 0 L -6 -7 Z"></path>
    <path class="hmrosen" d="M 0 -34 L 8 -6 L 0 0 L -8 -6 Z"></path>
    <text class="hm-rosen" x="0" y="-41" text-anchor="middle">N</text>
  </g>
  <text class="hm-title" x="130" y="776" text-anchor="middle">Province of Skyrim</text>

  <rect class="hmframe out" x="7" y="7" width="${W - 14}" height="${H - 14}"></rect>
  <rect class="hmframe in" x="15" y="15" width="${W - 30}" height="${H - 30}"></rect>
</svg>
  <div class="hmcard" id="hmcard" hidden aria-hidden="true">
    <b class="hmcardname"></b>
    <span class="hmcardseat"></span>
    <span class="hmcardnote"></span>
  </div>
  <script src="/holdmap.js" defer></script>
</div>`;
}

module.exports = { SHAPES, svg, W, H, COAST };
