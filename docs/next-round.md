# Next round — planned work

## Known issues (remaining)

### Scroll engine
- `scrollAccum` not reset when user manually drags scroll position mid-play — accumulator holds fractional remainder from before the drag; could cause 1px jump on resume. Low priority, not perceptible in practice.

### Markdown
- Bold/italic regexes use lazy `.*?` — pathological input with many `*` on one line could cause backtracking. Acceptable for teleprompter scripts; not a security issue (local storage only).
- No support for nested inline: `***bold italic***` renders as bold wrapping italic incorrectly (outer `**` matches first, inner `*` left as literal). Niche use case.

### Margins
- `--user-margin` applies to `#script` padding, so in mirror mode (`scaleX(-1)` on `content-wrapper`) left/right visually swap — left margin becomes right margin. Functional but unintuitive. Fix: apply margin via `margin-inline-start/end` or flip values when mirror is active.

---

## Planned features

### Playback

**Countdown before start**
3-2-1 overlay before scrolling begins. Gives presenter time to look up from the device. Implementation: show countdown div over content, `setTimeout` chain, then call `startScroll()`. Setting: on/off toggle, default on.

**Speed adjust during playback**
`+` / `-` tap zones (left/right edges of screen, or hardware volume buttons via `MediaSession` API) to nudge speed ±0.5 without opening settings. Required for live use where settings modal is disruptive.

**Reading time estimate**
Display estimated time to complete script at current speed, shown in settings panel. Formula: `contentWrapper.scrollHeight / (state.speed * 30)` seconds. Updates live as speed changes.

**Loop mode**
After reaching end, auto-scroll back to top and restart. Useful for rehearsal. Toggle in settings.

### Editor

**Text alignment — centered**
Centered text is standard in broadcast teleprompter format. Add alignment toggle (left / center) in settings. Implementation: `text-align` on `#script`, persisted as `tp_align`. Single setting, no per-paragraph control needed.

**Font selection**
Three options sufficient: sans-serif (default), serif (formal/broadcast), monospace (technical scripts). Stored as `tp_font`. CSS: swap `font-family` on `#script`.

**Syntax hint**
`data-placeholder` CSS trick only supports single-line text. When script is empty, show a separate `#syntax-hint` div with supported syntax — hide it the moment user starts typing.

HTML: sibling of `#script` inside `content-wrapper`:
```html
<div id="syntax-hint" aria-hidden="true">
  <p>Type or paste your script.</p>
  <table>
    <tr><td># Tytuł</td><td>nagłówek sekcji</td></tr>
    <tr><td>## Podsekcja</td><td>mniejszy nagłówek</td></tr>
    <tr><td>**tekst**</td><td>pogrubienie</td></tr>
    <tr><td>*tekst*</td><td>kursywa</td></tr>
    <tr><td>- punkt</td><td>lista punktowana</td></tr>
    <tr><td>---</td><td>pauza / separator</td></tr>
  </table>
</div>
```

JS: toggle `hidden` class on `scriptEl` `input` event and on `applyState`:
```js
function updateSyntaxHint() {
  syntaxHint.classList.toggle('hidden', state.script.length > 0);
}
```

CSS: `#syntax-hint` styled muted (opacity ~0.35), smaller font (~0.5em of script font), pointer-events none. Table cells: `td:first-child` monospace, `td:last-child` normal. Both hidden in play mode via `.md-rendered ~ #syntax-hint` or by adding `hidden` before `startScroll`.

Reason for separate div over CSS `::before`: `::before` on `contenteditable` breaks on some mobile browsers when text is typed, and cannot contain structured HTML.

### Markdown

**Bullet lists — extended (basic done)**
Currently `- item` / `* item` → `• paragraph` implemented. Remaining:

Ordered lists — `1. item`, `2. item`:
```js
const oli = t.match(/^\d+\.\s+(.*)/);
if (oli) { html.push(`<p class="md-oli">${counter}. ${inlineMarkdown(oli[1])}</p>`); continue; }
```
Counter needs to track across lines — requires minor parser state. CSS same hanging indent as `md-li`.

Nested lists (1 level deep): would require look-ahead across lines, breaking the current single-pass loop. Defer until parser is refactored to work on blocks instead of individual lines.

**Nested block support**
Currently flat line-by-line parse. Could add:
- `> cue text` — director's cue line, rendered in muted color (not read aloud, visual reminder only)
- `[pause]` — explicit pause marker rendered as a centered hourglass or dot row

**Editor preview toggle**
Button in overlay (or settings) to toggle between raw markdown and rendered preview while in edit mode. Useful for checking formatting before a take. Implementation: call `parseMarkdown` + set `innerHTML` + add `.md-rendered` without starting scroll; reverse on toggle off.

### Settings panel

**Section grouping**
Panel grows with each new control. Current controls (6) + planned additions (font, alignment, countdown, loop) = ~10 controls — needs structure.

Proposed HTML using `<fieldset>`:
```html
<fieldset>
  <legend>Wygląd</legend>
  <!-- font size, font, theme, alignment -->
</fieldset>
<fieldset>
  <legend>Odtwarzanie</legend>
  <!-- speed, countdown toggle, loop toggle -->
</fieldset>
<fieldset>
  <legend>Układ</legend>
  <!-- horizontal margin -->
</fieldset>
```

CSS additions:
```css
#settings-panel fieldset {
  border: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
#settings-panel legend {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  opacity: 0.5;
  margin-bottom: 4px;
}
```

No JS changes needed. Panel already has `overflow-y: auto` and `max-height: calc(100vh - 20px)` — scrolls naturally when content exceeds screen height.

Order: Wygląd → Odtwarzanie → Układ → reset button at bottom. Appearance first because it's most commonly adjusted.

**Reset to defaults button**
Single button: clear all `tp_*` localStorage keys, reload. Useful after experimenting with settings.

### Deployment (decision pending)

**Option A — Cloudflare Pages + Access**
Static deploy, email OTP access control. Free. PWA installs from the URL. Fastest path.
- Add `public/_headers` for CSP and cache-control headers
- Add `public/_redirects` if custom domain routing needed

**Option B — Capacitor (iOS/Android native)**
Wraps existing HTML/JS/CSS unchanged. No rewrite.
- iOS: Xcode + Apple Developer ($99/yr) → TestFlight for private distribution (up to 100 internal testers, no App Store review)
- Android: build APK, sideload or Play Store
- Risk: verify `contenteditable` works correctly in WKWebView (iOS WebKit); known quirks with `textContent` assignment on focused elements

---

## Architecture constraints to preserve

- `state` is the single source of truth; `localStorage` is write-through cache only
- `scrollStep` must stay time-based (`requestAnimationFrame` timestamp) — never revert to per-frame pixel increments
- `parseMarkdown` / `inlineMarkdown` are pure functions with no DOM access — keep testable
- `--user-margin` on `:root` via `documentElement.style` — extend to `--user-margin-left` / `--user-margin-right` when per-side control is needed
- No build step, no bundler, no framework — all changes must work as plain files served over HTTP
