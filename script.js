// Teleprompter

const DEFAULTS = {
  script: '',
  fontSize: 48,
  speed: 2,
  mirror: false,
  theme: 'dark',
  margin: 0,
};

const state = {
  playing: false,
  paused: false,
  atEnd: false,
  animFrameId: null,
  ...loadSettings(),
};

function loadSettings() {
  try {
    return {
      script:   localStorage.getItem('tp_script')    ?? DEFAULTS.script,
      fontSize: Number(localStorage.getItem('tp_font_size') ?? DEFAULTS.fontSize),
      speed:    Math.min(5, Math.max(0.5, Number(localStorage.getItem('tp_speed') ?? DEFAULTS.speed))),
      mirror:   localStorage.getItem('tp_mirror')    === 'true',
      theme:    localStorage.getItem('tp_theme')     ?? DEFAULTS.theme,
      margin:   Math.min(200, Math.max(0, Number(localStorage.getItem('tp_margin') ?? DEFAULTS.margin))),
    };
  } catch {
    return { ...DEFAULTS };
  }
}

function saveSetting(key, value) {
  try { localStorage.setItem(key, value); } catch {}
}

// ── DOM refs ──
const contentWrapper   = document.getElementById('content-wrapper');
const scriptEl         = document.getElementById('script');
const overlay          = document.getElementById('overlay');
const btnSettings      = document.getElementById('btn-settings');
const btnStartStop     = document.getElementById('btn-start-stop');
const progressDot      = document.getElementById('progress-dot');
const settingsModal    = document.getElementById('settings-modal');
const btnCloseSettings = document.getElementById('btn-close-settings');
const fontSizeInput    = document.getElementById('font-size');
const fontSizeVal      = document.getElementById('font-size-val');
const speedInput       = document.getElementById('speed');
const speedVal         = document.getElementById('speed-val');
const marginInput      = document.getElementById('margin');
const marginVal        = document.getElementById('margin-val');
const mirrorInput      = document.getElementById('mirror');
const themeToggle      = document.getElementById('theme-toggle');

function applyMargin(v) {
  document.documentElement.style.setProperty('--user-margin', v + 'px');
}

function applyState() {
  scriptEl.textContent = state.script;

  scriptEl.style.fontSize = state.fontSize + 'px';
  fontSizeInput.value = state.fontSize;
  fontSizeVal.textContent = state.fontSize;

  speedInput.value = state.speed;
  speedVal.textContent = state.speed;

  marginInput.value = state.margin;
  marginVal.textContent = state.margin;
  applyMargin(state.margin);

  mirrorInput.checked = state.mirror;
  contentWrapper.classList.toggle('mirrored', state.mirror);

  themeToggle.checked = state.theme === 'light';
  document.body.classList.remove('theme-dark', 'theme-light');
  document.body.classList.add('theme-' + state.theme);
}

applyState();

// ── Settings modal open/close ──

function openModal() {
  settingsModal.classList.remove('hidden');
  settingsModal.removeAttribute('inert');
  btnCloseSettings.focus();
}

function closeModal() {
  settingsModal.classList.add('hidden');
  settingsModal.setAttribute('inert', '');
  btnSettings.focus();
}

btnSettings.addEventListener('click', openModal);
btnCloseSettings.addEventListener('click', closeModal);
settingsModal.addEventListener('click', (e) => {
  if (e.target === settingsModal) closeModal();
});

// ── Font size ──

fontSizeInput.addEventListener('input', () => {
  const v = Number(fontSizeInput.value);
  state.fontSize = v;
  fontSizeVal.textContent = v;
  scriptEl.style.fontSize = v + 'px';
  saveSetting('tp_font_size', v);
});

// ── Speed ──

speedInput.addEventListener('input', () => {
  const v = Number(speedInput.value);
  state.speed = v;
  speedVal.textContent = v;
  saveSetting('tp_speed', v);
});

// ── Margin ──

marginInput.addEventListener('input', () => {
  const v = Number(marginInput.value);
  state.margin = v;
  marginVal.textContent = v;
  applyMargin(v);
  saveSetting('tp_margin', v);
});

// ── Mirror ──

mirrorInput.addEventListener('change', () => {
  state.mirror = mirrorInput.checked;
  contentWrapper.classList.toggle('mirrored', state.mirror);
  saveSetting('tp_mirror', state.mirror);
});

// ── Theme ──

themeToggle.addEventListener('change', () => {
  state.theme = themeToggle.checked ? 'light' : 'dark';
  document.body.classList.remove('theme-dark', 'theme-light');
  document.body.classList.add('theme-' + state.theme);
  saveSetting('tp_theme', state.theme);
});

// ── Script content persistence ──

scriptEl.addEventListener('input', () => {
  state.script = scriptEl.textContent;
  saveSetting('tp_script', state.script);
});

// ── Markdown parser ──

