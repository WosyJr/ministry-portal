const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const TINCTURES = [
  { id: 'or', name: 'Or', plain: 'gold', hex: '#C9A227', kind: 'metal' },
  { id: 'argent', name: 'Argent', plain: 'silver', hex: '#E9E5DA', kind: 'metal' },
  { id: 'gules', name: 'Gules', plain: 'red', hex: '#8E1B1B', kind: 'colour' },
  { id: 'azure', name: 'Azure', plain: 'blue', hex: '#27496D', kind: 'colour' },
  { id: 'sable', name: 'Sable', plain: 'black', hex: '#241C14', kind: 'colour' },
  { id: 'vert', name: 'Vert', plain: 'green', hex: '#2F5D32', kind: 'colour' },
  { id: 'purpure', name: 'Purpure', plain: 'purple', hex: '#5B2A62', kind: 'colour' },
  { id: 'tenne', name: 'Tenné', plain: 'tawny', hex: '#8A4B1E', kind: 'colour' },
  { id: 'murrey', name: 'Murrey', plain: 'mulberry', hex: '#6B2140', kind: 'colour' }
];
const TINCT = Object.fromEntries(TINCTURES.map(t => [t.id, t]));
const hex = id => (TINCT[id] || TINCT.argent).hex;

const SHAPES = [
  { id: 'heater', name: 'Heater', plain: 'the common shield', d: 'M 6 6 L 94 6 L 94 54 C 94 88 70 105 50 112 C 30 105 6 88 6 54 Z' },
  { id: 'oval', name: 'Oval', plain: 'a rounded shield', d: 'M 50 5 C 82 5 94 26 94 58 C 94 90 74 112 50 112 C 26 112 6 90 6 58 C 6 26 18 5 50 5 Z' },
  { id: 'lozenge', name: 'Lozenge', plain: 'a diamond', d: 'M 50 4 L 95 58 L 50 112 L 5 58 Z' },
  { id: 'square', name: 'Square-topped', plain: 'a flat-topped shield', d: 'M 6 6 L 94 6 L 94 96 L 50 112 L 6 96 Z' },
  { id: 'banner', name: 'Banner', plain: 'a hanging banner', d: 'M 10 6 L 90 6 L 90 100 L 50 86 L 10 100 Z' }
];
const SHAPE = Object.fromEntries(SHAPES.map(s => [s.id, s]));

const DIVISIONS = [
  { id: 'plain', name: 'Plain', plain: 'one colour all over', d: null },
  { id: 'pale', name: 'Per pale', plain: 'split down the middle', d: 'M 50 0 L 110 0 L 110 120 L 50 120 Z' },
  { id: 'fess', name: 'Per fess', plain: 'split across the middle', d: 'M -10 56 L 110 56 L 110 120 L -10 120 Z' },
  { id: 'bend', name: 'Per bend', plain: 'split corner to corner', d: 'M -10 -10 L 110 110 L -10 110 Z' },
  { id: 'chevron', name: 'Per chevron', plain: 'split in a wide V', d: 'M -10 120 L 50 44 L 110 120 Z' },
  { id: 'quarterly', name: 'Quarterly', plain: 'four quarters', d: 'M -10 -10 L 50 -10 L 50 56 L -10 56 Z M 50 56 L 110 56 L 110 120 L 50 120 Z' },
  { id: 'saltire', name: 'Per saltire', plain: 'four wedges', d: 'M -10 -10 L 50 56 L -10 120 Z M 110 -10 L 50 56 L 110 120 Z' }
];
const DIVISION = Object.fromEntries(DIVISIONS.map(d => [d.id, d]));

