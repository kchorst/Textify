// output.js — Textify render engine + controls

// ── Character sets ──
const CHARSET = '$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,"^`\'. ';

// Block density ramp for Color Block mode (darkest → lightest)
const BLOCKSET = ['█', '▓', '▒', '░'];

// ── Defaults ──
const DEFAULTS = {
  fontSize:   12,
  width:      100,
  contrast:   1.0,
  invert:     true,
  bgWhite:    false
};

// ── State ──
let pixelData   = null;
let imgWidth    = 0;
let imgHeight   = 0;
let currentMode     = 'bw';
let currentFontSize = DEFAULTS.fontSize;
let currentWidth    = DEFAULTS.width;
let currentContrast = DEFAULTS.contrast;
let currentInvert   = DEFAULTS.invert;
let currentBgWhite  = DEFAULTS.bgWhite;
let debounceTimer   = null;

// ── DOM refs ──
const pre            = document.getElementById('ascii-output');
const spinner        = document.getElementById('spinner-overlay');
const modeBtns       = document.querySelectorAll('.mode-btn');
const fontSlider     = document.getElementById('font-size-slider');
const widthSlider    = document.getElementById('width-slider');
const contrastSlider = document.getElementById('contrast-slider');
const fontVal        = document.getElementById('font-size-val');
const widthVal       = document.getElementById('width-val');
const contrastVal    = document.getElementById('contrast-val');
const btnInvert      = document.getElementById('btn-invert');
const btnBg          = document.getElementById('btn-bg');
const btnReset       = document.getElementById('btn-reset');
const btnCopy        = document.getElementById('btn-copy');
const btnTxt         = document.getElementById('btn-txt');
const btnHtml        = document.getElementById('btn-html');
const btnPng         = document.getElementById('btn-png');

// ── Spinner ──
function showSpinner() { spinner.classList.add('visible'); }
function hideSpinner() { spinner.classList.remove('visible'); }
function setModeBtnsDisabled(d) { modeBtns.forEach(b => { b.disabled = d; }); }

// ── Background colour ──
function applyBg() {
  const bg   = currentBgWhite ? '#ffffff' : '#000000';
  const fg   = currentBgWhite ? '#000000' : '#ffffff';
  document.body.style.background = bg;
  document.getElementById('render-wrap').style.background = bg;
  pre.style.background = bg;
  pre.style.color      = fg;
  btnBg.textContent    = currentBgWhite ? 'BG: White' : 'BG: Black';
  btnBg.classList.toggle('active', currentBgWhite);
}

// ── Decode data URL → pixel array ──
function decodeDataURL(dataURL, width, height) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width  = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      resolve(ctx.getImageData(0, 0, width, height).data);
    };
    img.onerror = () => reject(new Error('Failed to decode image'));
    img.src = dataURL;
  });
}

// ── Render ──
function render() {
  if (!pixelData) return;
  showSpinner();
  setModeBtnsDisabled(true);
  requestAnimationFrame(() => {
    setTimeout(() => {
      try { doRender(); }
      finally {
        hideSpinner();
        setModeBtnsDisabled(false);
        updateButtonStates();
      }
    }, 0);
  });
}

// ── Measure actual char dimensions ──
function measureChar() {
  const probe = document.createElement('span');
  probe.style.cssText = `font-family:monospace;font-size:${currentFontSize}px;line-height:1em;` +
                        `visibility:hidden;position:absolute;white-space:pre`;
  probe.textContent = 'MMMMMMMMMM';
  document.body.appendChild(probe);
  const w = probe.offsetWidth / 10;
  const h = probe.offsetHeight;
  document.body.removeChild(probe);
  return { charW: w, charH: h };
}

function doRender() {
  const totalWidth     = document.getElementById('render-wrap').clientWidth;
  const effectiveWidth = Math.floor(totalWidth * (currentWidth / 100));

  const { charW, charH } = measureChar();
  const aspectCorrection  = charW / charH;

  const cols = Math.max(10, Math.floor(effectiveWidth / charW));
  const rows = Math.max(1,  Math.floor(cols * (imgHeight / imgWidth) * aspectCorrection));

  pre.style.fontSize = currentFontSize + 'px';

  if      (currentMode === 'bw')          renderBW(cols, rows);
  else if (currentMode === 'color-ascii') renderColorASCII(cols, rows);
  else                                    renderColorBlock(cols, rows);
}

