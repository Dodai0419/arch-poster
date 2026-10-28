'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { loadScene, validate, buildHtml, toSvg } = require('../arch_poster.js');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
// sha256 of `node scripts/build.js --scene examples/shoply-scene.js --title "Shoply — platform architecture"`
// from yulonghe97/draw-architecture@0351ece.
const UPSTREAM_HTML_SHA = '91699fccc83d320006c1a4b056e969321131bdf44dd778b5a98c32ed66288c98';

test('validator output matches upstream validate.js, clean and broken scene', () => {
  for (const [scene, expected] of [['examples/shoply-scene.js', 'shoply-upstream.txt'],
                                   ['tests/fixtures/broken-scene.js', 'broken-upstream.txt']]) {
    const v = validate(loadScene(read(scene)));
    assert.strictEqual(v.report + '\n', read('tests/fixtures/' + expected), scene);
  }
});

test('canvas HTML is byte-identical to upstream build.js', () => {
  const title = 'Shoply — platform architecture';
  const html = buildHtml(read('examples/shoply-scene.js'), {
    title, kicker: title.toUpperCase(), sub: '', slug: 'shoply-platform-architecture' });
  assert.strictEqual(crypto.createHash('sha256').update(html).digest('hex'), UPSTREAM_HTML_SHA);
});

test('SVG poster draws every band, box, edge and label', () => {
  const scene = loadScene(read('examples/shoply-scene.js'));
  const svg = toSvg(scene);
  assert.match(svg, /^<svg [^>]*viewBox="0 0 1480 1968"/);
  assert.match(svg, /<\/svg>\n$/);
  const texts = scene.BANDS.reduce((a, b) => a + !!b.hdr + !!b.tagr, 0) + scene.TEXTS.length +
    scene.BOXES.reduce((a, b) => a + b.texts.length, 0) + scene.EDGES.filter(e => e.label).length;
  assert.strictEqual((svg.match(/<text /g) || []).length, texts);
  assert.strictEqual((svg.match(/<polygon /g) || []).length, scene.EDGES.length);
  assert.strictEqual((svg.match(/<path /g) || []).length, scene.EDGES.length);
  for (const b of scene.BOXES) assert.ok(svg.includes('>' + b.texts[0][3] + '<'), b.id);
  assert.ok(!/[&](?!amp;|lt;|gt;|quot;)/.test(svg), 'unescaped ampersand');
});

test('light SVG uses the template light palette', () => {
  const scene = loadScene(read('examples/shoply-scene.js'));
  const light = toSvg(scene, 'light');
  assert.ok(light.includes('fill="#F4F5F7"') && !light.includes('#0E1217'));
  assert.ok(light.includes('#7C3AED')); // violet plane remapped
});
