# AGENTS.md — arch-poster

You author data, never drawing code. The tool validates it and writes three files.

## Steps
1. Understand the architecture: 4-7 planes (layers), 15-25 components, 10-20 meaningful flows, and a 3-5 word pipeline strapline.
2. Write `scene.js` with the nine constants `W, H, PLANES, BANDS, BOXES, EDGES, TEXTS, SWATCHES, CHIPS`. Copy the layout of `examples/shoply-scene.js` (large) or `examples/rag-scene.js` (small). Dashed box = an abstraction the team owns; solid = swappable infra or an app surface. Every edge segment is horizontal or vertical.
3. Validate and build:
   ```bash
   node arch_poster.js scene.js --title "<System> — architecture" --slug <name> --out docs
   ```
   Errors stop the build. Fix every `ERROR` line and re-run; fix `WARN` lines when they point at real layout problems. Use `--check` to validate without writing.
4. Look at the SVG (open it in a browser) and fix overlaps the validator cannot see, such as an edge running through a band header.
5. Embed in README.md:
   ```html
   <picture>
     <source media="(prefers-color-scheme: light)" srcset="docs/<name>-light.svg">
     <img alt="<System> architecture" src="docs/<name>.svg">
   </picture>
   ```
   `docs/index.html` is the interactive version: link it or publish it.

## Text sizing
Monospace advances 0.6 x font size per character: a `bs` body line is about 6.6 px per character, a `bl` title about 8.1 px. Box width must be at least 24 + longest line + 12.