// ── Averaged 2×2 pixel sampler ──
function samplePixel(col, row, cols, rows) {
  let rSum = 0, gSum = 0, bSum = 0, count = 0;

  const srcCX = (col + 0.5) / cols * imgWidth;
  const srcCY = (row + 0.5) / rows * imgHeight;

  for (let dy = -0.5; dy <= 0.5; dy++) {
    for (let dx = -0.5; dx <= 0.5; dx++) {
      const sx = Math.min(imgWidth  - 1, Math.max(0, Math.floor(srcCX + dx)));
      const sy = Math.min(imgHeight - 1, Math.max(0, Math.floor(srcCY + dy)));
      const idx = (sy * imgWidth + sx) * 4;
      rSum += pixelData[idx];
      gSum += pixelData[idx + 1];
      bSum += pixelData[idx + 2];
      count++;
    }
  }

  return {
    r: Math.round(rSum / count),
    g: Math.round(gSum / count),
    b: Math.round(bSum / count)
  };
}

// ── Luminance → ASCII char ──
function pixelToChar(r, g, b) {
  let L = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  L = Math.pow(L, 1 / currentContrast);
  if (currentInvert) L = 1 - L;
  const idx = Math.min(CHARSET.length - 1, Math.floor(L * CHARSET.length));
  return CHARSET[idx];
}

// ── Luminance → block char ──
function pixelToBlock(r, g, b) {
  let L = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  L = Math.pow(L, 1 / currentContrast);
  const idx = Math.min(BLOCKSET.length - 1, Math.floor(L * BLOCKSET.length));
  return BLOCKSET[idx];
}

// ── Mode 1: BW ──
function renderBW(cols, rows) {
  const lines = [];
  for (let row = 0; row < rows; row++) {
    let line = '';
    for (let col = 0; col < cols; col++) {
      const { r, g, b } = samplePixel(col, row, cols, rows);
      line += pixelToChar(r, g, b);
    }
    lines.push(line);
  }
  pre.textContent = lines.join('\n');
}

// ── Mode 2: Color ASCII ──
function renderColorASCII(cols, rows) {
  const parts = [];
  for (let row = 0; row < rows; row++) {
    if (row > 0) parts.push('\n');
    for (let col = 0; col < cols; col++) {
      const { r, g, b } = samplePixel(col, row, cols, rows);
      const ch = pixelToChar(r, g, b);
      parts.push(`<span style="color:rgb(${r},${g},${b})">${escapeHtml(ch)}</span>`);
    }
  }
  pre.innerHTML = parts.join('');
}

// ── Mode 3: Color Block — density + colour ──
function renderColorBlock(cols, rows) {
  const parts = [];
  for (let row = 0; row < rows; row++) {
    if (row > 0) parts.push('\n');
    for (let col = 0; col < cols; col++) {
      const { r, g, b } = samplePixel(col, row, cols, rows);
      parts.push(`<span style="color:rgb(${r},${g},${b})">█</span>`);
    }
  }
  pre.innerHTML = parts.join('');
}

function escapeHtml(ch) {
  if (ch === '&') return '&amp;';
  if (ch === '<') return '&lt;';
  if (ch === '>') return '&gt;';
  return ch;
}

// ── Button states ──
function updateButtonStates() {
  const isBW = currentMode === 'bw';
  btnTxt.disabled = !isBW;
  // Use visibility so the centre zone doesn't reflow when Invert is hidden
  btnInvert.classList.toggle('bw-only-hidden', !isBW);
}

// ── Persist settings ──
function saveSettings() {
  chrome.storage.local.set({
    textify_settings: {
      fontSize:  currentFontSize,
      width:     currentWidth,
      contrast:  currentContrast,
      invert:    currentInvert,
      bgWhite:   currentBgWhite,
      mode:      currentMode
    }
  });
}

function loadSettings() {
  return new Promise(resolve => {
    chrome.storage.local.get('textify_settings', result => {
      if (result.textify_settings) {
        const s = result.textify_settings;
        currentFontSize = s.fontSize  ?? DEFAULTS.fontSize;
        currentWidth    = s.width     ?? DEFAULTS.width;
        currentContrast = s.contrast  ?? DEFAULTS.contrast;
        currentInvert   = s.invert    ?? DEFAULTS.invert;
        currentBgWhite  = s.bgWhite   ?? DEFAULTS.bgWhite;
        currentMode     = s.mode      ?? 'bw';
      }
      resolve();
    });
  });
}

function syncUI() {
  fontSlider.value     = currentFontSize;
  widthSlider.value    = currentWidth;
  contrastSlider.value = currentContrast;

  fontVal.textContent     = currentFontSize + 'px';
  widthVal.textContent    = currentWidth + '%';
  contrastVal.textContent = currentContrast.toFixed(1);

  btnInvert.classList.toggle('active', currentInvert);

  modeBtns.forEach(b => b.classList.toggle('active', b.dataset.mode === currentMode));

  applyBg();
}

