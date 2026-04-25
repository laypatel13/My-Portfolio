/* ================================================================
   script.js — Portfolio - LayPatel JavaScript
   ================================================================
   1. Live clock (NES HUD format)
   2. Animated pixel rain background canvas
   3. Score counter (cosmetic NES touch)
   4. Open / close windows
   5. Click-to-focus (z-index stacking)
   6. Drag windows
   ================================================================ */


/* ────────────────────────────────────────────────────────────────
   1. LIVE CLOCK — updates the HUD clock every second
   ──────────────────────────────────────────────────────────────── */
function updateClock() {
  const el = document.getElementById('clock-display');
  if (!el) return;
  const now  = new Date();
  const h    = String(now.getHours()).padStart(2, '0');
  const m    = String(now.getMinutes()).padStart(2, '0');
  el.textContent = h + ':' + m;
}
updateClock();
setInterval(updateClock, 1000);


/* ────────────────────────────────────────────────────────────────
   2. SCORE COUNTER — cosmetic NES touch, counts up on load
   CHANGE: remove this block if you don't want the score display
   ──────────────────────────────────────────────────────────────── */
let score = 0;
const scoreEl = document.getElementById('score-display');
const scoreTarget = 13370; // CHANGE: your lucky number / easter egg
const scoreInterval = setInterval(function() {
  score += Math.floor(Math.random() * 800 + 200);
  if (score >= scoreTarget) {
    score = scoreTarget;
    clearInterval(scoreInterval);
  }
  if (scoreEl) scoreEl.textContent = String(score).padStart(5, '0');
}, 80);


/* ────────────────────────────────────────────────────────────────
   3. PIXEL RAIN CANVAS
   Draws falling green characters on the background canvas,
   like matrix rain but using NES-style characters.
   CHANGE: opacity is controlled in style.css on #bg-canvas
   ──────────────────────────────────────────────────────────────── */
(function initPixelRain() {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;

  const ctx    = canvas.getContext('2d');
  const root   = document.getElementById('os-root');
  const W      = root.offsetWidth;
  const H      = root.offsetHeight;
  canvas.width  = W;
  canvas.height = H;

  const FONT_SIZE = 12;   // CHANGE: size of each falling character
  const cols      = Math.floor(W / FONT_SIZE);
  const drops     = Array(cols).fill(1); // y position of each column's drop

  // Characters to use — NES-ish: digits, symbols, katakana-ish
  const chars = '01アイウエオカキクケコサシスセソタチツテトナニヌネノ#$%&*<>?!';

  function draw() {
    // Fade the previous frame slightly — creates the trail effect
    ctx.fillStyle = 'rgba(2, 11, 2, 0.08)';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#39ff14'; // CHANGE: rain character color
    ctx.font      = FONT_SIZE + 'px monospace';

    for (let i = 0; i < drops.length; i++) {
      // Pick a random character
      const char = chars[Math.floor(Math.random() * chars.length)];
      ctx.fillText(char, i * FONT_SIZE, drops[i] * FONT_SIZE);

      // Reset drop to top randomly after it passes the bottom
      if (drops[i] * FONT_SIZE > H && Math.random() > 0.975) {
        drops[i] = 0;
      }
      drops[i]++;
    }
  }

  // CHANGE: lower interval = faster rain (ms per frame)
  setInterval(draw, 60);
})();


/* ────────────────────────────────────────────────────────────────
   4. WINDOW MANAGEMENT
   ──────────────────────────────────────────────────────────────── */
let zCounter = 50;

/* ────────────────────────────────────────────────────────────────
   SOUND ENGINE — Web Audio API (no files needed, pure code)
   All sounds are synthesized from scratch using oscillators.

   CHANGE OPEN SOUND:  edit frequencies in playOpenSound()
   CHANGE CLOSE SOUND: edit frequencies in playCloseSound()
   CHANGE VOLUME:      edit gainNode.gain.setValueAtTime() values (0.0–1.0)
   ──────────────────────────────────────────────────────────────── */

