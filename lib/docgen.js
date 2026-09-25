const D = require('docx');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType,
  BorderStyle, ShadingType, Footer, PageNumber, VerticalAlign, TableLayoutType
} = D;

const INK = '2B1B0E';
const OXBLOOD = '6B1414';
const GOLD = '8C6A2F';
const SEPIA = '5A4128';
const PAGE = 'F3E9D2';
const LABEL = 'E6D5AC';
const HEAD = 'D9C08C';
const FILL = '1F2A44';
const TITLE_FONT = 'Fondamento';
const BODY_FONT = 'EB Garamond';
const W = 10080;
const MINISTRY = 'Provincial Ministry of Civil and Administrative Affairs';

function r(text, o = {}) {
  return new TextRun({ text, bold: o.b, italics: o.i, color: o.color || INK, size: o.size, font: o.font || BODY_FONT, allCaps: o.caps, characterSpacing: o.sp });
}
function p(children, o = {}) {
  if (typeof children === 'string') children = [r(children, o)];
  return new Paragraph({ children, alignment: o.align, spacing: { before: o.before ?? 0, after: o.after ?? 80, line: o.line }, border: o.border, keepNext: o.keepNext, indent: o.indent });
}

const none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const thin = { style: BorderStyle.SINGLE, size: 6, color: GOLD };
const noBorders = { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none };
const goldBorders = { top: thin, bottom: thin, left: thin, right: thin, insideHorizontal: thin, insideVertical: thin };

function cell(children, width, o = {}) {
  return new TableCell({
    children: Array.isArray(children) ? children : [children],
    width: { size: width, type: WidthType.DXA },
    shading: o.fill ? { fill: o.fill, type: ShadingType.CLEAR, color: 'auto' } : undefined,
    margins: { top: 70, bottom: 70, left: 120, right: 120 },
    verticalAlign: o.v || VerticalAlign.CENTER,
    borders: o.borders
  });
}
function table(rows, widths, borders = goldBorders) {
  return new Table({ rows, columnWidths: widths, width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA }, borders, layout: TableLayoutType.FIXED, alignment: AlignmentType.CENTER });
}
function checks(opts, chosen) {
  const kids = [];
  opts.forEach((o, i) => {
    const on = chosen === o;
    if (i) kids.push(r('    '));
    kids.push(r(on ? '☒ ' : '☐ ', { color: on ? OXBLOOD : GOLD }), r(o, { b: on, color: on ? OXBLOOD : INK }));
  });
  return kids;
}
const filled = t => r(t, { color: FILL });