const ORDINARIES = [
  { id: 'none', name: 'None', plain: 'no band', d: null },
  { id: 'chief', name: 'A chief', plain: 'a band across the top', d: 'M -10 -10 L 110 -10 L 110 28 L -10 28 Z' },
  { id: 'fess', name: 'A fess', plain: 'a band across the middle', d: 'M -10 42 L 110 42 L 110 72 L -10 72 Z' },
  { id: 'pale', name: 'A pale', plain: 'a band down the middle', d: 'M 36 -10 L 64 -10 L 64 120 L 36 120 Z' },
  { id: 'bend', name: 'A bend', plain: 'a band corner to corner', d: 'M -10 10 L 10 -10 L 110 90 L 90 110 Z' },
  { id: 'cross', name: 'A cross', plain: 'an upright cross', d: 'M 36 -10 L 64 -10 L 64 42 L 110 42 L 110 72 L 64 72 L 64 120 L 36 120 L 36 72 L -10 72 L -10 42 L 36 42 Z' },
  { id: 'saltire', name: 'A saltire', plain: 'a diagonal cross', d: 'M -10 8 L 8 -10 L 50 36 L 92 -10 L 110 8 L 64 56 L 110 104 L 92 120 L 50 76 L 8 120 L -10 104 L 36 56 Z' },
  { id: 'chevron', name: 'A chevron', plain: 'a rafter shape', d: 'M 50 36 L 110 102 L 110 120 L 96 120 L 50 68 L 4 120 L -10 120 L -10 102 Z' },
  { id: 'bordure', name: 'A bordure', plain: 'a border round the edge', d: 'border' },
  { id: 'pile', name: 'A pile', plain: 'a wedge from the top', d: 'M 14 -10 L 86 -10 L 50 92 Z' }
];
const ORDINARY = Object.fromEntries(ORDINARIES.map(o => [o.id, o]));