function inlineMarkdown(text) {
  text = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  text = text.replace(/\*\*(\S(?:.*?\S)?)\*\*/g, '<strong>$1</strong>');
  // require non-space after opening * and before closing * to avoid matching bullet lines
  text = text.replace(/\*(\S(?:.*?\S)?)\*/g, '<em>$1</em>');
  return text;
}

function parseMarkdown(text) {
  const html = [];
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (t === '---') { html.push('<hr>'); continue; }
    const h = t.match(/^(#{1,2})\s+(.*)/);
    if (h) { const tag = h[1].length === 1 ? 'h1' : 'h2'; html.push(`<${tag}>${inlineMarkdown(h[2])}</${tag}>`); continue; }
    const li = t.match(/^[-*]\s+(.*)/);
    if (li) { html.push(`<p class="md-li">• ${inlineMarkdown(li[1])}</p>`); continue; }
    if (t === '') { html.push('<p class="md-gap"></p>'); continue; }
    html.push(`<p>${inlineMarkdown(t)}</p>`);
  }
  return html.join('');
}

// ── Scroll engine ──
// Sub-pixel accumulator + time-based: speed * 30 px/s (speed 1 = 30px/s, speed 5 = 150px/s)

let scrollAccum = 0;
let lastScrollTime = null;

function scrollStep(timestamp) {
  if (!state.playing || state.paused) {
    state.animFrameId = null;
    lastScrollTime = null;
    return;
  }

  if (lastScrollTime === null) lastScrollTime = timestamp;
  const elapsed = Math.min(timestamp - lastScrollTime, 100);
  lastScrollTime = timestamp;

  scrollAccum += state.speed * 30 * (elapsed / 1000);

  const maxScroll = contentWrapper.scrollHeight - contentWrapper.clientHeight;
  if (contentWrapper.scrollTop >= maxScroll) {
    stopScroll(true);
    return;
  }

  const intPx = Math.floor(scrollAccum);
  if (intPx > 0) {
    scrollAccum -= intPx;
    contentWrapper.scrollTop += intPx;
    updateProgress();
  }

  state.animFrameId = requestAnimationFrame(scrollStep);
}

function startScroll() {
  if (state.playing) return;
  state.playing = true;
  state.paused = false;
  btnStartStop.textContent = '⏸';
  btnStartStop.setAttribute('aria-label', 'Pause');
  scriptEl.contentEditable = 'false';
  scriptEl.innerHTML = parseMarkdown(state.script);
  scriptEl.classList.add('md-rendered');
  state.animFrameId = requestAnimationFrame(scrollStep);
}

function stopScroll(atEnd = false) {
  state.playing = false;
  state.paused = false;
  state.atEnd = atEnd;
  cancelAnimationFrame(state.animFrameId);
  state.animFrameId = null;
  scrollAccum = 0;
  lastScrollTime = null;
  scriptEl.classList.remove('md-rendered');
  scriptEl.textContent = state.script;
  btnStartStop.textContent = atEnd ? '↑' : '▶';
  btnStartStop.setAttribute('aria-label', atEnd ? 'Back to top' : 'Play');
  scriptEl.contentEditable = 'true';
}

function togglePause() {
  if (!state.playing) return;
  state.paused = !state.paused;
  btnStartStop.textContent = state.paused ? '▶' : '⏸';
  btnStartStop.setAttribute('aria-label', state.paused ? 'Resume' : 'Pause');
  if (!state.paused && !state.animFrameId) {
    state.animFrameId = requestAnimationFrame(scrollStep);
  }
}

// ── Progress indicator ──

function updateProgress() {
  const maxScroll = contentWrapper.scrollHeight - contentWrapper.clientHeight;
  if (maxScroll <= 0) {
    progressDot.style.top = '6px';
    return;
  }
  const trackHeight = progressDot.parentElement.clientHeight;
  const dotRadius = 6;
  const pct = contentWrapper.scrollTop / maxScroll;
  const topPx = dotRadius + pct * (trackHeight - dotRadius * 2);
  progressDot.style.top = topPx + 'px';
}

// ── Start/Stop button ──

btnStartStop.addEventListener('click', () => {
  if (state.atEnd) {
    state.atEnd = false;
    contentWrapper.scrollTo({ top: 0, behavior: 'smooth' });
    btnStartStop.textContent = '▶';
    btnStartStop.setAttribute('aria-label', 'Play');
  } else if (state.playing) {
    stopScroll();
  } else {
    startScroll();
  }
});

// ── Touch to pause/resume ──

contentWrapper.addEventListener('touchstart', (e) => {
  if (e.target.closest('#overlay')) return;
  if (!state.playing) return;
  togglePause();
}, { passive: true });

// ── Update progress on manual scroll ──

contentWrapper.addEventListener('scroll', updateProgress, { passive: true });

// ── Service Worker registration ──

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