function valueParas(f, v) {
  if (f.type === 'fixed') return [p([r(f.value)], { after: 0 })];
  if (f.type === 'options') return [p(checks(f.options, v), { after: 0 })];
  if (v) return String(v).split(/\r?\n/).map(line => p([filled(line)], { after: 0 }));
  if (f.type === 'date') return [p([r('the ____ day of ______________, 4E ______', { color: GOLD })], { after: 0 })];
  return [p([r('')], { after: 0 })];
}
function kv(fields, vals) {
  return table(fields.map(f => new TableRow({
    cantSplit: true,
    children: [cell(p([r(f.label, { b: true, color: SEPIA })], { after: 0 }), 3000, { fill: LABEL }), cell(valueParas(f, vals[f.id]), 7080)]
  })), [3000, 7080]);
}
function grid(headers, n, widths, rows) {
  widths = widths ? widths.slice() : headers.map(() => Math.floor(W / headers.length));
  widths[widths.length - 1] += W - widths.reduce((a, b) => a + b, 0);
  const data = (rows || []).filter(row => row.some(c => c && c.trim()));
  const count = Math.max(n, data.length);
  const hr = new TableRow({ tableHeader: true, children: headers.map((h, i) => cell(p([r(h, { b: true, color: SEPIA })], { after: 0 }), widths[i], { fill: HEAD })) });
  const body = [];
  for (let i = 0; i < count; i++) {
    const row = data[i] || [];
    body.push(new TableRow({ children: widths.map((w, j) => cell(p([filled(row[j] || '')], { after: 0 }), w, { v: VerticalAlign.TOP })) }));
  }
  return table([hr, ...body], widths);
}
function lines(n, text) {
  const dot = { style: BorderStyle.DOTTED, size: 6, color: GOLD };
  const content = (text || '').split(/\r?\n/).filter((l, i, a) => l.trim() || (i > 0 && i < a.length - 1));
  const count = Math.max(n, content.length);
  const rows = [];
  for (let i = 0; i < count; i++) rows.push(new TableRow({ height: { value: 400, rule: 'atLeast' }, children: [cell(p([filled(content[i] || '')], { after: 0 }), W, { v: VerticalAlign.BOTTOM })] }));
  return table(rows, [W], { top: none, left: none, right: none, bottom: dot, insideHorizontal: dot, insideVertical: none });
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
function titleCase(s) {
  const small = new Set(['and', 'or', 'of', 'the', 'if', 'to', 'for', 'in', 'a', 'an', 'by', 'any']);
  return s.toLowerCase().split(' ').map((w, i) => (i && small.has(w)) ? w : w.replace(/(^|[\/\-(])([a-z])/g, (m, a, b) => a + b.toUpperCase())).join(' ').replace(/'S\b/g, "'s");
}
function heading(num, text) {
  return new Paragraph({
    children: [r(num + '.  ', { font: TITLE_FONT, color: GOLD, size: 26 }), r(titleCase(text), { font: TITLE_FONT, color: OXBLOOD, size: 26 })],
    spacing: { before: 280, after: 120 }, keepNext: true, border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: GOLD, space: 2 } }
  });
}
function masthead(title, subtitle) {
  return [
    p([r('By the Authority of the Governor', { caps: true, color: GOLD, size: 15, sp: 20, b: true })], { align: AlignmentType.CENTER, after: 40 }),
    p([r('Cyrodilic Administration for the Imperial Province of Skyrim', { font: TITLE_FONT, i: true, color: SEPIA, size: 20 })], { align: AlignmentType.CENTER, after: 40 }),
    new Paragraph({ children: [r(MINISTRY, { font: TITLE_FONT, color: OXBLOOD, size: 30 })], alignment: AlignmentType.CENTER, spacing: { before: 0, after: 100 }, border: { bottom: { style: BorderStyle.DOUBLE, size: 6, color: GOLD, space: 6 } } }),
    p([r('❧   ✦   ☙', { color: GOLD, size: 22 })], { align: AlignmentType.CENTER, after: 40 }),
    p([r(title, { font: TITLE_FONT, color: INK, size: 46 })], { align: AlignmentType.CENTER, after: 40 }),
    p([r(subtitle, { i: true, color: SEPIA, size: 22 })], { align: AlignmentType.CENTER, after: 160 })
  ];
}
function banner(text) {
  return table([new TableRow({ children: [cell(p([r(text, { caps: true, b: true, color: OXBLOOD, size: 18, sp: 10 })], { align: AlignmentType.CENTER, after: 0 }), W, { fill: 'EBD6B8' })] })], [W],
    { top: { style: BorderStyle.DOUBLE, size: 6, color: OXBLOOD }, bottom: { style: BorderStyle.DOUBLE, size: 6, color: OXBLOOD }, left: none, right: none, insideHorizontal: none, insideVertical: none });
}
function recordHeader(label, recordNo, recordDate) {
  const c = (h, kids) => cell([p([r(h, { font: TITLE_FONT, color: OXBLOOD, size: 21 })], { align: AlignmentType.CENTER, after: 40 }), p(kids, { align: AlignmentType.CENTER, after: 0 })], 3360, { fill: 'EFE2C2' });
  return table([new TableRow({ children: [
    c(label + ' No.', [recordNo ? r(recordNo, { b: true, color: FILL }) : r('______________', { color: GOLD })]),
    c('Date of Record', [recordDate ? r(recordDate, { color: FILL, size: 20 }) : r('____ of ___________, 4E ____', { size: 20 })]),
    c('Record State', checks(['Open', 'Closed', 'Archived'], 'Open'))
  ] })], [3360, 3360, 3360]);
}
function preamble(text) {
  return new Paragraph({ children: [r(text[0], { font: TITLE_FONT, color: OXBLOOD, size: 40 }), r(text.slice(1), { i: true, color: SEPIA, size: 22 })], alignment: AlignmentType.BOTH, spacing: { before: 200, after: 120, line: 290 }, indent: { left: 360, right: 360 } });
}
function sigBlock(roles, names, recordDate) {
  const n = roles.length, w = Math.floor(W / n);
  const widths = roles.map((_, i) => i === n - 1 ? W - w * (n - 1) : w);
  const col = (role, i) => {
    const nm = (names && names[i]) || '';
    return cell([
      p([nm ? r(nm.split(',')[0], { font: TITLE_FONT, i: true, size: 26, color: FILL }) : r('')], { before: nm ? 180 : 420, after: 0, keepNext: true }),
      new Paragraph({ children: [r('Signature', { i: true, size: 18, color: SEPIA })], spacing: { before: 0, after: 20 }, keepNext: true, border: { top: { style: BorderStyle.SINGLE, size: 6, color: INK, space: 2 } } }),
      p([r(role, { b: true, color: OXBLOOD })], { after: 80, keepNext: true }),
      p([r('Name & Office: ', { size: 20, color: SEPIA }), nm ? r(nm, { size: 20, color: FILL }) : r('____________________', { color: GOLD, size: 20 })], { after: 60, keepNext: true }),
      p([r('Dated ', { size: 20, color: SEPIA }), nm && recordDate ? r(recordDate, { size: 20, color: FILL }) : r('____ of ___________, 4E ____', { size: 20 })], { after: 0, keepNext: true })
    ], widths[i], { v: VerticalAlign.TOP, borders: { top: none, bottom: none, left: none, right: none } });
  };
  return table([new TableRow({ cantSplit: true, children: roles.map(col) })], widths, noBorders);
}
function seal() {
  const blank = cell(p(''), 3080, { borders: { top: none, bottom: none, left: none, right: none } });
  const dbl = { style: BorderStyle.DOUBLE, size: 6, color: GOLD };
  const sealCell = cell([
    p([r('L.  S.', { font: TITLE_FONT, color: OXBLOOD, size: 28 })], { align: AlignmentType.CENTER, before: 60, after: 20 }),
    p([r('Place of the Seal or Signet', { i: true, size: 18, color: SEPIA })], { align: AlignmentType.CENTER, after: 0 }),
    p([r('when required', { i: true, size: 16, color: GOLD })], { align: AlignmentType.CENTER, after: 60 })
  ], 3920, { borders: { top: dbl, bottom: dbl, left: dbl, right: dbl } });
  return table([new TableRow({ cantSplit: true, children: [blank, sealCell, blank] })], [3080, 3920, 3080], noBorders);
}
function footer(tag) {
  return new Footer({ children: [new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { before: 0, after: 0 }, border: { top: { style: BorderStyle.SINGLE, size: 4, color: GOLD, space: 4 } },
    children: [r('Ministry of Civil and Administrative Affairs  ✦  ' + tag + '  ✦  Folio ', { caps: true, size: 14, color: GOLD, sp: 10 }), new TextRun({ children: [PageNumber.CURRENT], size: 14, color: GOLD, font: BODY_FONT })]
  })] });
}

