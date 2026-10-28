#!/usr/bin/env node
// arch-poster: one scene.js -> validated interactive canvas (index.html)
// plus static dark/light SVG posters that GitHub READMEs can display.
//
//   node arch_poster.js <scene.js> --title "Acme — platform architecture" [--out out]
//        [--kicker K] [--sub HTML] [--slug S] [--check]
//
// Canvas template and validation rules: draw-architecture (MIT, Yulong He).
// SVG conventions (style classes, font fallback, escaping): svg-diagram (MIT, bybit-exchange).
'use strict';
const fs = require('fs');
const path = require('path');

const C = {
  bg: '#0E1217', boxFill: '#161B23', boxStroke: '#2A3240',
  bandFill: 'rgba(255,255,255,0.02)', line: '#8B93A1', sky: '#7DD3FC',
  rose: '#FB7185', orange: '#F6821F', slate: '#94A3B8', ink: '#E7EAEE',
  mut: '#9AA4B2', dim: '#6E7A88', plane: '#5B6673', arrowLbl: '#98A2B0'
};

// Light theme = the template's paint-time remap, applied once at export.
const LIGHT = {
  '#0e1217': '#F4F5F7', '#161b23': '#FFFFFF', '#2a3240': '#D3D8E0',
  'rgba(255,255,255,0.02)': 'rgba(15,23,42,0.028)', '#8b93a1': '#737C8B',
  '#7dd3fc': '#0284C7', '#fb7185': '#E11D48', '#f6821f': '#C2560A',
  '#94a3b8': '#64748B', '#e7eaee': '#0F172A', '#9aa4b2': '#475569',
  '#6e7a88': '#6B7280', '#5b6673': '#7B8593', '#98a2b0': '#5C6674',
  '#a78bfa': '#7C3AED', '#22d3ee': '#0891B2', '#4ade80': '#16A34A', '#fbbf24': '#B45309',
  '#3a4250': '#C8CDD6', '#4a5462': '#7B8593'
};
function darken(c) {
  const m = /^#([0-9a-f]{6})$/i.exec(c);
  if (!m) return c;
  const n = parseInt(m[1], 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  if (lum <= 0.5) return c;
  const h = (v) => Math.round(Math.min(255, v * 0.42 / lum)).toString(16).padStart(2, '0');
  return '#' + h(r) + h(g) + h(b);
}

const S = {
  title:  { size: 28,   weight: 700, fill: C.ink },
  sub:    { size: 14,   weight: 400, fill: C.mut },
  tag:    { size: 13,   weight: 400, fill: C.dim },
  hdr:    { size: 11,   weight: 700, ls: 2.5 },
  tagr:   { size: 10,   weight: 400, ls: 2 },
  plane:  { size: 9.5,  weight: 700, ls: 2, fill: C.plane },
  bl:     { size: 13.5, weight: 600, fill: C.ink },
  bs:     { size: 11,   weight: 400, fill: C.mut },
  bn:     { size: 10.5, weight: 400, fill: C.dim, italic: true },
  al:     { size: 10.5, weight: 400, fill: C.arrowLbl },
  legend: { size: 11,   weight: 400, fill: C.mut }
};

function loadScene(src) {
  return new Function('C', `
    function planeColor(id) { return (PLANES[id] || { c: C.slate }).c; }
    ${src}
    return { W, H, PLANES, BANDS, BOXES, EDGES, TEXTS, SWATCHES, CHIPS };
  `)(C);
}

// ---- validation: same checks and messages as draw-architecture/scripts/validate.js
function validate(scene) {
  const { W, H, PLANES, BANDS, BOXES, EDGES, TEXTS } = scene;
  const errors = [], warnings = [], err = (m) => errors.push(m), warn = (m) => warnings.push(m);
  const tw = (s, t) => { const st = S[s] || { size: 11 }; return t.length * (st.size * 0.6 + (st.ls || 0)); };
  const overlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

  const bandIds = new Set(), boxIds = new Set();
  for (const b of BANDS) { if (bandIds.has(b.id)) err(`duplicate band id "${b.id}"`); bandIds.add(b.id); }
  for (const b of BOXES) {
    if (boxIds.has(b.id)) err(`duplicate box id "${b.id}"`);
    if (bandIds.has(b.id)) err(`box id "${b.id}" collides with a band id`);
    boxIds.add(b.id);
  }
  for (const b of BANDS) if (b.plane != null && !PLANES[b.plane]) err(`band "${b.id}" references unknown plane "${b.plane}"`);
  for (const b of BOXES) {
    if (!PLANES[b.plane]) err(`box "${b.id}" references unknown plane "${b.plane}"`);
    if (!bandIds.has(b.band)) err(`box "${b.id}" references unknown band "${b.band}"`);
    if (!b.name) warn(`box "${b.id}" has no name (readout title will be empty)`);
    if (!b.about) warn(`box "${b.id}" has no about (readout description will be empty)`);
  }
  if (BANDS.length > 6)
    warn(`${BANDS.length} bands — the canonical style uses ~5. Many thin bands make every box ` +
         `small and the poster stringy; consider merging related stages into one neutral ` +
         `multi-column band (like the canonical "platform services" band)`);
  for (const b of BANDS)
    if (b.x < 0 || b.y < 0 || b.x + b.w > W || b.y + b.h > H) err(`band "${b.id}" extends outside the ${W}×${H} world`);
  for (let i = 0; i < BANDS.length; i++) for (let j = i + 1; j < BANDS.length; j++)
    if (overlap(BANDS[i], BANDS[j])) err(`bands "${BANDS[i].id}" and "${BANDS[j].id}" overlap`);

  const byBand = new Map();
  for (const b of BOXES) {
    const band = BANDS.find(x => x.id === b.band);
    if (band) {
      if (b.x < band.x || b.y < band.y || b.x + b.w > band.x + band.w || b.y + b.h > band.y + band.h)
        err(`box "${b.id}" sticks out of its band "${band.id}" ` +
            `(box ${b.x},${b.y} ${b.w}×${b.h}; band ${band.x},${band.y} ${band.w}×${band.h})`);
      if (band.hdr && b.y < band.y + 44) warn(`box "${b.id}" starts less than 44px below its band top — may collide with the band header`);
    }
    if (!byBand.has(b.band)) byBand.set(b.band, []);
    byBand.get(b.band).push(b);
  }
  for (const [, l] of byBand) for (let i = 0; i < l.length; i++) for (let j = i + 1; j < l.length; j++)
    if (overlap(l[i], l[j])) err(`boxes "${l[i].id}" and "${l[j].id}" overlap`);
  for (const b of BOXES)
    if (b.w < 180) warn(`box "${b.id}" is only ${b.w} wide — canonical boxes are 200+ (usually 280–400); ` +
                        `widen it and let its text breathe`);
  for (const band of BANDS) {
    const l = byBand.get(band.id) || [];
    if (!l.length) { warn(`band "${band.id}" holds no boxes`); continue; }
    const fill = l.reduce((a, x) => a + x.w * x.h, 0) / (band.w * band.h);
    if (fill < 0.28)
      warn(`band "${band.id}" is only ${Math.round(fill * 100)}% filled by its boxes ` +
           `(canonical bands run 37–55%) — widen the boxes toward sum-of-widths ≈ band width − 80, ` +
           `or narrow the band`);
  }
  for (const b of BOXES) {
    for (const [s, x, y, t] of b.texts || []) {
      if (!S[s]) warn(`box "${b.id}" text uses unknown style "${s}"`);
      if (x < b.x || y < b.y || y > b.y + b.h) err(`box "${b.id}" text "${t}" positioned outside the box`);
      const over = x + tw(s, t) - (b.x + b.w);
      if (over > 8) err(`box "${b.id}" text "${t}" overflows the box by ~${Math.round(over)}px — ` +
                        `widen the box, shorten the text, or split the line`);
      else if (over > -4) warn(`box "${b.id}" text "${t}" is tight against the right border (~${Math.round(over)}px) — ` +
                               `consider a wider box or shorter line`);
    }
    if (!b.texts || !b.texts.length) warn(`box "${b.id}" has no text lines`);
  }
  for (const e of EDGES) {
    const known = id => boxIds.has(id) || bandIds.has(id);
    if (!known(e.from)) err(`edge ${e.from} → ${e.to}: unknown "from" id`);
    if (!known(e.to)) err(`edge ${e.from} → ${e.to}: unknown "to" id`);
    if (!e.pts || e.pts.length < 2) { err(`edge ${e.from} → ${e.to}: needs at least 2 points`); continue; }
    for (let i = 1; i < e.pts.length; i++) {
      const [x0, y0] = e.pts[i - 1], [x1, y1] = e.pts[i];
      if (x0 !== x1 && y0 !== y1) warn(`edge ${e.from} → ${e.to}: segment ${i} is diagonal (${x0},${y0} → ${x1},${y1}) — ` +
                                       `the style uses orthogonal routing`);
      if (x0 === x1 && y0 === y1) warn(`edge ${e.from} → ${e.to}: segment ${i} has zero length`);
    }
    for (const [x, y] of e.pts) if (x < 0 || y < 0 || x > W || y > H) err(`edge ${e.from} → ${e.to}: point ${x},${y} outside world`);
    const tBox = BOXES.find(b => b.id === e.to);
    const tBand = BANDS.find(b => b.id === e.to) || (tBox && BANDS.find(b => b.id === tBox.band));
    const [tx, ty] = e.pts[e.pts.length - 1];
    const dist = r => r ? Math.max(r.x - tx, tx - (r.x + r.w), r.y - ty, ty - (r.y + r.h)) : Infinity;
    const d = Math.min(dist(tBox), dist(tBand));
    if (d !== Infinity) {
      if (d > 20) warn(`edge ${e.from} → ${e.to}: arrowhead lands ${Math.round(d)}px away from the target edge`);
      if (d < -24 && dist(tBox) < -24) warn(`edge ${e.from} → ${e.to}: arrowhead lands deep inside the target — stop at its border`);
    }
  }
  for (const t of TEXTS || []) {
    const str = t.t || (t.runs || []).map(r => r.t).join('');
    if (t.x < 0 || t.y < 0 || t.x > W || t.y > H) err(`free text "${str}" outside world`);
    if (!t.rot && !t.anchor && t.x + tw(t.s, str) > W) warn(`free text "${str}" may run past the right edge of the world`);
  }
  const lines = [...warnings.map(w => 'WARN  ' + w), ...errors.map(e => 'ERROR ' + e)];
  lines.push(`\n${BANDS.length} bands · ${BOXES.length} boxes · ${EDGES.length} edges · ` +
             `${errors.length} errors · ${warnings.length} warnings`);
  return { errors, warnings, report: lines.join('\n') };
}

// ---- canvas HTML: byte-identical to draw-architecture/scripts/build.js
function buildHtml(sceneSrc, { title, kicker, sub, slug }) {
  const template = fs.readFileSync(path.join(__dirname, 'assets', 'template.html'), 'utf8');
  return template
    .replace('{{TITLE}}', title)
    .replace('{{KICKER}}', kicker)
    .replace('{{SUB_HTML}}', sub)
    .replace('{{SLUG}}', slug)
    .replace('{{SCENE}}', sceneSrc.replace(/\$/g, '$$$$'));
}

// ---- SVG poster: the canvas paint order (bands, texts, legend, edges, boxes, labels) as vector
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const n = (v) => +(+v).toFixed(2);

function paint(c) { // rgba(...) -> fill + opacity attrs, since some SVG viewers ignore rgba
  const m = /^rgba\(([^)]+),\s*([\d.]+)\)$/.exec(c);
  return m ? [`rgb(${m[1]})`, +m[2]] : [c, 1];
}
function rect(x, y, w, h, r, { fill, stroke, sw, op = 1, sop = 1, dash } = {}) {
  let a = `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" rx="${n(Math.min(r, w / 2, h / 2))}"`;
  if (fill) { const [f, o] = paint(fill); a += ` fill="${f}"`; if (o * op !== 1) a += ` fill-opacity="${n(o * op)}"`; }
  else a += ' fill="none"';
  if (stroke) {
    a += ` stroke="${stroke}" stroke-width="${sw}"`;
    if (sop !== 1) a += ` stroke-opacity="${n(sop)}"`;
    if (dash) a += ' stroke-dasharray="6 5"';
  }
  return a + '/>';
}