const CHARGES = [
  { id: 'none', name: 'Nothing', group: 'Plain', d: '' },
  { id: 'tower', name: 'A tower', group: 'Works of hands', d: 'M30 78 L30 44 L34 44 L34 36 L40 36 L40 44 L46 44 L46 36 L54 36 L54 44 L60 44 L60 36 L66 36 L66 44 L70 44 L70 78 Z M44 78 L44 60 L56 60 L56 78 Z' },
  { id: 'gate', name: 'A gateway', group: 'Works of hands', d: 'M26 80 L26 40 L74 40 L74 80 L62 80 L62 56 C62 48 56 44 50 44 C44 44 38 48 38 56 L38 80 Z' },
  { id: 'bridge', name: 'A bridge', group: 'Works of hands', d: 'M22 48 L78 48 L78 58 L70 58 L70 76 L60 76 L60 62 C60 56 56 54 50 54 C44 54 40 56 40 62 L40 76 L30 76 L30 58 L22 58 Z' },
  { id: 'anvil', name: 'An anvil', group: 'Works of hands', d: 'M22 44 L66 44 L78 52 L66 56 L60 56 L58 64 L62 78 L38 78 L42 64 L40 56 L30 56 C24 56 22 52 22 48 Z' },
  { id: 'hammer', name: 'A hammer', group: 'Works of hands', d: 'M30 32 L70 32 L70 48 L58 48 L56 82 L44 82 L42 48 L30 48 Z' },
  { id: 'ship', name: 'A longship', group: 'Works of hands', d: 'M48 22 L52 22 L52 58 L48 58 Z M24 58 L76 58 L68 78 L32 78 Z M52 26 L74 34 L52 44 Z' },
  { id: 'key', name: 'A key', group: 'Works of hands', d: 'M50 20 C58 20 64 26 64 34 C64 40 60 45 55 47 L55 62 L62 62 L62 70 L55 70 L55 78 L62 78 L62 86 L45 86 L45 47 C40 45 36 40 36 34 C36 26 42 20 50 20 Z M50 28 C47 28 45 30 45 33 C45 36 47 38 50 38 C53 38 55 36 55 33 C55 30 53 28 50 28 Z' },
  { id: 'sword', name: 'A sword', group: 'Arms', d: 'M50 16 L56 30 L56 62 L44 62 L44 30 Z M30 62 L70 62 L70 70 L56 70 L56 90 L44 90 L44 70 L30 70 Z' },
  { id: 'axe', name: 'An axe', group: 'Arms', d: 'M46 18 L54 18 L54 88 L46 88 Z M54 24 C72 26 80 38 80 50 C80 62 72 70 54 72 Z' },
  { id: 'shieldc', name: 'A shield', group: 'Arms', d: 'M26 24 L74 24 L74 52 C74 70 60 82 50 88 C40 82 26 70 26 52 Z' },
  { id: 'arrow', name: 'An arrow', group: 'Arms', d: 'M50 14 L62 40 L54 40 L54 86 L46 86 L46 40 L38 40 Z' },
  { id: 'gauntlet', name: 'A gauntlet', group: 'Arms', d: 'M34 36 L42 36 L42 26 L50 26 L50 36 L58 36 L58 28 L66 28 L66 48 C66 48 74 48 74 56 L70 58 L70 74 C70 82 62 88 50 88 C38 88 30 82 30 72 L30 44 Z' },
  { id: 'horn', name: 'A drinking horn', group: 'The hall', d: 'M20 34 C46 34 72 48 80 76 L70 82 C60 60 42 48 20 48 Z M18 32 L24 32 L24 50 L18 50 Z' },
  { id: 'book', name: 'An open book', group: 'The hall', d: 'M50 36 C44 30 32 28 20 30 L20 76 C32 74 44 76 50 82 C56 76 68 74 80 76 L80 30 C68 28 56 30 50 36 Z' },
  { id: 'scroll', name: 'A scroll', group: 'The hall', d: 'M26 30 L74 30 C78 30 80 34 80 38 C80 42 78 44 74 44 L74 76 C74 82 70 86 64 86 L30 86 C24 86 22 82 22 76 L22 36 C22 32 24 30 26 30 Z M30 44 L66 44 L66 76 L30 76 Z' },
  { id: 'quill', name: 'A quill', group: 'The hall', d: 'M78 18 C54 24 34 42 26 70 L22 86 L38 82 C66 74 76 50 78 18 Z M30 78 L62 42' },
  { id: 'scales', name: 'A balance', group: 'The hall', d: 'M47 18 L53 18 L53 84 L47 84 Z M30 84 L70 84 L70 90 L30 90 Z M18 32 L82 32 L82 38 L18 38 Z M10 38 L38 38 L24 62 Z M62 38 L90 38 L76 62 Z' },
  { id: 'lamp', name: 'A lamp', group: 'The hall', d: 'M50 16 L54 28 L46 28 Z M38 32 L62 32 L62 40 L38 40 Z M34 44 L66 44 L72 78 L28 78 Z M44 84 L56 84 L56 90 L44 90 Z' },
  { id: 'wolf', name: 'A wolf’s head', group: 'Beasts', d: 'M24 26 L38 44 L62 44 L76 26 L74 54 C74 74 64 86 50 90 C36 86 26 74 26 54 Z M40 56 L46 56 L46 62 L40 62 Z M54 56 L60 56 L60 62 L54 62 Z M44 74 L56 74 L50 82 Z' },
  { id: 'bear', name: 'A bear’s head', group: 'Beasts', d: 'M26 30 C26 22 36 20 40 28 C46 25 54 25 60 28 C64 20 74 22 74 30 C74 36 70 38 68 38 C72 48 72 60 66 70 C60 82 40 82 34 70 C28 60 28 48 32 38 C30 38 26 36 26 30 Z M42 50 L46 50 L46 56 L42 56 Z M54 50 L58 50 L58 56 L54 56 Z M46 64 L54 64 L50 72 Z' },
  { id: 'stag', name: 'A stag’s attires', group: 'Beasts', d: 'M48 88 L52 88 L52 56 L48 56 Z M50 58 C42 50 38 40 38 26 M38 26 C30 32 24 30 20 24 M38 40 C30 42 24 38 22 32 M50 58 C58 50 62 40 62 26 M62 26 C70 32 76 30 80 24 M62 40 C70 42 76 38 78 32' },
  { id: 'raven', name: 'A raven', group: 'Beasts', d: 'M22 42 C34 28 54 24 66 32 L82 28 L74 40 C78 56 70 74 52 82 L30 88 L40 72 C28 68 20 56 22 42 Z M62 38 L66 38 L66 42 L62 42 Z' },
  { id: 'hawk', name: 'A hawk displayed', group: 'Beasts', d: 'M50 24 C54 24 57 27 57 31 L57 38 L88 50 L57 52 L57 70 L64 84 L50 76 L36 84 L43 70 L43 52 L12 50 L43 38 L43 31 C43 27 46 24 50 24 Z' },
  { id: 'dragon', name: 'A dragon’s head', group: 'Beasts', d: 'M18 46 L40 32 L44 20 L52 32 L74 30 C84 30 88 40 84 48 L70 54 L82 62 L60 62 L58 76 L46 66 L28 70 L34 58 Z M60 42 L66 42 L66 48 L60 48 Z' },
  { id: 'horse', name: 'A horse’s head', group: 'Beasts', d: 'M34 20 L40 34 L56 34 L62 20 L66 40 C78 48 82 62 78 80 L62 86 L56 62 L40 58 C28 54 26 38 34 20 Z M44 44 L50 44 L50 50 L44 50 Z' },
  { id: 'oak', name: 'An oak leaf', group: 'Growing things', d: 'M50 14 C58 22 62 24 70 22 C68 30 70 34 76 38 C68 42 66 46 68 54 C60 50 56 52 52 60 L52 88 L48 88 L48 60 C44 52 40 50 32 54 C34 46 32 42 24 38 C30 34 32 30 30 22 C38 24 42 22 50 14 Z' },
  { id: 'pine', name: 'A pine', group: 'Growing things', d: 'M50 12 L66 36 L58 36 L72 58 L62 58 L78 82 L54 82 L54 92 L46 92 L46 82 L22 82 L38 58 L28 58 L42 36 L34 36 Z' },
  { id: 'wheat', name: 'A sheaf of wheat', group: 'Growing things', d: 'M48 20 L52 20 L52 88 L48 88 Z M50 26 C42 28 38 34 38 42 C46 42 50 36 50 26 Z M50 26 C58 28 62 34 62 42 C54 42 50 36 50 26 Z M50 44 C42 46 38 52 38 60 C46 60 50 54 50 44 Z M50 44 C58 46 62 52 62 60 C54 60 50 54 50 44 Z M30 70 L70 70 L70 76 L30 76 Z' },
  { id: 'mountain', name: 'Three peaks', group: 'The land', d: 'M8 82 L30 42 L44 66 L56 38 L74 68 L84 54 L94 82 Z' },
  { id: 'river', name: 'A river', group: 'The land', d: 'M10 38 C26 26 38 50 54 38 C70 26 82 50 92 40 L92 54 C82 64 70 40 54 52 C38 64 26 40 10 52 Z M10 62 C26 50 38 74 54 62 C70 50 82 74 92 64 L92 78 C82 88 70 64 54 76 C38 88 26 64 10 76 Z' },
  { id: 'flame', name: 'A flame', group: 'The land', d: 'M50 12 C54 32 70 36 70 56 C70 74 62 88 50 92 C38 88 30 74 30 56 C30 44 38 40 42 32 C44 42 50 42 50 32 Z' },
  { id: 'snowflake', name: 'A snowflake', group: 'The land', d: 'M47 12 L53 12 L53 88 L47 88 Z M14 31 L17 26 L83 64 L80 69 Z M83 36 L86 41 L20 79 L17 74 Z' },
  { id: 'star', name: 'A mullet', group: 'The heavens', d: 'M50 14 L59 42 L89 42 L65 59 L74 88 L50 70 L26 88 L35 59 L11 42 L41 42 Z' },
  { id: 'sun', name: 'A sun in splendour', group: 'The heavens', d: 'M50 34 C59 34 66 41 66 50 C66 59 59 66 50 66 C41 66 34 59 34 50 C34 41 41 34 50 34 Z M47 8 L53 8 L50 26 Z M47 92 L53 92 L50 74 Z M8 47 L8 53 L26 50 Z M92 47 L92 53 L74 50 Z M20 16 L24 20 L34 36 Z M80 84 L76 80 L66 64 Z M84 20 L80 16 L64 34 Z M16 80 L20 84 L36 66 Z' },
  { id: 'moon', name: 'A crescent', group: 'The heavens', d: 'M50 10 C70 10 86 28 86 50 C86 72 70 90 50 90 C66 82 74 68 74 50 C74 32 66 18 50 10 Z' },
  { id: 'eye', name: 'An eye', group: 'The heavens', d: 'M6 50 C22 28 36 22 50 22 C64 22 78 28 94 50 C78 72 64 78 50 78 C36 78 22 72 6 50 Z M50 36 C58 36 64 42 64 50 C64 58 58 64 50 64 C42 64 36 58 36 50 C36 42 42 36 50 36 Z' },
  { id: 'crown', name: 'A crown', group: 'The heavens', d: 'M18 72 L18 30 L32 46 L41 24 L50 44 L59 24 L68 46 L82 30 L82 72 Z M18 76 L82 76 L82 86 L18 86 Z' }
];
const CHARGE = Object.fromEntries(CHARGES.map(c => [c.id, c]));