function build(spec, v = {}) {
  const vals = v.fields || {};
  const kids = [...masthead(spec.title, spec.subtitle)];
  if (spec.banner) { kids.push(banner(spec.banner)); kids.push(p('', { after: 120 })); }
  kids.push(recordHeader(spec.num, v.recordNo, v.recordDate));
  kids.push(preamble(spec.preamble));
  let n = 0;
  for (const s of spec.sections) {
    kids.push(heading(ROMAN[n++], s.h));
    if (s.note) kids.push(p([r(s.note, { i: true, color: SEPIA })], { after: 80 }));
    if (s.kv) kids.push(kv(s.kv, vals));
    if (s.lines) kids.push(lines(s.lines, vals[s.id]));
    if (s.grid) kids.push(grid(s.grid, s.rows || 5, s.widths, vals[s.id]));
    if (s.after) kids.push(p([r(s.after, { i: true, color: OXBLOOD })], { before: 100, after: 60 }));
  }
  kids.push(heading(ROMAN[n++], 'Certification'));
  kids.push(p([r('Given under hand and entered upon the rolls of the Ministry on ', { i: true, color: SEPIA }), v.recordDate ? r(v.recordDate, { color: FILL }) : r('the ____ day of ______________, 4E ______')], { align: AlignmentType.CENTER, before: 160, after: 60, keepNext: true }));
  if (v.filedBy) kids.push(p([r('Entered by ', { i: true, size: 18, color: SEPIA }), r(v.filedBy, { size: 18, color: FILL })], { align: AlignmentType.CENTER, after: 60, keepNext: true }));
  kids.push(sigBlock(spec.sig, v.sigNames, v.recordDate));
  kids.push(p('', { after: 120, keepNext: true }));
  kids.push(seal());
  kids.push(p([r('❧   ✦   ☙', { color: GOLD })], { align: AlignmentType.CENTER, before: 160, after: 0 }));

  const doc = new Document({
    background: { color: PAGE },
    creator: 'Ministry of Civil and Administrative Affairs',
    title: v.recordNo ? spec.title + ' — ' + v.recordNo : spec.title,
    styles: { default: { document: { run: { font: BODY_FONT, size: 22, color: INK } } } },
    sections: [{
      properties: { page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1000, bottom: 1000, left: 1080, right: 1080, footer: 500 },
        borders: {
          pageBorderTop: { style: BorderStyle.DOUBLE, size: 12, color: GOLD, space: 18 },
          pageBorderBottom: { style: BorderStyle.DOUBLE, size: 12, color: GOLD, space: 18 },
          pageBorderLeft: { style: BorderStyle.DOUBLE, size: 12, color: GOLD, space: 18 },
          pageBorderRight: { style: BorderStyle.DOUBLE, size: 12, color: GOLD, space: 18 }
        }
      } },
      footers: { default: footer(spec.tag) },
      children: kids
    }]
  });
  return Packer.toBuffer(doc);
}

module.exports = { build };