function toSvg(scene, theme = 'dark') {
  const { W, H, PLANES, BANDS, BOXES, EDGES, TEXTS, SWATCHES, CHIPS } = scene;
  const memo = {};
  const col = (c) => {
    if (theme === 'dark' || !c) return c;
    const k = String(c).toLowerCase();
    if (k in LIGHT) return LIGHT[k];
    for (const v of Object.values(LIGHT)) if (v.toLowerCase() === k) return v;
    return memo[k] || (memo[k] = darken(c));
  };
  const hueOf = (id) => (PLANES[id] || { c: C.slate }).c;
  const out = [];

  function text(item) {
    const st = Object.assign({}, S[item.s], item.fill ? { fill: item.fill } : null);
    const anchor = item.anchor === 'center' ? ' text-anchor="middle"' : item.anchor === 'right' ? ' text-anchor="end"' : '';
    const rot = item.rot ? ` transform="rotate(${item.rot} ${n(item.x)} ${n(item.y)})"` : '';
    const op = item.alpha != null ? ` opacity="${item.alpha}"` : '';
    const body = item.runs
      ? item.runs.map(r => `<tspan fill="${col(r.fill)}">${esc(r.t)}</tspan>`).join('')
      : esc(item.t);
    out.push(`<text class="${item.s}" x="${n(item.x)}" y="${n(item.y)}" fill="${col(st.fill || C.mut)}"${anchor}${rot}${op}>${body}</text>`);
  }

  out.push(`<rect width="${W}" height="${H}" fill="${col(C.bg)}"/>`);
  for (const b of BANDS) {
    const hue = b.stroke || hueOf(b.plane);
    out.push(rect(b.x, b.y, b.w, b.h, 14, { fill: col(C.bandFill), stroke: col(hue), sw: 1.5, sop: b.alpha != null ? b.alpha : 1, dash: b.dash }));
    if (b.hdr) text({ s: 'hdr', x: b.hdr.x, y: b.hdr.y, t: b.hdr.t, fill: b.hdr.fill || hue });
    if (b.tagr) text({ s: 'tagr', x: b.tagr.x, y: b.tagr.y, t: b.tagr.t, fill: b.tagr.fill || hue, anchor: 'right', alpha: b.tagr.alpha });
  }
  for (const t of TEXTS) text(t);
  for (const s of SWATCHES)
    out.push(rect(s.x, s.y, s.w, s.h, 3, { fill: s.fill && col(s.fill), stroke: col(s.stroke), sw: 1.25, sop: s.alpha, dash: s.dash }));
  for (const ch of CHIPS) out.push(rect(ch.x, ch.y, ch.w, ch.h, 2.5, { fill: col(ch.fill), op: 0.85 }));

  const line = col(C.line);
  for (const e of EDGES) {
    const p = e.pts;
    let d = `M${n(p[0][0])} ${n(p[0][1])}`;
    for (let i = 1; i < p.length - 1; i++) { // same softened elbows as the canvas polyline()
      const [px, py] = p[i - 1], [cx, cy] = p[i], [nx, ny] = p[i + 1];
      const d1 = Math.hypot(cx - px, cy - py), d2 = Math.hypot(nx - cx, ny - cy);
      const r = Math.min(9, d1 / 2, d2 / 2);
      d += ` L${n(cx + (px - cx) / d1 * r)} ${n(cy + (py - cy) / d1 * r)}` +
           ` Q${n(cx)} ${n(cy)} ${n(cx + (nx - cx) / d2 * r)} ${n(cy + (ny - cy) / d2 * r)}`;
    }
    const [fx, fy] = p[p.length - 2], [tx, ty] = p[p.length - 1];
    d += ` L${n(tx)} ${n(ty)}`;
    const a = Math.atan2(ty - fy, tx - fx), cos = Math.cos(a), sin = Math.sin(a);
    const pt = (x, y) => `${n(tx + x * cos - y * sin)},${n(ty + x * sin + y * cos)}`;
    out.push(`<path d="${d}" fill="none" stroke="${line}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>`);
    out.push(`<polygon points="${pt(0, 0)} ${pt(-9.5, -4.2)} ${pt(-9.5, 4.2)}" fill="${line}"/>`);
  }
  for (const b of BOXES) {
    const hue = col(hueOf(b.plane));
    out.push(rect(b.x, b.y, b.w, b.h, b.r, { fill: col(C.boxFill) }));
    out.push(rect(b.x, b.y, b.w, b.h, b.r, { fill: hue, op: 0.05 }));
    if (!b.dash) out.push(rect(b.x, b.y, b.w, b.h, b.r, { stroke: col(C.boxStroke), sw: 1.25 }));
    out.push(rect(b.x, b.y, b.w, b.h, b.r, { stroke: hue, sw: 1.25, sop: b.dash ? 0.6 : 0.42, dash: b.dash }));
    for (const [s, x, y, t] of b.texts) text({ s, x, y, t });
  }
  for (const e of EDGES) if (e.label) text(e.label);

  const css = Object.entries(S).map(([k, st]) =>
    `.${k}{font-size:${st.size}px;font-weight:${st.weight}${st.ls ? `;letter-spacing:${st.ls}px` : ''}${st.italic ? ';font-style:italic' : ''}}`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">\n` +
    // CJK fallbacks (svg-diagram font-stack rule): README images cannot load web fonts.
    `<style>text{font-family:'JetBrains Mono',ui-monospace,'SF Mono',Menlo,Consolas,'PingFang SC','Microsoft YaHei','Noto Sans CJK SC',monospace}${css}</style>\n` +
    out.join('\n') + '\n</svg>\n';
}

function main(argv) {
  const arg = (name, fb) => { const i = argv.indexOf('--' + name); return i === -1 || i === argv.length - 1 ? fb : argv[i + 1]; };
  const scenePath = argv[0];
  if (!scenePath || scenePath.startsWith('--')) {
    console.error('usage: node arch_poster.js <scene.js> --title "Title" [--out dir] [--kicker K] [--sub HTML] [--slug S] [--check]');
    return 2;
  }
  const src = fs.readFileSync(scenePath, 'utf8');
  let scene;
  try { scene = loadScene(src); } catch (e) {
    console.error('ERROR scene.js failed to evaluate: ' + e.message);
    console.error('The scene must define: W, H, PLANES, BANDS, BOXES, EDGES, TEXTS, SWATCHES, CHIPS');
    return 1;
  }
  const v = validate(scene);
  console.log(v.report);
  if (v.errors.length || argv.includes('--check')) return v.errors.length ? 1 : 0;

  const title = arg('title');
  if (!title) { console.error('missing required argument: --title'); return 1; }
  const opts = {
    title, kicker: arg('kicker', title.toUpperCase()), sub: arg('sub', ''),
    slug: arg('slug', title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))
  };
  const out = arg('out', 'out');
  fs.mkdirSync(out, { recursive: true });
  const files = {
    'index.html': buildHtml(src, opts),
    [opts.slug + '.svg']: toSvg(scene, 'dark'),
    [opts.slug + '-light.svg']: toSvg(scene, 'light')
  };
  for (const [f, body] of Object.entries(files)) {
    fs.writeFileSync(path.join(out, f), body);
    console.log('wrote ' + path.join(out, f) + ' (' + Buffer.byteLength(body) + ' bytes)');
  }
  return 0;
}

module.exports = { loadScene, validate, buildHtml, toSvg };
if (require.main === module) process.exitCode = main(process.argv.slice(2));
