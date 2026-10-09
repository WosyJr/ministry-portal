const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const TAG = /<\/?([a-zA-Z][a-zA-Z0-9-]*)([^>]*)>/g;

function children(inner) {
  const out = [];
  let depth = 0;
  let start = -1;
  let m;
  TAG.lastIndex = 0;
  while ((m = TAG.exec(inner)) !== null) {
    const closing = m[0][1] === '/';
    const name = m[1].toLowerCase();
    const selfClosed = VOID.has(name) || /\/\s*$/.test(m[2]);
    if (closing) {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        out.push(inner.slice(start, m.index + m[0].length));
        start = -1;
      }
      continue;
    }
    if (depth === 0) {
      if (start < 0) start = m.index;
      if (selfClosed) { out.push(inner.slice(start, m.index + m[0].length)); start = -1; continue; }
    }
    if (!selfClosed) depth += 1;
  }
  if (depth !== 0) return null;
  return out;
}

const classOf = html => ((html.match(/^<[a-zA-Z0-9-]+[^>]*\sclass="([^"]*)"/) || [])[1] || '').split(/\s+/);
const tagOf = html => (html.match(/^<([a-zA-Z0-9-]+)/) || [])[1] || '';

function isSideForm(c) {
  return tagOf(c) === 'form' && classOf(c).indexOf('stack') >= 0;
}

function arrange(inner) {
  const kids = children(inner);
  if (!kids) return null;
  const firstForm = kids.findIndex(isSideForm);
  if (firstForm < 0) return null;
  const side = new Set();
  kids.forEach((c, i) => {
    const tag = tagOf(c);
    const cls = classOf(c);
    if (isSideForm(c)) side.add(i);
    else if (tag === 'form' && cls.indexOf('inline') >= 0 && i > firstForm) side.add(i);
    else if (tag === 'details' && i > firstForm) side.add(i);
    else if (tag === 'div' && cls.indexOf('linkrow') >= 0 && i === firstForm - 1 && /target="_blank"/.test(c)) side.add(i);
  });
  const body = kids.filter((c, i) => !side.has(i)).join('\n');
  const aside = kids.filter((c, i) => side.has(i)).join('\n');
  return `<div class="rq-body">${body}</div><aside class="rq-side">${aside}</aside>`;
}

function cards(html) {
  if (!html || html.indexOf('class="reqcard') < 0) return html;
  let out = '';
  let at = 0;
  const open = /<article class="reqcard[^"]*"[^>]*>/g;
  let m;
  while ((m = open.exec(html)) !== null) {
    if (m.index < at) continue;
    const bodyStart = m.index + m[0].length;
    let depth = 1;
    let i = bodyStart;
    const re = /<\/?article\b[^>]*>/g;
    re.lastIndex = bodyStart;
    let n;
    let end = -1;
    while ((n = re.exec(html)) !== null) {
      depth += n[0][1] === '/' ? -1 : 1;
      if (depth === 0) { end = n.index; i = n.index + n[0].length; break; }
    }
    if (end < 0) break;
    const inner = html.slice(bodyStart, end);
    const fixed = arrange(inner);
    out += html.slice(at, m.index);
    if (fixed) out += m[0].replace('class="reqcard', 'class="reqcard rq-split') + fixed + '</article>';
    else out += html.slice(m.index, i);
    at = i;
    open.lastIndex = i;
  }
  return out + html.slice(at);
}

module.exports = { cards, children };
