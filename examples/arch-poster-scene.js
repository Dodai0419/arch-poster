  // arch-poster drawing itself: one scene file in, three files out.
  const W = 1480, H = 900;

  const PLANES = {
    you:    { c: '#94A3B8', label: 'You and your agent' },
    tool:   { c: '#A78BFA', label: 'arch_poster.js' },
    output: { c: '#4ADE80', label: 'Outputs' }
  };

  const BANDS = [
    { id: 'band-you', plane: 'you', x: 160, y: 200, w: 1260, h: 150, alpha: 0.55,
      hdr: { x: 184, y: 230, t: 'INPUT — ONE SCENE FILE' } },
    { id: 'band-tool', plane: 'tool', x: 160, y: 420, w: 1260, h: 170, alpha: 0.6, dash: true,
      hdr:  { x: 184, y: 450, t: 'ARCH_POSTER.JS — ONE NODE PROCESS, NO DEPENDENCIES' },
      tagr: { x: 1396, y: 450, t: 'OURS', alpha: 0.6 } },
    { id: 'band-out', plane: 'output', x: 160, y: 660, w: 1260, h: 150, alpha: 0.45,
      hdr: { x: 184, y: 690, t: 'OUTPUT — WRITTEN TO --out' } }
  ];

  const BOXES = [
    { id: 'agent', plane: 'you', band: 'band-you', x: 200, y: 252, w: 560, h: 80, r: 10,
      name: 'Agent or you', about: 'Claude Code or Codex reads the codebase and writes the scene as plain data.',
      texts: [ ['bl', 224, 280, 'Claude Code / Codex / you'], ['bs', 224, 302, 'reads the codebase, writes planes · bands · boxes'], ['bs', 224, 318, 'no viewer code, only data'] ] },
    { id: 'scene', plane: 'you', band: 'band-you', x: 800, y: 252, w: 580, h: 80, r: 10,
      name: 'scene.js', about: 'Nine constants: W, H, PLANES, BANDS, BOXES, EDGES, TEXTS, SWATCHES, CHIPS.',
      texts: [ ['bl', 824, 280, 'scene.js'], ['bs', 824, 302, 'W · H · PLANES · BANDS · BOXES · EDGES'], ['bs', 824, 318, 'TEXTS · SWATCHES · CHIPS'] ] },

    { id: 'validate', plane: 'tool', band: 'band-tool', x: 200, y: 480, w: 360, h: 88, r: 10, dash: true,
      name: 'Validate', about: 'The draw-architecture layout checks; any error stops the build.',
      texts: [ ['bl', 224, 508, 'validate'], ['bs', 224, 530, 'ids · overlaps · text overflow'], ['bs', 224, 546, 'orthogonal edges · world bounds'] ] },
    { id: 'html', plane: 'tool', band: 'band-tool', x: 600, y: 480, w: 360, h: 88, r: 10, dash: true,
      name: 'Build canvas', about: 'Splices the scene into the draw-architecture template, byte for byte.',
      texts: [ ['bl', 624, 508, 'build canvas'], ['bs', 624, 530, 'template + scene → index.html'], ['bs', 624, 546, 'same bytes as upstream build.js'] ] },
    { id: 'svg', plane: 'tool', band: 'band-tool', x: 1000, y: 480, w: 380, h: 88, r: 10, dash: true,
      name: 'Export SVG', about: 'Paints the same scene as vector, once per theme, in canvas paint order.',
      texts: [ ['bl', 1024, 508, 'export SVG'], ['bs', 1024, 530, 'canvas paint order, as vectors'], ['bs', 1024, 546, 'dark + light palette'] ] },

    { id: 'index', plane: 'output', band: 'band-out', x: 200, y: 712, w: 560, h: 80, r: 10,
      name: 'index.html', about: 'Pan, zoom, click to isolate, readout panel, PNG export.',
      texts: [ ['bl', 224, 740, 'index.html'], ['bs', 224, 762, 'interactive canvas: pan · zoom · focus'], ['bs', 224, 778, 'share it or publish it'] ] },
    { id: 'posters', plane: 'output', band: 'band-out', x: 800, y: 712, w: 580, h: 80, r: 10,
      name: 'Posters', about: 'Static SVGs that GitHub renders inline in a README.',
      texts: [ ['bl', 824, 740, '<slug>.svg + <slug>-light.svg'], ['bs', 824, 762, 'drop into README.md with <picture>'], ['bs', 824, 778, 'GitHub renders them inline'] ] }
  ];

  const EDGES = [
    { from: 'agent', to: 'scene', pts: [[762, 292], [794, 292]] },
    { from: 'scene', to: 'band-tool', pts: [[1090, 334], [1090, 414]],
      label: { s: 'al', x: 1104, y: 384, t: 'evaluate once' } },
    { from: 'validate', to: 'html', pts: [[562, 524], [594, 524]] },
    { from: 'html', to: 'svg', pts: [[962, 524], [994, 524]] },
    { from: 'html', to: 'index', pts: [[780, 570], [780, 640], [480, 640], [480, 706]] },
    { from: 'svg', to: 'posters', pts: [[1190, 570], [1190, 706]] }
  ];

  const TEXTS = [
    { s: 'title', x: 160, y: 86, t: 'arch-poster — how it works' },
    { s: 'sub',   x: 160, y: 118, t: 'scene → validate → canvas + posters, in one command' },
    { s: 'tag',   x: 160, y: 146, runs: [
        { t: 'scene.js', fill: C.slate }, { t: ' → ', fill: '#4A5462' },
        { t: 'arch_poster.js', fill: '#A78BFA' }, { t: ' → ', fill: '#4A5462' },
        { t: 'html + svg', fill: '#4ADE80' } ] },
    { s: 'legend', x: 1082, y: 86,  t: 'dashed — code we own' },
    { s: 'legend', x: 1082, y: 110, t: 'solid — inputs and files' },
    { s: 'legend', x: 1100, y: 134, t: 'colour — the stage' },
    { s: 'bn', x: 160, y: H - 54, t: 'any validation error stops before anything is written' }
  ];

  const SWATCHES = [
    { x: 1046, y: 75, w: 26, h: 13, stroke: '#8B93A1', alpha: 0.8, dash: true },
    { x: 1046, y: 99, w: 26, h: 13, stroke: C.boxStroke, alpha: 1, fill: C.boxFill }
  ];
  const CHIPS = ['you', 'tool', 'output'].map((id, i) => ({ x: 1046 + i * 13, y: 123, w: 9, h: 13, fill: planeColor(id) }));