const CHARGE_GROUPS = (() => {
  const out = [];
  CHARGES.forEach(c => {
    if (c.id === 'none') return;
    let g = out.find(x => x.name === c.group);
    if (!g) { g = { name: c.group, items: [] }; out.push(g); }
    g.items.push(c);
  });
  return out;
})();

const DEFAULT = {
  shape: 'heater', field: 'azure', division: 'plain', second: 'or',
  ordinary: 'none', ordinaryTint: 'argent', charge: 'none', chargeTint: 'or', motto: ''
};

function clean(a) {
  const x = a && typeof a === 'object' ? a : {};
  const pick = (v, map, def) => (map[v] ? v : def);
  return {
    shape: pick(x.shape, SHAPE, DEFAULT.shape),
    field: pick(x.field, TINCT, DEFAULT.field),
    division: pick(x.division, DIVISION, DEFAULT.division),
    second: pick(x.second, TINCT, DEFAULT.second),
    ordinary: pick(x.ordinary, ORDINARY, DEFAULT.ordinary),
    ordinaryTint: pick(x.ordinaryTint, TINCT, DEFAULT.ordinaryTint),
    charge: pick(x.charge, CHARGE, DEFAULT.charge),
    chargeTint: pick(x.chargeTint, TINCT, DEFAULT.chargeTint),
    motto: String(x.motto || '').replace(/\s+/g, ' ').trim().slice(0, 60)
  };
}