// AudioContext is created once and reused — browsers require a user
// gesture before audio can play, so we create it lazily on first use.
let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

/**
 * playTone(frequency, duration, type, startTime, volume)
 * Low-level helper — plays a single oscillator tone.
 *
 * @param {number} frequency  - pitch in Hz (e.g. 880 = high A)
 * @param {number} duration   - how long the tone lasts in seconds
 * @param {string} type       - oscillator wave: 'square' | 'sine' | 'sawtooth' | 'triangle'
 *                              'square' = most NES-like
 * @param {number} startTime  - when to start (AudioContext.currentTime offset)
 * @param {number} volume     - loudness 0.0–1.0
 */
function playTone(frequency, duration, type, startTime, volume) {
  const ctx  = getAudioCtx();
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.type      = type || 'square'; // square wave = NES channel 1 sound
  osc.frequency.setValueAtTime(frequency, startTime);

  // Attack: ramp up quickly, then cut off sharply — NES style
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(volume, startTime + 0.01); // fast attack
  gain.gain.setValueAtTime(volume, startTime + duration - 0.01);
  gain.gain.linearRampToValueAtTime(0, startTime + duration);  // fast decay

  osc.start(startTime);
  osc.stop(startTime + duration);
}

/**
 * playOpenSound()
 * Two-note rising blip — classic NES "menu confirm" / window open.
 * CHANGE: swap the Hz values to change the notes.
 *   Low  note: 440 Hz = A4
 *   High note: 880 Hz = A5 (one octave up)
 */
function playOpenSound() {
  const ctx  = getAudioCtx();
  const now  = ctx.currentTime;
  // Note 1: lower beep
  playTone(440, 0.07, 'square', now,        0.18);
  // Note 2: higher beep — plays 80ms after note 1
  playTone(880, 0.09, 'square', now + 0.08, 0.18);
}

/**
 * playCloseSound()
 * Two-note falling blip — NES "cancel / back" sound.
 * Opposite of open: starts high, drops low.
 */
function playCloseSound() {
  const ctx = getAudioCtx();
  const now = ctx.currentTime;
  // Note 1: higher beep
  playTone(660, 0.07, 'square', now,        0.15);
  // Note 2: lower beep — plays 70ms after note 1
  playTone(330, 0.10, 'square', now + 0.07, 0.15);
}

/**
 * openWin(name)
 * Shows win-{name}, brings it to front, marks dock-{name} as running.
 * Plays the open sound.
 */
function openWin(name) {
  const win  = document.getElementById('win-' + name);
  const dock = document.getElementById('dock-' + name);
  if (!win) return;
  win.classList.add('active');
  win.style.zIndex = ++zCounter;
  if (dock) dock.classList.add('running');
  playOpenSound(); // 🔊 NES open beep
}

/**
 * closeWin(name)
 * Hides win-{name} and clears its dock indicator.
 * Plays the close sound.
 */
function closeWin(name) {
  const win  = document.getElementById('win-' + name);
  const dock = document.getElementById('dock-' + name);
  if (!win) return;
  win.classList.remove('active');
  if (dock) dock.classList.remove('running');
  playCloseSound(); // 🔊 NES close beep
}


/* ────────────────────────────────────────────────────────────────
   5. CLICK-TO-FOCUS
   Clicking anywhere on a window brings it above the others.
   ──────────────────────────────────────────────────────────────── */
document.querySelectorAll('.os-window').forEach(function(win) {
  win.addEventListener('mousedown', function() {
    win.style.zIndex = ++zCounter;
  });
});


/* ────────────────────────────────────────────────────────────────
   6. WINDOW DRAGGING
   Grab the title bar → drag the window.
   Clamped inside the desktop so it can't go off-screen.
   ──────────────────────────────────────────────────────────────── */
