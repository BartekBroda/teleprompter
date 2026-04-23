# Next round — known issues & planned work

## Bugs / UX gaps to address

### Scroll engine
- Speed slider shows decimal like `2` but could show `1.5` — verify display looks OK on all values (0.5 step)
- `scrollAccum` not reset when user manually drags scroll position mid-play — low priority, minor visual glitch at most

### Markdown
- `*italic*` regex will false-positive on standalone `*` (e.g. bullet `* item`) — currently `* item` renders as broken italic; either support `- item` bullets or tighten regex to require non-space after opening `*`
- No support for `- item` / `* item` bullet lists — useful for cue lists
- No support for line breaks within a paragraph (`  ` trailing spaces or `\` at end of line)
- `## heading` matched by `/^(#{1,2})\s/` — headings with 3+ `#` fall through to plain `<p>`, fine for now but worth documenting

### Margins
- Right margin adds to existing ~60px progress-bar padding — at 200px setting the content area gets very narrow; consider capping effective right margin or decoupling from progress bar side
- No per-side control (left vs right independent) — may be needed for mirror mode where reading direction reverses

## Planned features

### Deployment / access
- Decision pending: Cloudflare Pages + Access vs Capacitor + TestFlight
- If Cloudflare: add `_headers` file for CSP and cache-control
- If Capacitor: evaluate whether `contenteditable` works reliably in WKWebView (iOS)

### Settings panel UX
- Panel grows with each new control — consider grouping into sections (Appearance / Playback / Layout) or using a scrollable panel (already has `overflow-y: auto`, just needs content)
- Slider labels could show units inline (e.g. "Speed 2 · 60px/s") for clarity

### Markdown (future)
- Bullet list support: `- item` → `<li>` inside `<ul>`
- Syntax hint: small "MD supported" note below editor when empty placeholder shown
- Consider toggling markdown off via settings for users who want literal `*` and `#` in scripts

## Architecture notes

- All state lives in `const state = {}` + localStorage — no framework, intentional
- `parseMarkdown` / `inlineMarkdown` are pure functions, easy to unit-test if needed
- `scrollStep` uses `requestAnimationFrame` timestamp — any future speed changes should preserve this (not revert to per-frame pixel increments)
- `--user-margin` CSS custom property set on `:root` via `document.documentElement.style` — safe to extend with `--user-margin-left` / `--user-margin-right` independently