function blazon(a) {
  const c = clean(a);
  const t = id => (TINCT[id] || {}).name || id;
  const parts = [];
  if (c.division === 'plain') parts.push(t(c.field));
  else {
    const d = DIVISION[c.division].name;
    parts.push(`${d} ${t(c.field)} and ${t(c.second)}`);
  }
  if (c.ordinary !== 'none') parts.push(`${ORDINARY[c.ordinary].name.replace(/^A /, 'a ')} ${t(c.ordinaryTint)}`);
  if (c.charge !== 'none') parts.push(`${CHARGE[c.charge].name.replace(/^A /, 'a ').replace(/^An /, 'an ')} ${t(c.chargeTint)}`);
  return parts.join(', ');
}

function clash(a) {
  const c = clean(a);
  const kind = id => (TINCT[id] || {}).kind;
  const out = [];
  if (c.division !== 'plain' && kind(c.field) === kind(c.second)) out.push('the two halves of the field are both ' + kind(c.field) + 's');
  const base = c.division === 'plain' ? kind(c.field) : null;
  if (c.ordinary !== 'none' && base && kind(c.ordinaryTint) === base) out.push('the band is the same kind as the field');
  if (c.charge !== 'none' && base && kind(c.chargeTint) === base) out.push('the charge is the same kind as the field');
  return out;
}

function svg(arms, opts) {
  const c = clean(arms);
  const o = opts || {};
  const size = Number(o.size) || 120;
  const id = 'a' + Math.random().toString(36).slice(2, 9);
  const sh = SHAPE[c.shape];
  const div = DIVISION[c.division];
  const ord = ORDINARY[c.ordinary];
  const ch = CHARGE[c.charge];
  const w = size;
  const h = Math.round(size * 1.18);
  const ordShape = ord.d === 'border'
    ? `<path d="${sh.d}" fill="none" stroke="${hex(c.ordinaryTint)}" stroke-width="12"></path>`
    : ord.d ? `<path d="${ord.d}" fill="${hex(c.ordinaryTint)}"></path>` : '';
  return `<svg class="arms" width="${w}" height="${h}" viewBox="0 0 100 118" role="img" aria-label="${esc(o.label || blazon(c))}">
  <title>${esc(o.label ? o.label + ' — ' + blazon(c) : blazon(c))}</title>
  <defs><clipPath id="${id}"><path d="${sh.d}"></path></clipPath></defs>
  <g clip-path="url(#${id})">
    <rect x="0" y="0" width="100" height="118" fill="${hex(c.field)}"></rect>
    ${div.d ? `<path d="${div.d}" fill="${hex(c.second)}"></path>` : ''}
    ${ordShape}
    ${ch && ch.d ? `<path d="${ch.d}" fill="${hex(c.chargeTint)}" stroke="${hex(c.chargeTint)}" stroke-width="${c.charge === 'stag' || c.charge === 'quill' ? 4 : 0}" stroke-linecap="round" stroke-linejoin="round" fill-rule="evenodd"></path>` : ''}
  </g>
  <path d="${sh.d}" fill="none" stroke="#3A2208" stroke-width="2.6" stroke-linejoin="round"></path>
</svg>`;
}

function block(arms, opts) {
  const c = clean(arms);
  const o = opts || {};
  return `<figure class="armsblock${o.small ? ' small' : ''}">
    ${svg(c, { size: o.size || 120, label: o.label })}
    <figcaption>
      ${o.label ? `<b>${esc(o.label)}</b><br>` : ''}
      <span class="blazon">${esc(blazon(c))}</span>
      ${c.motto ? `<br><span class="motto">“${esc(c.motto)}”</span>` : ''}
    </figcaption>
  </figure>`;
}

module.exports = {
  TINCTURES, TINCT, SHAPES, SHAPE, DIVISIONS, DIVISION, ORDINARIES, ORDINARY,
  CHARGES, CHARGE, CHARGE_GROUPS, DEFAULT, clean, blazon, clash, svg, block, hex
};