// ── Mode toggle ──
modeBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    if (btn.disabled) return;
    currentMode = btn.dataset.mode;
    modeBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    saveSettings();
    render();
  });
});

// ── Invert ──
btnInvert.addEventListener('click', () => {
  currentInvert = !currentInvert;
  btnInvert.classList.toggle('active', currentInvert);
  saveSettings();
  render();
});

// ── Background toggle ──
btnBg.addEventListener('click', () => {
  currentBgWhite = !currentBgWhite;
  applyBg();
  saveSettings();
});

// ── Reset ──
btnReset.addEventListener('click', () => {
  currentFontSize = DEFAULTS.fontSize;
  currentWidth    = DEFAULTS.width;
  currentContrast = DEFAULTS.contrast;
  currentInvert   = DEFAULTS.invert;
  currentBgWhite  = DEFAULTS.bgWhite;
  currentMode     = 'bw';
  syncUI();
  saveSettings();
  render();
});

// ── Sliders ──
fontSlider.addEventListener('input', () => {
  currentFontSize = parseInt(fontSlider.value, 10);
  fontVal.textContent = currentFontSize + 'px';
  scheduleRender();
});

widthSlider.addEventListener('input', () => {
  currentWidth = parseInt(widthSlider.value, 10);
  widthVal.textContent = currentWidth + '%';
  scheduleRender();
});

contrastSlider.addEventListener('input', () => {
  currentContrast = parseFloat(contrastSlider.value);
  contrastVal.textContent = currentContrast.toFixed(1);
  scheduleRender();
});

function scheduleRender() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => { saveSettings(); render(); }, 300);
}

// ── Save: Copy ──
btnCopy.addEventListener('click', () => {
  navigator.clipboard.writeText(
    currentMode === 'bw' ? pre.textContent : pre.innerHTML
  );
});

// ── Save: .txt ──
btnTxt.addEventListener('click', () => {
  if (currentMode !== 'bw') return;
  triggerDownload(new Blob([pre.textContent], { type: 'text/plain' }), 'textify.txt');
});

// ── Save: .html ──
btnHtml.addEventListener('click', () => {
  const bg = currentBgWhite ? '#ffffff' : '#000000';
  const fg = currentBgWhite ? '#000000' : '#ffffff';
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Textify</title>
<style>
  body { margin: 0; background: ${bg}; }
  pre { font-family: monospace; font-size: ${currentFontSize}px; line-height: 1em; background: ${bg}; color: ${fg}; white-space: pre; padding: 4px; }
</style>
</head>
<body><pre>${pre.innerHTML}</pre>
</body></html>`;
  triggerDownload(new Blob([html], { type: 'text/html' }), 'textify.html');
});

// ── Save: .png ──
btnPng.addEventListener('click', savePNG);

function savePNG() {
  if (!pixelData) return;

  const { charW, charH } = measureChar();
  const aspectCorrection  = charW / charH;

  const totalWidth     = document.getElementById('render-wrap').clientWidth;
  const effectiveWidth = Math.floor(totalWidth * (currentWidth / 100));
  const cols = Math.max(10, Math.floor(effectiveWidth / charW));
  const rows = Math.max(1,  Math.floor(cols * (imgHeight / imgWidth) * aspectCorrection));

  const canvas = document.createElement('canvas');
  canvas.width  = cols * charW;
  canvas.height = rows * charH;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = currentBgWhite ? '#ffffff' : '#000000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.font = `${currentFontSize}px monospace`;
  ctx.textBaseline = 'top';

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const { r, g, b } = samplePixel(col, row, cols, rows);
      let ch;
      if (currentMode === 'color-block') {
        ch = pixelToBlock(r, g, b);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
      } else {
        ch = pixelToChar(r, g, b);
        ctx.fillStyle = currentMode === 'bw'
          ? (currentBgWhite ? '#000000' : '#ffffff')
          : `rgb(${r},${g},${b})`;
      }
      ctx.fillText(ch, col * charW, row * charH);
    }
  }

  canvas.toBlob(blob => {
    if (blob) triggerDownload(blob, 'textify.png');
  }, 'image/png');
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// ── Init ──
chrome.storage.local.get('textify_payload', async (result) => {
  chrome.storage.local.remove('textify_payload');

  if (!result.textify_payload) {
    pre.textContent = 'No image data found.\nGo back to a page, click the Textify icon, then click an image.';
    return;
  }

  const { dataURL, width, height } = result.textify_payload;
  imgWidth  = width;
  imgHeight = height;

  try {
    showSpinner();
    await loadSettings();
    syncUI();
    pixelData = await decodeDataURL(dataURL, width, height);
    render();
  } catch (err) {
    hideSpinner();
    pre.textContent = 'Error decoding image: ' + err.message;
  }
});