let dragging = null;
let offsetX  = 0;
let offsetY  = 0;

function dragStart(event, windowId) {
  const win = document.getElementById(windowId);
  win.style.zIndex = ++zCounter;
  dragging = win;

  // getBoundingClientRect keeps both coords in viewport space — no jump
  const rect = win.getBoundingClientRect();
  offsetX = event.clientX - rect.left;
  offsetY = event.clientY - rect.top;

  document.addEventListener('mousemove', onDrag);
  document.addEventListener('mouseup',   dragEnd);
}

function onDrag(event) {
  if (!dragging) return;

  const root   = document.getElementById('os-root');
  const bounds = root.getBoundingClientRect();

  let newX = event.clientX - bounds.left - offsetX;
  let newY = event.clientY - bounds.top  - offsetY;

  // Clamp: keep window inside desktop area (between topbar and taskbar)
  newX = Math.max(0, Math.min(newX, bounds.width  - dragging.offsetWidth));
  newY = Math.max(30, Math.min(newY, bounds.height - 50 - dragging.offsetHeight));

  dragging.style.left = newX + 'px';
  dragging.style.top  = newY + 'px';
}

function dragEnd() {
  dragging = null;
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup',   dragEnd);
}


/* ================================================================
   MOBILE PANEL LOGIC
   ================================================================
   On mobile (≤768px), floating windows are hidden via CSS.
   Instead, tapping an icon calls openWin(name) which ALSO calls
   openMobilePanel(name) to show the full-screen panel.

   HOW IT WORKS:
   1. openMobilePanel(name) finds the hidden .os-window by ID
   2. It copies its .win-title and .win-body content into #mobile-panel
   3. It shows #mobile-panel by adding .active
   4. closeMobilePanel() hides it again, returning to the icon grid
   ================================================================ */

/**
 * isMobile()
 * Returns true if the screen is narrow enough to be "mobile".
 * 768px matches the CSS @media breakpoint above.
 */
function isMobile() {
  return window.innerWidth <= 768;
}

/**
 * openMobilePanel(name)
 * Copies content from the hidden win-{name} into the mobile panel and shows it.
 * Called automatically by openWin() when on mobile.
 *
 * @param {string} name - window name e.g. 'about', 'skills'
 */
function openMobilePanel(name) {
  const win   = document.getElementById('win-' + name);
  const panel = document.getElementById('mobile-panel');
  const title = document.getElementById('mobile-panel-title');
  const body  = document.getElementById('mobile-panel-body');

  if (!win || !panel) return;

  // Copy the title text from the window's titlebar
  const winTitle = win.querySelector('.win-title');
  if (winTitle) title.textContent = winTitle.textContent;

  // Copy the window body HTML into the panel body
  // We clone it so the original window is untouched
  const winBody = win.querySelector('.win-body');
  if (winBody) {
    body.innerHTML = '';                          // clear old content
    body.appendChild(winBody.cloneNode(true));    // paste clone in
  }

  panel.classList.add('active'); // show the panel (CSS: display:flex)
  body.scrollTop = 0;            // always start scrolled to top
}

/**
 * closeMobilePanel()
 * Hides the mobile panel, returning the user to the icon grid.
 * Called by the ◀ BACK button in the panel titlebar.
 */
function closeMobilePanel() {
  const panel = document.getElementById('mobile-panel');
  if (panel) panel.classList.remove('active');
}

/* ── Hook into existing openWin() ────────────────────────────────
   We wrap the original openWin so that on mobile it ALSO opens
   the mobile panel instead of (or in addition to) the desktop window.
   The desktop window stays hidden via CSS on mobile anyway.
   ──────────────────────────────────────────────────────────────── */
const _originalOpenWin = openWin;
openWin = function(name) {
  _originalOpenWin(name);         // always run the original (handles dock dot etc.)
  if (isMobile()) {
    openMobilePanel(name);        // additionally open the mobile panel on small screens
  }
};
