// Teleprompter

const DEFAULTS = {
  script: '',
  fontSize: 48,
  speed: 2,
  mirror: false,
  theme: 'dark',
};

const state = {
  playing: false,
  paused: false,
  animFrameId: null,
  ...loadSettings(),
};

function loadSettings() {
  try {
    return {
      script:   localStorage.getItem('tp_script')    ?? DEFAULTS.script,
      fontSize: Number(localStorage.getItem('tp_font_size') ?? DEFAULTS.fontSize),
      speed:    Number(localStorage.getItem('tp_speed')     ?? DEFAULTS.speed),
      mirror:   localStorage.getItem('tp_mirror')    === 'true',
      theme:    localStorage.getItem('tp_theme')     ?? DEFAULTS.theme,
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
const mirrorInput      = document.getElementById('mirror');
const themeToggle      = document.getElementById('theme-toggle');

function applyState() {
  scriptEl.textContent = state.script;

  scriptEl.style.fontSize = state.fontSize + 'px';
  fontSizeInput.value = state.fontSize;
  fontSizeVal.textContent = state.fontSize;

  speedInput.value = state.speed;
  speedVal.textContent = state.speed;

  mirrorInput.checked = state.mirror;
  contentWrapper.classList.toggle('mirrored', state.mirror);

  themeToggle.checked = state.theme === 'light';
  document.body.className = 'theme-' + state.theme;
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

// ── Mirror ──

mirrorInput.addEventListener('change', () => {
  state.mirror = mirrorInput.checked;
  contentWrapper.classList.toggle('mirrored', state.mirror);
  saveSetting('tp_mirror', state.mirror);
});

// ── Theme ──

themeToggle.addEventListener('change', () => {
  state.theme = themeToggle.checked ? 'light' : 'dark';
  document.body.className = 'theme-' + state.theme;
  saveSetting('tp_theme', state.theme);
});
