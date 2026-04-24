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
When `#script` is empty, extend placeholder to show supported markdown syntax. Change placeholder text to multi-line hint, or add a collapsible "?" button near the editor.

### Markdown

**Nested block support**
Currently flat line-by-line parse. Could add:
- `> cue text` — director's cue line, rendered in muted color (not read aloud, visual reminder only)
- `[pause]` — explicit pause marker rendered as a centered hourglass or dot row

**Editor preview toggle**
Button in overlay (or settings) to toggle between raw markdown and rendered preview while in edit mode. Useful for checking formatting before a take. Implementation: call `parseMarkdown` + set `innerHTML` + add `.md-rendered` without starting scroll; reverse on toggle off.

### Settings panel

**Section grouping**
Panel is growing. Group controls:
- *Appearance*: font size, font, theme, alignment
- *Playback*: speed, countdown, loop
- *Layout*: horizontal margin

Use `<fieldset>` + `<legend>` or simple heading rows. No JS needed.

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
