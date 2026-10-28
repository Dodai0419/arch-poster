  // A small retrieval-augmented chat app.
  const W = 1480, H = 960;

  const PLANES = {
    users:  { c: '#94A3B8', label: 'Users' },
    app:    { c: '#7DD3FC', label: 'App' },
    rag:    { c: '#A78BFA', label: 'Retrieval' },
    model:  { c: '#FB7185', label: 'Model provider' },
    infra:  { c: '#F6821F', label: 'Infrastructure' }
  };

  const BANDS = [
    { id: 'band-app', plane: 'app', x: 160, y: 200, w: 1260, h: 150, alpha: 0.45, dash: true,
      hdr: { x: 184, y: 230, t: 'APP — WEB CHAT · SLACK BOT' },
      tagr: { x: 1396, y: 230, t: 'OURS — WHAT USERS TOUCH', alpha: 0.6 } },
    { id: 'band-rag', plane: 'rag', x: 160, y: 420, w: 1260, h: 170, alpha: 0.6, dash: true,
      hdr: { x: 184, y: 450, t: 'RETRIEVAL PIPELINE' },
      tagr: { x: 1396, y: 450, t: 'OURS — THE ANSWER QUALITY', alpha: 0.6 } },
    { id: 'band-infra', plane: 'infra', x: 160, y: 660, w: 1260, h: 170, alpha: 0.4,
      hdr: { x: 184, y: 690, t: 'INFRASTRUCTURE' },
      tagr: { x: 1396, y: 690, t: 'SWAPPABLE', alpha: 0.6 } }
  ];

  const BOXES = [
    { id: 'web', plane: 'app', band: 'band-app', x: 200, y: 252, w: 560, h: 80, r: 10,
      name: 'Web chat', about: 'The chat page; streams tokens back as they arrive.',
      texts: [ ['bl', 224, 280, 'Web chat'], ['bs', 224, 302, 'streaming answers with source links'], ['bs', 224, 318, 'thumbs up / down feedback'] ] },
    { id: 'slack', plane: 'app', band: 'band-app', x: 800, y: 252, w: 580, h: 80, r: 10,
      name: 'Slack bot', about: 'Same backend, answers in threads.',
      texts: [ ['bl', 824, 280, 'Slack bot'], ['bs', 824, 302, 'answers in thread · cites docs'], ['bs', 824, 318, 'same API as the web chat'] ] },

    { id: 'router', plane: 'rag', band: 'band-rag', x: 200, y: 480, w: 360, h: 92, r: 10, dash: true,
      name: 'Query router', about: 'Decides whether a question needs retrieval at all.',
      texts: [ ['bl', 224, 508, 'Query router'], ['bs', 224, 530, 'rewrite · split · skip retrieval'], ['bn', 224, 554, 'half the questions need no search'] ] },
    { id: 'retriever', plane: 'rag', band: 'band-rag', x: 600, y: 480, w: 360, h: 92, r: 10, dash: true,
      name: 'Retriever', about: 'Hybrid keyword + vector search, then a reranker.',
      texts: [ ['bl', 624, 508, 'Retriever'], ['bs', 624, 530, 'BM25 + vectors → rerank top 8'], ['bn', 624, 554, 'reranker fixes most bad answers'] ] },
    { id: 'llm', plane: 'model', band: 'band-rag', x: 1000, y: 480, w: 380, h: 92, r: 10,
      name: 'LLM API', about: 'Any chat-completions provider; swappable.',
      texts: [ ['bl', 1024, 508, 'LLM API'], ['bs', 1024, 530, 'answer with citations'], ['bn', 1024, 554, 'provider is a config value'] ] },

    { id: 'vec', plane: 'infra', band: 'band-infra', x: 200, y: 720, w: 360, h: 80, r: 10,
      name: 'Vector DB', about: 'pgvector in Postgres.',
      texts: [ ['bl', 224, 748, 'Postgres + pgvector'], ['bs', 224, 770, 'chunks · embeddings · metadata'] ] },
    { id: 'ingest', plane: 'infra', band: 'band-infra', x: 600, y: 720, w: 360, h: 80, r: 10,
      name: 'Ingest job', about: 'Nightly crawl of docs and tickets.',
      texts: [ ['bl', 624, 748, 'Ingest job'], ['bs', 624, 770, 'nightly: docs · tickets · wiki'] ] },
    { id: 'logs', plane: 'infra', band: 'band-infra', x: 1000, y: 720, w: 380, h: 80, r: 10,
      name: 'Eval logs', about: 'Every question, answer, source and vote.',
      texts: [ ['bl', 1024, 748, 'Eval logs'], ['bs', 1024, 770, 'question · sources · vote'] ] }
  ];

  const EDGES = [
    { from: 'web', to: 'router', pts: [[380, 334], [380, 474]], label: { s: 'al', x: 394, y: 390, t: 'question' } },
    { from: 'slack', to: 'band-rag', pts: [[1090, 334], [1090, 414]] },
    { from: 'router', to: 'retriever', pts: [[562, 526], [594, 526]] },
    { from: 'retriever', to: 'llm', pts: [[962, 526], [994, 526]] },
    { from: 'retriever', to: 'vec', pts: [[700, 574], [700, 630], [380, 630], [380, 714]],
      label: { s: 'al', x: 394, y: 622, t: 'top-k' } },
    { from: 'ingest', to: 'vec', pts: [[598, 760], [566, 760]] },
    { from: 'llm', to: 'logs', pts: [[1190, 574], [1190, 714]], label: { s: 'al', x: 1204, y: 650, t: 'answer + sources' } }
  ];

  const TEXTS = [
    { s: 'title', x: 160, y: 86, t: 'Docs bot — RAG architecture' },
    { s: 'sub',   x: 160, y: 118, t: 'ask → route → retrieve → answer → learn' },
    { s: 'legend', x: 1082, y: 86,  t: 'dashed — an abstraction we own' },
    { s: 'legend', x: 1082, y: 110, t: 'solid — swappable infra' },
    { s: 'legend', x: 1110, y: 134, t: 'colour — the plane' },
    { s: 'bn', x: 160, y: H - 54, t: 'votes in the eval logs decide the next reranker change' }
  ];

  const SWATCHES = [
    { x: 1046, y: 75, w: 26, h: 13, stroke: '#8B93A1', alpha: 0.8, dash: true },
    { x: 1046, y: 99, w: 26, h: 13, stroke: C.boxStroke, alpha: 1, fill: C.boxFill }
  ];
  const CHIPS = ['app', 'rag', 'model', 'infra'].map((id, i) => ({ x: 1046 + i * 13, y: 123, w: 9, h: 13, fill: planeColor(id) }));
