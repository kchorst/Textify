// output.js — Textify render engine + controls

// ── Character sets ──
const CHARSET = '$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,"^`\'. ';

// Block density ramp for Color Block mode (darkest → lightest)
const BLOCKSET = ['█', '▓', '▒', '░'];

// ── Defaults ──
const DEFAULTS = {
  fontSize:   12,
  width:      100,
  contrast:   1.0, // RC93 universal range 0.2-4.0
  invert:     true,
  inverseImage: false,
  bgWhite:    false,
  spacerRows: 1,
  invertBrightness: true,
  zoom:       100,
  // Custom mode defaults
  blockColors: ['#ff0000'], // Array of selected block colors
  bgColor: '#000000',
  rowDensity: 50,
  colDensity: 60,
  hGap: 0,
  orientation: 'horizontal',
  // Halftone mode defaults
  colorImprovement: 0, // None
  improvementLevel: 2,
  overallStyle: 'dark',
  halftoneSize: 7, // Small
  halftoneColors: ['#000000'], // Array of selected halftone colors
  halftoneBgColor: '#ffffff',
  transparentPng: false,
  useImageColors: false, // Use actual image colors for halftone dots
  // Stipple / single-line defaults
  stippleDensity: 16000,
  stippleVariant: 'classic',
  stippleColor: '#000000',
  stippleBgColor: '#ffffff',
  stippleDotSize: 0.7,
  singleLineDensity: 22006,
  singleLineVariant: 'classic',
  singleLineColor: '#000000',
  singleLineBgColor: '#ffffff',
  singleLineWidth: 0.45
};

const PRESET_CALIBRATION_REVISION = 93;

const STIPPLE_PRESET_DEFAULTS = {
  // RC93 freezes the already-qualified defaults for 1 / 3 / 4. Only Blue Noise
  // is recalibrated to the user's browser-qualified setting.
  classic:   { density: 16000, dotSize: 0.7, contrast: 1.4, zoom: 100, width: 100, color: '#000000', bgColor: '#ffffff' },
  voronoi:   { density: 23500, dotSize: 0.8, contrast: 0.7, zoom: 35,  width: 100, color: '#000000', bgColor: '#ffffff' },
  dithered:  { density: 16000, dotSize: 0.7, contrast: 1.2, zoom: 100, width: 100, color: '#000000', bgColor: '#ffffff' },
  structure: { density: 16000, dotSize: 0.7, contrast: 1.5, zoom: 100, width: 100, color: '#000000', bgColor: '#ffffff' }
};

const SINGLE_LINE_PRESET_DEFAULTS = {
  // RC93 screenshot-qualified Reset/default tuples. Dithered / Maze remains
  // byte-for-byte at the accepted RC92 default.
  classic:   { density: 22006, lineWidth: 0.45, contrast: 0.8, zoom: 40,  width: 100, color: '#000000', bgColor: '#ffffff' },
  voronoi:   { density: 11225, lineWidth: 0.95, contrast: 3.0, zoom: 40,  width: 100, color: '#000000', bgColor: '#ffffff' },
  dithered:  { density: 11000, lineWidth: 1.0,  contrast: 1.3, zoom: 100, width: 100, color: '#000000', bgColor: '#ffffff' },
  textured:  { density: 12000, lineWidth: 1.2,  contrast: 1.4, zoom: 30,  width: 100, color: '#000000', bgColor: '#ffffff' }
};

const CALIBRATION_DEFAULTS = {
  stippleClassicRelaxation: 50,
  stippleBlueSpacing: 27,
  stippleBlueBg: 70,
  stippleDitherTone: 50,
  stippleDitherPattern: 50,
  stippleStructureEmphasis: 50,
  // RC93 browser-qualified TSP calibration values. Controls that landed at 100
  // get extended UI/algorithm headroom rather than making 100 a hard ceiling.
  tspClassicToneSupport: 100,
  tspClassicFeatureDetail: 100,
  tspVoronoiTone: 100,
  tspVoronoiSmoothness: 100,
  tspDitherTone: 50,
  tspDitherPattern: 50,
  tspTexturedDirection: 65,
  tspTexturedScale: 50
};

// Range Option A: preserve every previous capability, but add headroom where the
// user's chosen calibration was at/near an old endpoint. Ranges are contextual,
// so accepted styles do not lose their familiar scale.
const STIPPLE_CONTROL_RANGES = {
  classic:   { density: [6000, 26000, 500], dotSize: [0.3, 1.1, 0.1], style: [0, 100, 1] },
  voronoi:   { density: [6000, 40000, 500], dotSize: [0.3, 1.4, 0.1], style: [0, 100, 1] },
  dithered:  { density: [6000, 26000, 500], dotSize: [0.3, 1.1, 0.1], style: [0, 100, 1] },
  structure: { density: [6000, 26000, 500], dotSize: [0.3, 1.1, 0.1], style: [0, 100, 1] }
};

const SINGLE_LINE_CONTROL_RANGES = {
  classic:  { density: [4000, 40000, 1], lineWidth: [0.1, 2.0, 0.05], first: [0, 160, 1], second: [0, 160, 1] },
  voronoi:  { density: [4000, 26000, 1], lineWidth: [0.2, 2.0, 0.05], first: [0, 160, 1], second: [0, 160, 1] },
  dithered: { density: [4000, 26000, 1], lineWidth: [0.2, 2.0, 0.05], first: [0, 100, 1], second: [0, 100, 1] },
  textured: { density: [4000, 26000, 1], lineWidth: [0.2, 2.0, 0.05], first: [0, 100, 1], second: [0, 100, 1] }
};

// ── State ──
let pixelData   = null;
let imgWidth    = 0;
let imgHeight   = 0;
let sourceRenderedWidth = 0;
let sourceRenderedHeight = 0;
let currentMode     = 'bw';
let currentFontSize = DEFAULTS.fontSize;
let currentWidth    = DEFAULTS.width;
let currentContrast = DEFAULTS.contrast;
let currentInvert   = DEFAULTS.invert;
let currentInverseImage = DEFAULTS.inverseImage;
let currentBgWhite  = DEFAULTS.bgWhite;
let currentSpacerRows = DEFAULTS.spacerRows;
let currentInvertBrightness = DEFAULTS.invertBrightness;
let currentZoom     = DEFAULTS.zoom;
let currentBlockColors = [...DEFAULTS.blockColors];
let currentBgColorCustom = DEFAULTS.bgColor;
let currentRowDensity = DEFAULTS.rowDensity;
let currentColDensity = DEFAULTS.colDensity;
let currentHGap = DEFAULTS.hGap;
let currentOrientation = DEFAULTS.orientation;
let currentColorImprovement = DEFAULTS.colorImprovement;
let currentImprovementLevel = DEFAULTS.improvementLevel;
let currentOverallStyle = DEFAULTS.overallStyle;
let currentHalftoneSize = DEFAULTS.halftoneSize;
let currentHalftoneColors = [...DEFAULTS.halftoneColors];
let currentHalftoneBgColor = DEFAULTS.halftoneBgColor;
let currentTransparentPng = DEFAULTS.transparentPng;
let currentUseImageColors = DEFAULTS.useImageColors;
let currentStippleDensity = DEFAULTS.stippleDensity;
let currentStippleVariant = DEFAULTS.stippleVariant;
let currentStippleColor = DEFAULTS.stippleColor;
let currentStippleBgColor = DEFAULTS.stippleBgColor;
let currentStippleDotSize = DEFAULTS.stippleDotSize;
let currentSingleLineDensity = DEFAULTS.singleLineDensity;
let currentSingleLineVariant = DEFAULTS.singleLineVariant;
let currentSingleLineColor = DEFAULTS.singleLineColor;
let currentSingleLineBgColor = DEFAULTS.singleLineBgColor;
let currentSingleLineWidth = DEFAULTS.singleLineWidth;
let currentStippleClassicRelaxation = CALIBRATION_DEFAULTS.stippleClassicRelaxation;
let currentStippleBlueSpacing = CALIBRATION_DEFAULTS.stippleBlueSpacing;
let currentStippleBlueBg = CALIBRATION_DEFAULTS.stippleBlueBg;
let currentStippleDitherTone = CALIBRATION_DEFAULTS.stippleDitherTone;
let currentStippleDitherPattern = CALIBRATION_DEFAULTS.stippleDitherPattern;
let currentStippleStructureEmphasis = CALIBRATION_DEFAULTS.stippleStructureEmphasis;
let currentTspClassicToneSupport = CALIBRATION_DEFAULTS.tspClassicToneSupport;
let currentTspClassicFeatureDetail = CALIBRATION_DEFAULTS.tspClassicFeatureDetail;
let currentTspVoronoiTone = CALIBRATION_DEFAULTS.tspVoronoiTone;
let currentTspVoronoiSmoothness = CALIBRATION_DEFAULTS.tspVoronoiSmoothness;
let currentTspDitherTone = CALIBRATION_DEFAULTS.tspDitherTone;
let currentTspDitherPattern = CALIBRATION_DEFAULTS.tspDitherPattern;
let currentTspTexturedDirection = CALIBRATION_DEFAULTS.tspTexturedDirection;
let currentTspTexturedScale = CALIBRATION_DEFAULTS.tspTexturedScale;
let debounceTimer   = null;
let stippleGeometryCache = { key: null, points: null };
let singleLineGeometryCache = { key: null, path: null };

// ── DOM refs ──
const pre            = document.getElementById('ascii-output');
const spinner        = document.getElementById('spinner-overlay');
const modeBtns       = document.querySelectorAll('.mode-btn');
const fontSlider     = document.getElementById('font-size-slider');
const widthSlider    = document.getElementById('width-slider');
const contrastSlider = document.getElementById('contrast-slider');
const inverseImageCheckbox = document.getElementById('inverse-image');
const spacerSlider   = document.getElementById('spacer-slider');
const zoomSlider     = document.getElementById('zoom-slider');
const fontVal        = document.getElementById('font-size-val');
const widthVal       = document.getElementById('width-val');
const contrastVal    = document.getElementById('contrast-val');
const spacerVal      = document.getElementById('spacer-val');
const zoomVal        = document.getElementById('zoom-val');
const btnInvert      = document.getElementById('btn-invert');
const btnBg          = document.getElementById('btn-bg');
const btnReset       = document.getElementById('btn-reset');
const btnCopy        = document.getElementById('btn-copy');
const btnTxt         = document.getElementById('btn-txt');
const btnHtml        = document.getElementById('btn-html');
const btnPng         = document.getElementById('btn-png');
const btnNegative    = document.getElementById('btn-negative');
const btnTransparent = document.getElementById('btn-transparent');
const blockColorChecks = document.querySelectorAll('.block-color-check');
const bgColorRadios   = document.querySelectorAll('input[name="bg-color"]');
const rowDensitySlider = document.getElementById('row-density-slider');
const colDensitySlider = document.getElementById('col-density-slider');
const rowDensityVal    = document.getElementById('row-density-val');
const colDensityVal    = document.getElementById('col-density-val');
const hGapSlider       = document.getElementById('h-gap-slider');
const hGapVal          = document.getElementById('h-gap-val');
const orientationRadios = document.querySelectorAll('input[name="orientation"]');
const presetBtns       = document.querySelectorAll('.preset-btn');
// Halftone mode controls
const colorImprovementSelect = document.getElementById('color-improvement');
const improvementLevelSelect = document.getElementById('improvement-level');
const overallStyleSelect = document.getElementById('overall-style');
const halftoneSizeSelect = document.getElementById('halftone-size');
const halftoneColorChecks = document.querySelectorAll('.halftone-color-check');
const halftoneBgColorRadios = document.querySelectorAll('input[name="halftone-bg-color"]');
const transparentPngCheckbox = document.getElementById('transparent-png');
const halftoneColorPicker = document.getElementById('halftone-color-picker');
const halftoneBgColorPicker = document.getElementById('halftone-bg-color-picker');
const useImageColorsCheckbox = document.getElementById('use-image-colors');
const stippleDensitySlider = document.getElementById('stipple-density-slider');
const stippleDensityVal = document.getElementById('stipple-density-val');
const stippleVariantSelect = document.getElementById('stipple-variant');
const stippleSizeSlider = document.getElementById('stipple-size-slider');
const stippleSizeVal = document.getElementById('stipple-size-val');
const stippleColorPicker = document.getElementById('stipple-color-picker');
const stippleColorVal = document.getElementById('stipple-color-val');
const stippleBgColorPicker = document.getElementById('stipple-bg-color-picker');
const stippleBgColorVal = document.getElementById('stipple-bg-color-val');
const singleLineDensitySlider = document.getElementById('single-line-density-slider');
const singleLineDensityVal = document.getElementById('single-line-density-val');
const singleLineVariantSelect = document.getElementById('single-line-variant');
const singleLineWidthSlider = document.getElementById('single-line-width-slider');
const singleLineWidthVal = document.getElementById('single-line-width-val');
const singleLineColorPicker = document.getElementById('single-line-color-picker');
const singleLineColorVal = document.getElementById('single-line-color-val');
const singleLineBgColorPicker = document.getElementById('single-line-bg-color-picker');
const singleLineBgColorVal = document.getElementById('single-line-bg-color-val');
const stippleClassicRelaxationSlider = document.getElementById('stipple-classic-relaxation');
const stippleClassicRelaxationVal = document.getElementById('stipple-classic-relaxation-val');
const stippleBlueSpacingSlider = document.getElementById('stipple-blue-spacing');
const stippleBlueSpacingVal = document.getElementById('stipple-blue-spacing-val');
const stippleDitherToneSlider = document.getElementById('stipple-dither-tone');
const stippleDitherToneVal = document.getElementById('stipple-dither-tone-val');
const stippleStructureEmphasisSlider = document.getElementById('stipple-structure-emphasis');
const stippleStructureEmphasisVal = document.getElementById('stipple-structure-emphasis-val');
const tspClassicToneSupportSlider = document.getElementById('tsp-classic-tone-support');
const tspClassicToneSupportVal = document.getElementById('tsp-classic-tone-support-val');
const tspClassicFeatureDetailSlider = document.getElementById('tsp-classic-feature-detail');
const tspClassicFeatureDetailVal = document.getElementById('tsp-classic-feature-detail-val');
const tspVoronoiToneSlider = document.getElementById('tsp-voronoi-tone');
const tspVoronoiToneVal = document.getElementById('tsp-voronoi-tone-val');
const tspVoronoiSmoothnessSlider = document.getElementById('tsp-voronoi-smoothness');
const tspVoronoiSmoothnessVal = document.getElementById('tsp-voronoi-smoothness-val');
const tspDitherToneSlider = document.getElementById('tsp-dither-tone');
const tspDitherToneVal = document.getElementById('tsp-dither-tone-val');
const tspDitherPatternSlider = document.getElementById('tsp-dither-pattern');
const tspDitherPatternVal = document.getElementById('tsp-dither-pattern-val');
const tspTexturedDirectionSlider = document.getElementById('tsp-textured-direction');
const tspTexturedDirectionVal = document.getElementById('tsp-textured-direction-val');
const tspTexturedScaleSlider = document.getElementById('tsp-textured-scale');
const tspTexturedScaleVal = document.getElementById('tsp-textured-scale-val');
const chromeStorage = typeof chrome !== 'undefined' && chrome.storage ? chrome.storage : null;

function getStipplePresetDefaults(variant = DEFAULTS.stippleVariant) {
  return STIPPLE_PRESET_DEFAULTS[variant] || STIPPLE_PRESET_DEFAULTS[DEFAULTS.stippleVariant];
}

function getSingleLinePresetDefaults(variant = DEFAULTS.singleLineVariant) {
  return SINGLE_LINE_PRESET_DEFAULTS[variant] || SINGLE_LINE_PRESET_DEFAULTS[DEFAULTS.singleLineVariant];
}

function applyStipplePresetDefaults(variant = currentStippleVariant, options = {}) {
  const { preserveColors = true, preserveBackground = true, preserveContrast = false, preserveView = false } = options;
  const preset = getStipplePresetDefaults(variant);
  currentStippleVariant = variant;
  currentStippleDensity = preset.density;
  currentStippleDotSize = preset.dotSize;
  if (!preserveContrast) currentContrast = preset.contrast;
  if (!preserveView) { currentWidth = preset.width ?? DEFAULTS.width; currentZoom = preset.zoom ?? DEFAULTS.zoom; }
  if (!preserveColors) currentStippleColor = preset.color;
  if (!preserveBackground) currentStippleBgColor = preset.bgColor;
}

function applySingleLinePresetDefaults(variant = currentSingleLineVariant, options = {}) {
  const { preserveColors = true, preserveBackground = true, preserveContrast = false, preserveView = false } = options;
  const preset = getSingleLinePresetDefaults(variant);
  currentSingleLineVariant = variant;
  currentSingleLineDensity = preset.density;
  currentSingleLineWidth = preset.lineWidth;
  if (!preserveContrast) currentContrast = preset.contrast;
  if (!preserveView) { currentWidth = preset.width ?? DEFAULTS.width; currentZoom = preset.zoom ?? DEFAULTS.zoom; }
  if (!preserveColors) currentSingleLineColor = preset.color;
  if (!preserveBackground) currentSingleLineBgColor = preset.bgColor;
}

// ── Spinner ──
function showSpinner() { spinner.classList.add('visible'); }
function hideSpinner() { spinner.classList.remove('visible'); }
function setModeBtnsDisabled(d) { modeBtns.forEach(b => { b.disabled = d; }); }

// ── Background colour ──
function applyBg() {
  if (currentMode === 'custom') {
    const bg = currentBgColorCustom;
    document.body.style.background = bg;
    document.getElementById('render-wrap').style.background = bg;
    // Don't set pre.style.background here - it's set in renderCustom
  } else if (currentMode === 'halftone') {
    const bg = currentHalftoneBgColor;
    document.body.style.background = bg;
    document.getElementById('render-wrap').style.background = bg;
    // Don't set pre.style.background here - it's set in renderHalftone
  } else {
    const bg   = currentBgWhite ? '#ffffff' : '#000000';
    const fg   = currentBgWhite ? '#000000' : '#ffffff';
    document.body.style.background = bg;
    document.getElementById('render-wrap').style.background = bg;
    pre.style.background = bg;
    pre.style.color      = fg;
  }
  btnBg.textContent    = currentBgWhite ? 'BG: White' : 'BG: Black';
  btnBg.classList.toggle('active', currentBgWhite);

  // Disable BG button in halftone mode (background controlled by back color setting)
  btnBg.disabled = currentMode === 'halftone';
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

  // Reset pre styles for non-glitch modes
  pre.style.width = '';
  pre.style.height = '';
  pre.style.display = '';
  pre.style.flexDirection = '';
  pre.style.margin = '';
  pre.style.padding = '';
  pre.style.overflow = '';
  pre.style.background = '';
  pre.style.fontSize = currentFontSize + 'px';

  try {
    if      (currentMode === 'bw')          renderBW(cols, rows);
    else if (currentMode === 'color-ascii') renderColorASCII(cols, rows);
    else if (currentMode === 'color-block') renderColorBlock(cols, rows);
    else if (currentMode === 'halftone')    renderHalftone(cols, rows);
    else if (currentMode === 'glitch')      renderGlitch(cols, rows);
    else if (currentMode === 'custom')      renderCustom(cols, rows);
    else if (currentMode === 'stipple')     renderStipple(cols, rows);
    else if (currentMode === 'single-line') renderSingleLine(cols, rows);
  } finally {
    // RC90 invariant: every render, successful or failed, preserves the user's
    // preview zoom. Renderers may adjust layout, but never own zoom state.
    applyZoom();
  }
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

function getNormalizedLuminance(r, g, b) {
  let L = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  L = Math.pow(L, 1 / Math.max(0.1, currentContrast));
  if (currentInverseImage) L = 1 - L;
  if (currentMode === 'bw' && currentInvert) L = 1 - L;
  return Math.max(0, Math.min(1, L));
}

function getPixelLuminanceAt(x, y) {
  const sx = Math.min(imgWidth - 1, Math.max(0, Math.round(x)));
  const sy = Math.min(imgHeight - 1, Math.max(0, Math.round(y)));
  const idx = (sy * imgWidth + sx) * 4;
  return getNormalizedLuminance(pixelData[idx], pixelData[idx + 1], pixelData[idx + 2]);
}

function getRawGray(x, y) {
  const sx = Math.min(imgWidth - 1, Math.max(0, Math.round(x)));
  const sy = Math.min(imgHeight - 1, Math.max(0, Math.round(y)));
  const idx = (sy * imgWidth + sx) * 4;
  const r = pixelData[idx];
  const g = pixelData[idx + 1];
  const b = pixelData[idx + 2];
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function getSamplingLuminance(x, y) {
  const raw = getRawGray(x, y) / 255;
  return currentInverseImage ? 1 - raw : raw;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function hexToRgb(hex) {
  const value = hex.replace('#', '');
  const full = value.length === 3 ? value.split('').map(ch => ch + ch).join('') : value;
  const num = Number.parseInt(full, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

function invertHexColor(hex) {
  if (!hex || typeof hex !== 'string') return '#ffffff';
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(255 - r, 255 - g, 255 - b);
}

function experimentalFgColor(baseColor) {
  return currentInverseImage ? invertHexColor(baseColor) : baseColor;
}

function experimentalBgColor(baseColor) {
  return currentInverseImage ? invertHexColor(baseColor) : baseColor;
}

function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function createSeededRng(seed) {
  let t = seed >>> 0;
  return function () {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function percentile(values, q) {
  if (!values.length) return 0;
  const copy = Array.from(values);
  copy.sort((a, b) => a - b);
  const pos = clamp(q, 0, 1) * (copy.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return copy[lo];
  const t = pos - lo;
  return copy[lo] * (1 - t) + copy[hi] * t;
}

function sampleCellMeanLuminance(x, y, cols, rows) {
  // Area-style grayscale pre-processing. Sampling a small grid inside each
  // analysis cell preserves small facial features better than one centre pixel
  // while avoiding aliases from the source image's native resolution.
  const sx0 = (x / cols) * imgWidth;
  const sx1 = ((x + 1) / cols) * imgWidth;
  const sy0 = (y / rows) * imgHeight;
  const sy1 = ((y + 1) / rows) * imgHeight;
  let sum = 0;
  const samplesPerAxis = 3;
  for (let yy = 0; yy < samplesPerAxis; yy++) {
    const sy = sy0 + ((yy + 0.5) / samplesPerAxis) * (sy1 - sy0);
    for (let xx = 0; xx < samplesPerAxis; xx++) {
      const sx = sx0 + ((xx + 0.5) / samplesPerAxis) * (sx1 - sx0);
      sum += getSamplingLuminance(sx, sy);
    }
  }
  return sum / (samplesPerAxis * samplesPerAxis);
}

function sampleCellMeanRGB(x, y, cols, rows) {
  const sx0 = (x / cols) * imgWidth;
  const sx1 = ((x + 1) / cols) * imgWidth;
  const sy0 = (y / rows) * imgHeight;
  const sy1 = ((y + 1) / rows) * imgHeight;
  let r = 0, g = 0, b = 0;
  const samplesPerAxis = 3;
  for (let yy = 0; yy < samplesPerAxis; yy++) {
    const sy = sy0 + ((yy + 0.5) / samplesPerAxis) * (sy1 - sy0);
    for (let xx = 0; xx < samplesPerAxis; xx++) {
      const sx = sx0 + ((xx + 0.5) / samplesPerAxis) * (sx1 - sx0);
      const px = Math.min(imgWidth - 1, Math.max(0, Math.round(sx)));
      const py = Math.min(imgHeight - 1, Math.max(0, Math.round(sy)));
      const idx = (py * imgWidth + px) * 4;
      r += pixelData[idx]; g += pixelData[idx + 1]; b += pixelData[idx + 2];
    }
  }
  const n = samplesPerAxis * samplesPerAxis;
  return { r: r / n, g: g / n, b: b / n };
}

function logistic01(x) {
  if (x > 24) return 1;
  if (x < -24) return 0;
  return 1 / (1 + Math.exp(-x));
}

function buildSkinSupportMap(cols, rows) {
  const skin = new Float32Array(cols * rows);
  const candidate = new Uint8Array(cols * rows);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const { r, g, b } = sampleCellMeanRGB(x, y, cols, rows);
      const Y = 0.299 * r + 0.587 * g + 0.114 * b;
      const Cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
      const Cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
      const maxC = Math.max(r, g, b);
      const minC = Math.min(r, g, b);
      const saturation = (maxC - minC) / 255;
      const chroma = Math.exp(-0.5 * Math.pow((Cb - 108) / 24, 2) - 0.5 * Math.pow((Cr - 152) / 24, 2));
      const redBias = logistic01((r - g - 3) / 8) * logistic01((r - b - 8) / 10);
      const luminanceGate = logistic01((Y - 45) / 15) * logistic01((250 - Y) / 20);
      const saturationGate = 0.45 + 0.55 * clamp((saturation - 0.02) / 0.12, 0, 1);
      const v = clamp(chroma * redBias * luminanceGate * saturationGate, 0, 1);
      const idx = y * cols + x;
      skin[idx] = v;
      // Exclude very dark brown hair/background from the portrait-support component.
      candidate[idx] = (v > 0.28 && Y > 75) ? 1 : 0;
    }
  }

  // Find the dominant central skin-colored connected component. This is a
  // portrait-support heuristic, not identity recognition: it only protects
  // the main bright skin mass from collapsing into an empty stipple/TSP void.
  const visited = new Uint8Array(candidate.length);
  const queue = new Int32Array(candidate.length);
  let best = null;
  const minSize = Math.max(8, Math.floor(candidate.length * 0.003));
  for (let seed = 0; seed < candidate.length; seed++) {
    if (!candidate[seed] || visited[seed]) continue;
    let head = 0, tail = 0;
    queue[tail++] = seed;
    visited[seed] = 1;
    const cells = [];
    let skinSum = 0, xSum = 0, ySum = 0;
    while (head < tail) {
      const idx = queue[head++];
      cells.push(idx);
      const x = idx % cols;
      const y = Math.floor(idx / cols);
      skinSum += skin[idx]; xSum += x; ySum += y;
      const left = x > 0 ? idx - 1 : -1;
      const right = x + 1 < cols ? idx + 1 : -1;
      const up = y > 0 ? idx - cols : -1;
      const down = y + 1 < rows ? idx + cols : -1;
      const ns = [left, right, up, down];
      for (let k = 0; k < 4; k++) {
        const ni = ns[k];
        if (ni >= 0 && candidate[ni] && !visited[ni]) { visited[ni] = 1; queue[tail++] = ni; }
      }
    }
    if (cells.length < minSize) continue;
    const cx = (xSum / cells.length) / Math.max(1, cols - 1);
    const cy = (ySum / cells.length) / Math.max(1, rows - 1);
    const dx = (cx - 0.5) / 0.42;
    const dy = (cy - 0.46) / 0.42;
    const central = Math.exp(-(dx * dx + dy * dy));
    const avgSkin = skinSum / cells.length;
    const score = cells.length * (0.40 + 0.60 * central) * avgSkin;
    if (!best || score > best.score) best = { score, cells, central, avgSkin };
  }

  const face = new Float32Array(candidate.length);
  let confidence = 0;
  if (best) {
    for (let i = 0; i < best.cells.length; i++) face[best.cells[i]] = 1;
    const frac = best.cells.length / candidate.length;
    confidence = clamp((frac - 0.015) / 0.12, 0, 1) * clamp(best.central, 0, 1);
  }
  let faceMask = boxBlurFloatGrid(face, cols, rows, 5);
  let maxFace = 0;
  for (let i = 0; i < faceMask.length; i++) if (faceMask[i] > maxFace) maxFace = faceMask[i];
  if (maxFace > 1e-6) {
    const inv = 1 / maxFace;
    for (let i = 0; i < faceMask.length; i++) faceMask[i] = clamp(faceMask[i] * inv, 0, 1);
  }

  return { skin: boxBlurFloatGrid(skin, cols, rows, 4), faceMask, confidence };
}

function boxBlurFloatGrid(data, cols, rows, radius) {
  if (radius <= 0) return new Float32Array(data);
  const tmp = new Float32Array(data.length);
  const out = new Float32Array(data.length);

  // Horizontal box pass.
  for (let y = 0; y < rows; y++) {
    let sum = 0;
    let count = 0;
    for (let x = -radius; x <= radius; x++) {
      if (x >= 0 && x < cols) { sum += data[y * cols + x]; count++; }
    }
    for (let x = 0; x < cols; x++) {
      tmp[y * cols + x] = sum / Math.max(1, count);
      const removeX = x - radius;
      const addX = x + radius + 1;
      if (removeX >= 0) { sum -= data[y * cols + removeX]; count--; }
      if (addX < cols) { sum += data[y * cols + addX]; count++; }
    }
  }

  // Vertical box pass.
  for (let x = 0; x < cols; x++) {
    let sum = 0;
    let count = 0;
    for (let y = -radius; y <= radius; y++) {
      if (y >= 0 && y < rows) { sum += tmp[y * cols + x]; count++; }
    }
    for (let y = 0; y < rows; y++) {
      out[y * cols + x] = sum / Math.max(1, count);
      const removeY = y - radius;
      const addY = y + radius + 1;
      if (removeY >= 0) { sum -= tmp[removeY * cols + x]; count--; }
      if (addY < rows) { sum += tmp[addY * cols + x]; count++; }
    }
  }
  return out;
}

function buildToneMap(canvasWidth, canvasHeight, maxCols = 260) {
  const aspect = canvasHeight / Math.max(1, canvasWidth);
  let cols = Math.min(maxCols, Math.max(64, Math.round(maxCols / Math.sqrt(Math.max(0.35, aspect)))));
  let rows = Math.max(64, Math.round(cols * aspect));
  if (rows > 320) {
    const scale = 320 / rows;
    rows = 320;
    cols = Math.max(64, Math.round(cols * scale));
  }

  const lum = new Float32Array(cols * rows);
  const dark = new Float32Array(cols * rows);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = y * cols + x;
      const L = clamp(sampleCellMeanLuminance(x, y, cols, rows), 0, 1);
      lum[i] = L;
      dark[i] = 1 - L;
    }
  }
  return { cols, rows, lum, dark };
}

function buildCdf(weights) {
  const cdf = new Float64Array(weights.length);
  let total = 0;
  for (let i = 0; i < weights.length; i++) {
    total += Math.max(0, weights[i]);
    cdf[i] = total;
  }
  return { cdf, total };
}

function cdfPick(cdf, total, r) {
  if (!(total > 0)) return 0;
  const target = r * total;
  let lo = 0, hi = cdf.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (cdf[mid] < target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function sampleDensityPoint(toneMap, density, canvasWidth, canvasHeight, rng, cdfInfo) {
  const idx = cdfPick(cdfInfo.cdf, cdfInfo.total, rng());
  const x = idx % toneMap.cols;
  const y = Math.floor(idx / toneMap.cols);
  return {
    x: ((x + rng()) / toneMap.cols) * canvasWidth,
    y: ((y + rng()) / toneMap.rows) * canvasHeight,
    weight: toneMap.dark[idx]
  };
}

function buildPointBuckets(points, canvasWidth, canvasHeight, bucketScale = 1.7) {
  const avgSpacing = Math.sqrt((canvasWidth * canvasHeight) / Math.max(1, points.length));
  const bucketSize = Math.max(2.5, avgSpacing * bucketScale);
  const bucketCols = Math.max(1, Math.ceil(canvasWidth / bucketSize));
  const bucketRows = Math.max(1, Math.ceil(canvasHeight / bucketSize));
  const buckets = new Array(bucketCols * bucketRows);
  for (let i = 0; i < points.length; i++) {
    const bx = clamp(Math.floor(points[i].x / bucketSize), 0, bucketCols - 1);
    const by = clamp(Math.floor(points[i].y / bucketSize), 0, bucketRows - 1);
    const bi = by * bucketCols + bx;
    if (!buckets[bi]) buckets[bi] = [];
    buckets[bi].push(i);
  }
  return { bucketSize, bucketCols, bucketRows, buckets };
}

function nearestPointIndexFast(x, y, points, bucketInfo) {
  const { bucketSize, bucketCols, bucketRows, buckets } = bucketInfo;
  const cx = clamp(Math.floor(x / bucketSize), 0, bucketCols - 1);
  const cy = clamp(Math.floor(y / bucketSize), 0, bucketRows - 1);
  let best = -1;
  let bestD2 = Infinity;
  const maxRing = Math.max(bucketCols, bucketRows);
  let foundRing = -1;

  // Expand through empty space cheaply. Once a ring contains generators,
  // inspect one additional ring to reduce boundary mistakes, then stop.
  for (let r = 0; r <= maxRing; r++) {
    const minX = Math.max(0, cx - r), maxX = Math.min(bucketCols - 1, cx + r);
    const minY = Math.max(0, cy - r), maxY = Math.min(bucketRows - 1, cy + r);
    let foundThisRing = false;
    for (let by = minY; by <= maxY; by++) {
      for (let bx = minX; bx <= maxX; bx++) {
        if (r > 0 && bx !== minX && bx !== maxX && by !== minY && by !== maxY) continue;
        const arr = buckets[by * bucketCols + bx];
        if (!arr) continue;
        foundThisRing = true;
        for (let k = 0; k < arr.length; k++) {
          const i = arr[k];
          const dx = points[i].x - x;
          const dy = points[i].y - y;
          const d2 = dx * dx + dy * dy;
          if (d2 < bestD2) { bestD2 = d2; best = i; }
        }
      }
    }
    if (foundThisRing && foundRing < 0) foundRing = r;
    if (foundRing >= 0 && r >= foundRing + 1) break;
  }
  return best;
}

function buildStippleDensity(toneMap, profile = 'stipple') {
  const density = new Float32Array(toneMap.dark.length);
  const lineMode = profile === 'singleLine';
  const evenMode = profile === 'stippleEven';
  const highContrastMode = profile === 'stippleHighContrast';

  // RC25 — replacement portrait density engine.
  // Design goal: default/mid controls must already give a high-fidelity portrait.
  // Tone still controls density, but background allocation is now gated by
  // texture/structure while the dominant face receives a low, non-zero support
  // floor plus local tonal contrast. This keeps Rai's black background quiet,
  // Audrey's pale background quiet, and preserves eyes/lips/nose/face modelling.
  const L = new Float32Array(toneMap.lum.length);
  const D = new Float32Array(toneMap.lum.length);
  const L2 = new Float32Array(toneMap.lum.length);
  for (let i = 0; i < L.length; i++) {
    let v = clamp(toneMap.lum[i], 0, 1);
    v = Math.pow(v, 1 / Math.max(0.1, currentContrast));
    L[i] = v;
    D[i] = 1 - v;
    L2[i] = v * v;
  }

  const local = boxBlurFloatGrid(L, toneMap.cols, toneMap.rows, 2);
  const medium = boxBlurFloatGrid(L, toneMap.cols, toneMap.rows, 5);
  const broad = boxBlurFloatGrid(L, toneMap.cols, toneMap.rows, 12);
  const localSq = boxBlurFloatGrid(L2, toneMap.cols, toneMap.rows, 4);
  const edge = normalizeFloatGridByPercentile(
    sobelMagnitudeFloatGrid(L, toneMap.cols, toneMap.rows), 0.982
  );
  const edgeSupport = boxBlurFloatGrid(edge, toneMap.cols, toneMap.rows, 3);
  const { skin, faceMask, confidence: portraitConfidence } =
    buildSkinSupportMap(toneMap.cols, toneMap.rows);

  // Broaden the skin component into an artistic "portrait interior" mask.
  let portraitRegion = boxBlurFloatGrid(faceMask, toneMap.cols, toneMap.rows, 11);
  let maxPortrait = 0;
  for (let i = 0; i < portraitRegion.length; i++) {
    if (portraitRegion[i] > maxPortrait) maxPortrait = portraitRegion[i];
  }
  if (maxPortrait > 1e-8) {
    const inv = 1 / maxPortrait;
    for (let i = 0; i < portraitRegion.length; i++) {
      portraitRegion[i] = clamp(portraitRegion[i] * inv, 0, 1);
    }
  }

  // Face-local tone stretch for high-key portraits.
  let faceLow = 0.58, faceHigh = 0.95, faceSpan = 0.37;
  if (portraitConfidence > 0.08) {
    const vals = [];
    for (let i = 0; i < L.length; i++) {
      if (portraitRegion[i] > 0.32) vals.push(L[i]);
    }
    if (vals.length > 32) {
      faceLow = percentile(vals, 0.04);
      faceHigh = percentile(vals, 0.96);
      faceSpan = Math.max(0.045, faceHigh - faceLow);
    }
  }

  for (let i = 0; i < density.length; i++) {
    const d = D[i];
    const localDark = Math.max(0, local[i] - L[i]);
    const mediumDark = Math.max(0, medium[i] - L[i]);
    const contrastFine = Math.abs(local[i] - L[i]);
    const contrastMedium = Math.abs(medium[i] - L[i]);
    const contrastBroad = Math.abs(broad[i] - L[i]);
    const variance = Math.max(0, localSq[i] - medium[i] * medium[i]);
    const texture = clamp(Math.sqrt(variance) * 5.0, 0, 1);
    const structure = clamp(
      3.8 * localDark +
      1.8 * mediumDark +
      1.10 * contrastFine +
      0.75 * contrastMedium +
      0.35 * contrastBroad +
      0.70 * edgeSupport[i],
      0, 1
    );

    // Global image tone. Compared with RC23/24 this is deliberately less
    // dominant; flat background cannot win simply because it is dark.
    let signal = lineMode ? (
      0.40 * Math.pow(d, 1.34) +
      0.25 * Math.pow(edge[i], 0.72) +
      0.24 * structure +
      0.07 * texture
    ) : (
      0.56 * Math.pow(d, 1.28) +
      0.20 * Math.pow(edge[i], 0.74) +
      0.18 * structure +
      0.08 * texture
    );

    if (portraitConfidence > 0.08 && portraitRegion[i] > 0.01) {
      const pr = portraitRegion[i];
      const localFaceDark = clamp((faceHigh - L[i]) / faceSpan, 0, 1);
      const facialFeature = clamp(0.62 * edgeSupport[i] + 0.58 * structure, 0, 1);

      // Sparse but non-zero face interior. This eliminates the giant blank
      // "paper cut-out" while keeping cheeks/forehead lighter than hair.
      const supportFloor = pr * portraitConfidence * (lineMode ? (
        0.115 +
        0.285 * Math.pow(localFaceDark, 1.02) +
        0.205 * facialFeature
      ) : (
        0.055 +
        0.155 * Math.pow(localFaceDark, 1.08) +
        0.115 * facialFeature
      ));
      signal = Math.max(signal, supportFloor);

      // Concentrate extra budget on eyes, brows, lips, nostrils, jaw and hairline.
      signal += pr * portraitConfidence * (lineMode ? (
        0.125 * Math.pow(edge[i], 0.66) +
        0.095 * structure +
        0.030 * skin[i]
      ) : (
        0.075 * Math.pow(edge[i], 0.68) +
        0.055 * structure +
        0.018 * skin[i]
      ));
    }

    const outsidePortrait = portraitConfidence < 0.08 || portraitRegion[i] < 0.06;
    const flatness = 1 - clamp(0.58 * texture + 0.62 * edge[i] + 0.45 * structure, 0, 1);

    if (outsidePortrait) {
      // Flat background suppression is symmetric: bright studio wall AND black
      // backdrop are both cheap unless they carry texture/edges.
      signal *= (1 - (lineMode ? 0.91 : 0.86) * flatness);

      // Stronger gates at the extremes. Textured hair survives because its
      // structure/texture terms keep flatness low.
      if (L[i] > 0.90 && flatness > 0.72) signal *= 0.10;
      if (d > 0.82 && flatness > 0.72) signal *= 0.12;
    }

    // True blank paper gets no cities.
    if (outsidePortrait && L[i] > 0.975 && edge[i] < 0.02 && texture < 0.025) {
      signal = 0;
    }

    // Soft compression keeps a few very dark areas from monopolizing the CDF.
    signal = 1 - Math.exp(-(lineMode ? 1.30 : (evenMode ? 1.45 : 1.55)) * Math.max(0, signal));
    if (evenMode) {
      // Even mode keeps the tonal read but suppresses isolated outliers so dot
      // spacing becomes more regular and blank paper stays cleaner.
      signal = Math.pow(signal, 0.96);
      if (outsidePortrait && L[i] > 0.945 && edge[i] < 0.04 && texture < 0.05) signal *= 0.15;
    } else if (highContrastMode) {
      // RC81 exposes the existing high-contrast profile as a neutral calibration
      // around RC54. A value of 50 is behavior-identical to the accepted profile.
      const toneScale = 0.5 + clamp(currentStippleStructureEmphasis, 0, 100) / 100;
      signal = Math.pow(signal, 1 + 0.14 * toneScale);
      if (outsidePortrait && L[i] > 0.92 && edge[i] < 0.05 && texture < 0.06) signal *= clamp(0.12 - 0.04 * toneScale, 0.03, 0.12);
      if (D[i] > 0.70) signal = Math.min(1, signal * (1 + 0.08 * toneScale));
    }
    density[i] = clamp(signal, 0, 1);
  }
  return density;
}

function buildStipplePoints(canvasWidth, canvasHeight, targetPointCount, seedTag = 'toneCloud10', profile = 'stipple') {
  const toneMap = buildToneMap(canvasWidth, canvasHeight, profile === 'singleLine' ? 300 : 300);
  const density = buildStippleDensity(toneMap, profile);
  const cdfInfo = buildCdf(density);
  if (!(cdfInfo.total > 0)) return [];

  const rng = createSeededRng(hashString(`${seedTag}|${canvasWidth}|${canvasHeight}|${targetPointCount}|${currentContrast}|${currentInverseImage}`));
  const points = new Array(targetPointCount);
  for (let i = 0; i < targetPointCount; i++) {
    const p = sampleDensityPoint(toneMap, density, canvasWidth, canvasHeight, rng, cdfInfo);
    points[i] = { x: p.x, y: p.y, weight: p.weight };
  }

  // High-quality discrete weighted Lloyd / centroidal Voronoi relaxation.
  // Every analysis cell contributes its grayscale-derived density as mass.
  // This is both faster and less noisy than reusing a small random sample set,
  // while remaining faithful to the weighted-CVD formulation in the paper.
  const avgSpacing = Math.sqrt((canvasWidth * canvasHeight) / Math.max(1, targetPointCount));
  const evenMode = profile === 'stippleEven';
  const highContrastMode = profile === 'stippleHighContrast';
  const baseMaxIterations = profile === 'singleLine' ? 3 : (evenMode ? 7 : (highContrastMode ? 6 : 5));
  const baseMinIterations = profile === 'singleLine' ? 2 : (evenMode ? 5 : 4);
  const relaxScale = profile === 'stipple'
    ? (0.5 + clamp(currentStippleClassicRelaxation, 0, 100) / 100)
    : 1.0;
  const maxIterations = Math.max(1, Math.round(baseMaxIterations * relaxScale));
  const minIterations = Math.max(1, Math.min(maxIterations, Math.round(baseMinIterations * relaxScale)));
  const cellW = canvasWidth / toneMap.cols;
  const cellH = canvasHeight / toneMap.rows;

  for (let iter = 0; iter < maxIterations; iter++) {
    const buckets = buildPointBuckets(points, canvasWidth, canvasHeight, 1.70);
    const sumW = new Float64Array(targetPointCount);
    const sumX = new Float64Array(targetPointCount);
    const sumY = new Float64Array(targetPointCount);

    for (let y = 0; y < toneMap.rows; y++) {
      const py = (y + 0.5) * cellH;
      for (let x = 0; x < toneMap.cols; x++) {
        const idx = y * toneMap.cols + x;
        const w = density[idx];
        if (!(w > 0)) continue;
        const px = (x + 0.5) * cellW;
        const j = nearestPointIndexFast(px, py, points, buckets);
        if (j < 0) continue;
        sumW[j] += w;
        sumX[j] += px * w;
        sumY[j] += py * w;
      }
    }

    let moveSum = 0;
    let moved = 0;
    const damping = iter < 2 ? 0.84 : 0.97;
    for (let i = 0; i < targetPointCount; i++) {
      const ox = points[i].x;
      const oy = points[i].y;
      if (!(sumW[i] > 0)) {
        const p = sampleDensityPoint(toneMap, density, canvasWidth, canvasHeight, rng, cdfInfo);
        points[i].x = p.x;
        points[i].y = p.y;
        points[i].weight = p.weight;
      } else {
        const nx = sumX[i] / sumW[i];
        const ny = sumY[i] / sumW[i];
        points[i].x = clamp(ox * (1 - damping) + nx * damping, 0, canvasWidth - 0.001);
        points[i].y = clamp(oy * (1 - damping) + ny * damping, 0, canvasHeight - 0.001);
      }
      moveSum += Math.hypot(points[i].x - ox, points[i].y - oy);
      moved++;
    }

    const meanMove = moveSum / Math.max(1, moved);
    if (iter + 1 >= minIterations && meanMove < avgSpacing * 0.016) break;
  }
  return points;
}

function buildFeatureAnchorPoints(canvasWidth, canvasHeight, targetPointCount) {
  if (targetPointCount <= 0) return [];
  const toneMap = buildToneMap(canvasWidth, canvasHeight, 300);
  const black = percentile(toneMap.lum, 0.006);
  let white = percentile(toneMap.lum, 0.995);
  if (white - black < 0.18) white = percentile(toneMap.lum, 0.999);
  white = Math.max(black + 0.14, white);
  const span = Math.max(0.14, white - black);

  const lum = new Float32Array(toneMap.lum.length);
  for (let i = 0; i < lum.length; i++) {
    let L = clamp((toneMap.lum[i] - black) / span, 0, 1);
    L = Math.pow(L, 1 / Math.max(0.1, currentContrast));
    lum[i] = L;
  }

  const local = boxBlurFloatGrid(lum, toneMap.cols, toneMap.rows, 2);
  const medium = boxBlurFloatGrid(lum, toneMap.cols, toneMap.rows, 5);
  const edge = normalizeFloatGridByPercentile(sobelMagnitudeFloatGrid(lum, toneMap.cols, toneMap.rows), 0.982);
  const { faceMask, confidence } = buildSkinSupportMap(toneMap.cols, toneMap.rows);
  const feature = new Float32Array(lum.length);
  for (let i = 0; i < feature.length; i++) {
    const darkness = 1 - lum[i];
    const darkRidge = clamp(Math.max(0, local[i] - lum[i]) * 8.5 + Math.max(0, medium[i] - lum[i]) * 4.5, 0, 1);
    const faceBoost = confidence > 0.15 ? (0.28 + 3.10 * faceMask[i]) : 1.0;
    let w = (0.74 * Math.pow(edge[i], 0.78) + 0.70 * Math.pow(darkRidge, 0.82)) * (0.22 + 0.78 * Math.sqrt(Math.max(darkness, 0.03)));
    w *= faceBoost;
    if (edge[i] < 0.025 && darkRidge < 0.025) w = 0;
    feature[i] = Math.max(0, w);
  }

  const cdfInfo = buildCdf(feature);
  if (!(cdfInfo.total > 0)) return [];
  const rng = createSeededRng(hashString(`feature20|${canvasWidth}|${canvasHeight}|${targetPointCount}|${currentContrast}|${currentInverseImage}`));
  const points = new Array(targetPointCount);
  for (let i = 0; i < targetPointCount; i++) {
    const p = sampleDensityPoint(toneMap, feature, canvasWidth, canvasHeight, rng, cdfInfo);
    points[i] = { x: p.x, y: p.y, weight: 1.0 };
  }
  return points;
}

function injectFeatureAnchors(points, canvasWidth, canvasHeight, targetPointCount, profile = 'stipple') {
  let anchorFraction = profile === 'singleLine' ? 0.12 : (profile === 'stippleEven' ? 0.16 : 0.20);
  if (profile === 'stipple') {
    anchorFraction *= 0.5 + clamp(currentStippleClassicRelaxation, 0, 100) / 100;
  } else if (profile === 'stippleHighContrast') {
    anchorFraction *= 0.5 + clamp(currentStippleStructureEmphasis, 0, 100) / 100;
  }
  const anchorCount = Math.max(0, Math.min(points.length, Math.round(targetPointCount * anchorFraction)));
  if (!anchorCount) return points;
  const anchors = buildFeatureAnchorPoints(canvasWidth, canvasHeight, anchorCount);
  if (!anchors.length) return points;

  // Replace the lightest / least informative generators with feature anchors.
  // This shifts some budget away from blank paper into eyes, lips, hairlines,
  // and subtle subject structure without abandoning the shared stipple field.
  const replaceOrder = points
    .map((p, i) => ({ i, w: p.weight || 0 }))
    .sort((a, b) => a.w - b.w);

  const limit = Math.min(anchorCount, replaceOrder.length, anchors.length);
  for (let i = 0; i < limit; i++) {
    const slot = replaceOrder[i].i;
    points[slot].x = anchors[i].x;
    points[slot].y = anchors[i].y;
    points[slot].weight = 1.0;
  }
  return points;
}

function buildSingleLineSupportPoints(canvasWidth, canvasHeight, targetPointCount) {
  if (targetPointCount <= 0) return [];
  const toneMap = buildToneMap(canvasWidth, canvasHeight, 300);
  const black = percentile(toneMap.lum, 0.006);
  let white = percentile(toneMap.lum, 0.985);
  const p995 = percentile(toneMap.lum, 0.995);
  if (white - black < 0.18) white = p995;
  white = Math.max(black + 0.12, white);
  const span = Math.max(0.12, white - black);

  const normalizedLum = new Float32Array(toneMap.lum.length);
  for (let i = 0; i < normalizedLum.length; i++) {
    let L = clamp((toneMap.lum[i] - black) / span, 0, 1);
    L = Math.pow(L, 1 / Math.max(0.1, currentContrast));
    normalizedLum[i] = L;
  }

  const localMean = boxBlurFloatGrid(normalizedLum, toneMap.cols, toneMap.rows, 3);
  const broadMean = boxBlurFloatGrid(normalizedLum, toneMap.cols, toneMap.rows, 9);
  const edge = normalizeFloatGridByPercentile(sobelMagnitudeFloatGrid(normalizedLum, toneMap.cols, toneMap.rows), 0.985);
  const bg = estimateSingleLineBorderBackground(normalizedLum, toneMap.cols, toneMap.rows);
  const localContrastMap = new Float32Array(normalizedLum.length);
  for (let i = 0; i < normalizedLum.length; i++) {
    localContrastMap[i] = Math.abs(localMean[i] - normalizedLum[i]) + 0.45 * Math.abs(broadMean[i] - normalizedLum[i]);
  }
  const bgMask2 = buildConnectedFlatBackgroundMask(normalizedLum, toneMap.cols, toneMap.rows, edge, localContrastMap, bg.bgLum, bg.tolerance);
  const portrait = buildSkinSupportMap(toneMap.cols, toneMap.rows);
  const support = new Float32Array(normalizedLum.length);

  for (let i = 0; i < support.length; i++) {
    const L = normalizedLum[i];
    const darkness = 1 - L;
    const localDarkDetail = Math.max(0, localMean[i] - L);
    const localContrast = Math.abs(localMean[i] - L);
    const broadDarkness = Math.max(0, 1 - broadMean[i]);
    const structure = Math.max(localDarkDetail, 0.72 * localContrast);

    // Occupancy pushes cities into bright-but-real subject masses (skin, cheeks,
    // forehead, neck, clothing) while still keeping blank paper sparse.
    let occupancy = Math.max(0, broadDarkness - 0.030);
    occupancy = Math.pow(clamp(occupancy * 1.75, 0, 1), 1.15);
    let w = 0.72 * occupancy + 0.95 * Math.min(0.20, structure * 2.0);

    // Strong connected-background suppression: support points should help the
    // subject surface, not refill empty white backdrop.
    w *= (1 - 0.96 * bgMask2[i]);

    if (portrait.confidence > 0.15) {
      const f = portrait.faceMask[i] * portrait.confidence;
      if (f > 0.001) {
        w += f * (0.11 + 0.28 * occupancy + 0.22 * Math.min(0.18, structure * 1.8));
      }
    }

    if (L > 0.92 && occupancy < 0.05 && structure < 0.014) w = 0;
    else if (occupancy > 0.10 && (darkness > 0.015 || structure > 0.010)) w = Math.max(w, 0.10 + Math.min(0.18, occupancy * 0.20));
    support[i] = Math.max(0, w);
  }

  const cdfInfo = buildCdf(support);
  if (!(cdfInfo.total > 0)) return [];
  const rng = createSeededRng(hashString(`singleLineSupport16|${canvasWidth}|${canvasHeight}|${targetPointCount}|${currentContrast}|${currentInverseImage}`));
  const points = new Array(targetPointCount);
  for (let i = 0; i < targetPointCount; i++) {
    const p = sampleDensityPoint(toneMap, support, canvasWidth, canvasHeight, rng, cdfInfo);
    points[i] = { x: p.x, y: p.y, weight: 1.0 };
  }

  const cellW = canvasWidth / toneMap.cols;
  const cellH = canvasHeight / toneMap.rows;
  for (let iter = 0; iter < 2; iter++) {
    const buckets = buildPointBuckets(points, canvasWidth, canvasHeight, 1.55);
    const sumW = new Float64Array(targetPointCount);
    const sumX = new Float64Array(targetPointCount);
    const sumY = new Float64Array(targetPointCount);
    for (let y = 0; y < toneMap.rows; y++) {
      const py = (y + 0.5) * cellH;
      for (let x = 0; x < toneMap.cols; x++) {
        const gi = y * toneMap.cols + x;
        const w = support[gi];
        if (!(w > 0)) continue;
        const px = (x + 0.5) * cellW;
        const j = nearestPointIndexFast(px, py, points, buckets);
        if (j < 0) continue;
        sumW[j] += w; sumX[j] += px * w; sumY[j] += py * w;
      }
    }
    for (let i = 0; i < targetPointCount; i++) {
      if (sumW[i] > 0) {
        points[i].x = clamp(sumX[i] / sumW[i], 0, canvasWidth - 0.001);
        points[i].y = clamp(sumY[i] / sumW[i], 0, canvasHeight - 0.001);
      }
    }
  }
  return points;
}

function injectSingleLineSupportAnchors(points, canvasWidth, canvasHeight, targetPointCount) {
  const supportFraction = 0.26;
  const supportCount = Math.max(0, Math.min(points.length, Math.round(targetPointCount * supportFraction)));
  if (!supportCount) return points;
  const anchors = buildSingleLineSupportPoints(canvasWidth, canvasHeight, supportCount);
  if (!anchors.length) return points;

  const replaceOrder = points
    .map((p, i) => ({ i, w: p.weight || 0 }))
    .sort((a, b) => a.w - b.w);

  const limit = Math.min(supportCount, replaceOrder.length, anchors.length);
  for (let i = 0; i < limit; i++) {
    const slot = replaceOrder[i].i;
    points[slot].x = anchors[i].x;
    points[slot].y = anchors[i].y;
    points[slot].weight = 1.0;
  }
  return points;
}

function allocatePaperCityCounts(weights, targetPointCount, seedTag) {
  const counts = new Int32Array(weights.length);
  let totalWeight = 0;
  for (let i = 0; i < weights.length; i++) totalWeight += Math.max(0, weights[i]);
  if (!(totalWeight > 0) || targetPointCount <= 0) return counts;

  const fractional = [];
  let assigned = 0;
  for (let i = 0; i < weights.length; i++) {
    const exact = Math.max(0, weights[i]) * targetPointCount / totalWeight;
    const base = Math.floor(exact);
    counts[i] = base;
    assigned += base;
    const frac = exact - base;
    if (frac > 1e-12) fractional.push({ i, frac });
  }

  // Largest-remainder allocation.  Earlier builds used stochastic rounding
  // for every tiny fractional cell; with 10k+ cells that unintentionally put
  // cities almost everywhere and flattened the light/mid/dark separation.
  // The canonical TSP-art look depends on genuinely empty light cells, so the
  // remaining cities go to the strongest fractional claims first.
  let remainder = targetPointCount - assigned;
  if (remainder > 0 && fractional.length) {
    fractional.sort((a, b) => b.frac - a.frac || a.i - b.i);
    remainder = Math.min(remainder, fractional.length);
    for (let r = 0; r < remainder; r++) counts[fractional[r].i]++;
  }
  return counts;
}


function sobelMagnitudeFloatGrid(data, cols, rows) {
  const out = new Float32Array(data.length);
  let maxValue = 0;
  for (let y = 0; y < rows; y++) {
    const ym1 = Math.max(0, y - 1);
    const yp1 = Math.min(rows - 1, y + 1);
    for (let x = 0; x < cols; x++) {
      const xm1 = Math.max(0, x - 1);
      const xp1 = Math.min(cols - 1, x + 1);
      const a = data[ym1 * cols + xm1];
      const b = data[ym1 * cols + x];
      const c = data[ym1 * cols + xp1];
      const d = data[y * cols + xm1];
      const f = data[y * cols + xp1];
      const g = data[yp1 * cols + xm1];
      const h = data[yp1 * cols + x];
      const i = data[yp1 * cols + xp1];
      const gx = -a + c - 2 * d + 2 * f - g + i;
      const gy = -a - 2 * b - c + g + 2 * h + i;
      const v = Math.hypot(gx, gy);
      out[y * cols + x] = v;
      if (v > maxValue) maxValue = v;
    }
  }
  return out;
}

function normalizeFloatGridByPercentile(data, q = 0.98) {
  const scale = Math.max(1e-9, percentile(data, q));
  const out = new Float32Array(data.length);
  for (let i = 0; i < data.length; i++) out[i] = clamp(data[i] / scale, 0, 1);
  return out;
}

function buildArtisticSingleLineWeights(canvasWidth, canvasHeight) {
  // RC18: the Single-Line source field is intentionally separate from Stipple.
  // It keeps the TSP paper's tone-density idea, but adds multi-scale local
  // structure so a human face remains readable after the dots become one line.
  const aspect = canvasHeight / Math.max(1, canvasWidth);
  const nominalCols = 130;
  let cols = Math.max(86, Math.round(nominalCols / Math.sqrt(Math.max(0.45, aspect))));
  let rows = Math.max(86, Math.round(cols * aspect));
  if (rows > 190) {
    const s = 190 / rows;
    rows = 190;
    cols = Math.max(86, Math.round(cols * s));
  }

  const rawLum = new Float32Array(cols * rows);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      rawLum[y * cols + x] = clamp(sampleCellMeanLuminance(x, y, cols, rows), 0, 1);
    }
  }

  // Robust global stretch. Unlike RC17's raw-linear field, this deliberately
  // expands the visual separation between dark, mid and light regions.  The
  // contrast slider still acts after this normalization, with 1.0 neutral.
  const black = percentile(rawLum, 0.010);
  let white = percentile(rawLum, 0.995);
  if (white - black < 0.20) white = percentile(rawLum, 0.999);
  white = Math.max(black + 0.12, white);
  const span = Math.max(0.12, white - black);

  const lum = new Float32Array(rawLum.length);
  for (let i = 0; i < lum.length; i++) {
    let L = clamp((rawLum[i] - black) / span, 0, 1);
    L = Math.pow(L, 1 / Math.max(0.1, currentContrast));
    lum[i] = L;
  }

  // Lightweight local-contrast enhancement (browser-friendly CLAHE analogue):
  // strengthen deviations from a local mean while preserving the global tone.
  const local2 = boxBlurFloatGrid(lum, cols, rows, 2);
  const enhanced = new Float32Array(lum.length);
  for (let i = 0; i < lum.length; i++) {
    enhanced[i] = clamp(lum[i] + 0.70 * (lum[i] - local2[i]), 0, 1);
  }

  const edge = normalizeFloatGridByPercentile(sobelMagnitudeFloatGrid(enhanced, cols, rows), 0.970);
  const blur1 = boxBlurFloatGrid(enhanced, cols, rows, 1);
  const blur3 = boxBlurFloatGrid(enhanced, cols, rows, 3);
  const dark1Raw = new Float32Array(lum.length);
  const dark3Raw = new Float32Array(lum.length);
  for (let i = 0; i < lum.length; i++) {
    dark1Raw[i] = Math.max(0, blur1[i] - enhanced[i]);
    dark3Raw[i] = Math.max(0, blur3[i] - enhanced[i]);
  }
  const dark1 = normalizeFloatGridByPercentile(dark1Raw, 0.980);
  const dark3 = normalizeFloatGridByPercentile(dark3Raw, 0.980);

  const weights = new Float32Array(lum.length);
  for (let i = 0; i < weights.length; i++) {
    const L = lum[i];
    const darkness = 1 - L;
    const feature = Math.max(
      Math.pow(edge[i], 0.70),
      Math.pow(dark1[i], 0.75),
      Math.pow(dark3[i], 0.80)
    );

    // Artistic target: strong density separation like the Marilyn reference.
    // Tone defines the image; local structure keeps eyes/lips/nose/hair edges
    // alive even when their surrounding skin is high-key.
    const tone = 0.38 * Math.pow(Math.max(0, darkness), 2.10);
    const detail = 1.50 * feature * (0.25 + 0.75 * Math.sqrt(Math.max(darkness, 0.04)));
    let w = tone + detail;

    // Featureless black remains dark, but with diminishing returns so it does
    // not consume the entire city budget at the expense of facial structure.
    if (darkness > 0.88 && feature < 0.08) w *= 0.55;

    // True bright blank areas should stay genuinely open in TSP art.
    if (L > 0.93 && feature < 0.05) w *= 0.02;

    // Structured highlights/midtones get a small guaranteed floor.  This is
    // critical for high-key faces such as Rai without flooding white paper.
    if (L > 0.65 && feature > 0.08) w = Math.max(w, 0.08 * feature);

    weights[i] = Math.max(0, w);
  }

  return { cols, rows, lum, weights };
}

function buildArtisticSingleLineCities(canvasWidth, canvasHeight, targetPointCount) {
  const field = buildArtisticSingleLineWeights(canvasWidth, canvasHeight);
  const { cols, rows, lum, weights } = field;
  const counts = allocatePaperCityCounts(
    weights,
    targetPointCount,
    `artCities18|${canvasWidth}|${canvasHeight}|${targetPointCount}|${currentContrast}|${currentInverseImage}`
  );

  const rng = createSeededRng(hashString(`artPlacement18|${canvasWidth}|${canvasHeight}|${targetPointCount}|${currentContrast}|${currentInverseImage}`));
  const cellW = canvasWidth / cols;
  const cellH = canvasHeight / rows;
  const points = new Array(targetPointCount);
  let p = 0;

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const idx = y * cols + x;
      const count = counts[idx];
      const darkness = 1 - lum[idx];
      for (let q = 0; q < count && p < targetPointCount; q++) {
        points[p++] = {
          x: (x + rng()) * cellW,
          y: (y + rng()) * cellH,
          weight: darkness
        };
      }
    }
  }

  if (p < targetPointCount) {
    const cdfInfo = buildCdf(weights);
    while (p < targetPointCount && cdfInfo.total > 0) {
      const idx = cdfPick(cdfInfo.cdf, cdfInfo.total, rng());
      const x = idx % cols;
      const y = Math.floor(idx / cols);
      points[p++] = {
        x: (x + rng()) * cellW,
        y: (y + rng()) * cellH,
        weight: 1 - lum[idx]
      };
    }
  }
  points.length = p;
  return points;
}

function buildPaperStyleSingleLineCities(canvasWidth, canvasHeight, targetPointCount) {
  // RC17 follows Bosch/Herman much more literally than the earlier CVT-derived
  // Single-Line field.  The image is divided into small grayscale cells; each
  // cell receives cities in direct proportion to RAW darkness (1 - mean gray).
  // No percentile white-point remap is used here, so bright skin still receives
  // fewer cities rather than being collapsed to pure white / zero cities.
  const aspect = canvasHeight / Math.max(1, canvasWidth);
  const nominalCols = 100;
  let cols = Math.max(72, Math.round(nominalCols / Math.sqrt(Math.max(0.45, aspect))));
  let rows = Math.max(72, Math.round(cols * aspect));
  if (rows > 150) {
    const scale = 150 / rows;
    rows = 150;
    cols = Math.max(72, Math.round(cols * scale));
  }

  const lum = new Float32Array(cols * rows);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      let L = clamp(sampleCellMeanLuminance(x, y, cols, rows), 0, 1);
      // Contrast slider remains available, with 1.0 meaning the paper/raw-gray
      // interpretation.  This is not a percentile normalization.
      L = Math.pow(L, 1 / Math.max(0.1, currentContrast));
      lum[y * cols + x] = L;
    }
  }

  // A very small structure supplement protects eyes/lips/edges without
  // replacing the paper's raw-darkness rule.  At default contrast the dominant
  // term is still exactly 1 - mean grayscale.
  const localMean = boxBlurFloatGrid(lum, cols, rows, 1);
  const broadMean = boxBlurFloatGrid(lum, cols, rows, 3);
  const weights = new Float32Array(lum.length);
  for (let i = 0; i < weights.length; i++) {
    const L = lum[i];
    const darkness = 1 - L;
    const localStructure = Math.abs(localMean[i] - L);
    const broadStructure = Math.abs(broadMean[i] - L);
    const darkDetail = Math.max(0, localMean[i] - L);
    const structure = Math.min(0.30, 0.70 * localStructure + 0.42 * broadStructure + 0.45 * darkDetail);

    let w = darkness + 0.20 * structure;
    if (L > 0.997 && structure < 0.004) w = 0; // true flat white only
    weights[i] = Math.max(0, w);
  }

  const counts = allocatePaperCityCounts(
    weights,
    targetPointCount,
    `paperCities17|${canvasWidth}|${canvasHeight}|${targetPointCount}|${currentContrast}|${currentInverseImage}`
  );

  const rng = createSeededRng(hashString(`paperPlacement17|${canvasWidth}|${canvasHeight}|${targetPointCount}|${currentContrast}|${currentInverseImage}`));
  const cellW = canvasWidth / cols;
  const cellH = canvasHeight / rows;
  const points = new Array(targetPointCount);
  let p = 0;

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const idx = y * cols + x;
      const count = counts[idx];
      const darkness = 1 - lum[idx];
      for (let n = 0; n < count && p < targetPointCount; n++) {
        // Uniform random placement inside each local square/cell, as described
        // by the TSP-art procedure.  Seeded randomness keeps RESET deterministic.
        points[p++] = {
          x: (x + rng()) * cellW,
          y: (y + rng()) * cellH,
          weight: darkness
        };
      }
    }
  }

  // Defensive fill for floating-point allocation edge cases.
  if (p < targetPointCount) {
    const cdfInfo = buildCdf(weights);
    const toneMap = { cols, rows, dark: weights };
    while (p < targetPointCount && cdfInfo.total > 0) {
      const idx = cdfPick(cdfInfo.cdf, cdfInfo.total, rng());
      const x = idx % cols;
      const y = Math.floor(idx / cols);
      points[p++] = {
        x: (x + rng()) * cellW,
        y: (y + rng()) * cellH,
        weight: 1 - lum[idx]
      };
    }
  }
  points.length = p;
  return points;
}

function buildPortraitAnchorPoints(canvasWidth, canvasHeight, targetPointCount) {
  if (targetPointCount <= 0) return [];
  const toneMap = buildToneMap(canvasWidth, canvasHeight, 280);
  const { faceMask, confidence } = buildSkinSupportMap(toneMap.cols, toneMap.rows);
  if (confidence < 0.18) return [];

  const edge = normalizeFloatGridByPercentile(sobelMagnitudeFloatGrid(toneMap.lum, toneMap.cols, toneMap.rows), 0.985);
  const local = boxBlurFloatGrid(toneMap.lum, toneMap.cols, toneMap.rows, 2);
  const weights = new Float32Array(toneMap.lum.length);
  for (let i = 0; i < weights.length; i++) {
    const darkness = 1 - toneMap.lum[i];
    const darkDetail = Math.max(0, local[i] - toneMap.lum[i]);
    const structure = clamp(0.55 * edge[i] + 2.8 * darkDetail, 0, 1);
    // Uniform face support plus stronger attraction to facial structure.
    weights[i] = faceMask[i] * (0.06 + 0.48 * darkness + 0.92 * structure);
  }
  const cdfInfo = buildCdf(weights);
  if (!(cdfInfo.total > 0)) return [];
  const rng = createSeededRng(hashString(`portrait20|${canvasWidth}|${canvasHeight}|${targetPointCount}|${currentContrast}|${currentInverseImage}`));
  const points = new Array(targetPointCount);
  for (let i = 0; i < targetPointCount; i++) {
    const p = sampleDensityPoint(toneMap, weights, canvasWidth, canvasHeight, rng, cdfInfo);
    points[i] = { x: p.x, y: p.y, weight: 1.0 };
  }
  return points;
}

function injectPortraitAnchors(points, canvasWidth, canvasHeight, targetPointCount, profile = 'stipple') {
  const fraction = profile === 'singleLine' ? 0.10 : (profile === 'stippleEven' ? 0.11 : 0.14);
  const count = Math.max(0, Math.min(points.length, Math.round(targetPointCount * fraction)));
  if (!count) return points;
  const anchors = buildPortraitAnchorPoints(canvasWidth, canvasHeight, count);
  if (!anchors.length) return points;
  const order = points.map((p, i) => ({ i, w: p.weight || 0 })).sort((a, b) => a.w - b.w);
  const limit = Math.min(count, anchors.length, order.length);
  for (let i = 0; i < limit; i++) {
    const slot = order[i].i;
    points[slot].x = anchors[i].x;
    points[slot].y = anchors[i].y;
    points[slot].weight = 1.0;
  }
  return points;
}

function gilbertSign(v) { return v < 0 ? -1 : (v > 0 ? 1 : 0); }
function gilbertHalf(v) { return v >= 0 ? Math.floor(v / 2) : Math.ceil(v / 2); }

function gilbertGenerate2D(out, x, y, ax, ay, bx, by) {
  const w = Math.abs(ax + ay);
  const h = Math.abs(bx + by);
  const dax = gilbertSign(ax), day = gilbertSign(ay);
  const dbx = gilbertSign(bx), dby = gilbertSign(by);

  if (h === 1) {
    for (let i = 0; i < w; i++) { out.push([x, y]); x += dax; y += day; }
    return;
  }
  if (w === 1) {
    for (let i = 0; i < h; i++) { out.push([x, y]); x += dbx; y += dby; }
    return;
  }

  let ax2 = gilbertHalf(ax), ay2 = gilbertHalf(ay);
  let bx2 = gilbertHalf(bx), by2 = gilbertHalf(by);
  const w2 = Math.abs(ax2 + ay2);
  const h2 = Math.abs(bx2 + by2);

  if (2 * w > 3 * h) {
    if ((w2 & 1) && w > 2) { ax2 += dax; ay2 += day; }
    gilbertGenerate2D(out, x, y, ax2, ay2, bx, by);
    gilbertGenerate2D(out, x + ax2, y + ay2, ax - ax2, ay - ay2, bx, by);
  } else {
    if ((h2 & 1) && h > 2) { bx2 += dbx; by2 += dby; }
    gilbertGenerate2D(out, x, y, bx2, by2, ax2, ay2);
    gilbertGenerate2D(out, x + bx2, y + by2, ax, ay, bx - bx2, by - by2);
    gilbertGenerate2D(
      out,
      x + (ax - dax) + (bx2 - dbx),
      y + (ay - day) + (by2 - dby),
      -bx2, -by2, -(ax - ax2), -(ay - ay2)
    );
  }
}

function buildGilbertCellOrder(cols, rows) {
  const out = [];
  if (cols >= rows) gilbertGenerate2D(out, 0, 0, cols, 0, 0, rows);
  else gilbertGenerate2D(out, 0, 0, 0, rows, cols, 0);
  return out;
}

function buildDitheredSingleLineCities(canvasWidth, canvasHeight, targetPointCount) {
  // RC31 — image-weighted city field, no route baked into the generator.
  //
  // RC30's tonal allocation was directionally correct, but the mandatory
  // cell-by-cell Gilbert walk turned that field into a visible maze.  RC31
  // keeps a modest support lattice so highlights still have short connectors,
  // then spends the majority of the city budget on darkness / structure.
  // Cities are random inside their cells; the TSP-style router owns ordering.
  const aspect = canvasHeight / Math.max(1, canvasWidth);
  const maxPerCell = 4;

  // A 30% baseline is enough to keep highlight spacing bounded without
  // flattening the dark/light hierarchy.  At the 22k midpoint this is about
  // 6.6k support cells; the remaining ~15.4k cities are tone-driven.
  const desiredCells = Math.max(1800, Math.floor(targetPointCount * 0.30));
  let cols = Math.max(36, Math.round(Math.sqrt(desiredCells / Math.max(0.25, aspect))));
  let rows = Math.max(36, Math.round(cols * aspect));
  while (cols * rows > targetPointCount && cols > 36) {
    cols--;
    rows = Math.max(36, Math.round(cols * aspect));
  }

  const n = cols * rows;
  const lum = new Float32Array(n);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = y * cols + x;
      let L = clamp(sampleCellMeanLuminance(x, y, cols, rows), 0, 1);
      L = Math.pow(L, 1 / Math.max(0.1, currentContrast));
      lum[i] = L;
    }
  }

  const local = boxBlurFloatGrid(lum, cols, rows, 1);
  const medium = boxBlurFloatGrid(lum, cols, rows, 3);
  const edge = normalizeFloatGridByPercentile(
    sobelMagnitudeFloatGrid(lum, cols, rows), 0.98
  );
  const portrait = buildSkinSupportMap(cols, rows);
  const weights = new Float32Array(n);

  for (let i = 0; i < n; i++) {
    const L = lum[i];
    const d = 1 - L;
    const darkRidge = Math.max(0, local[i] - L);
    const localContrast = Math.abs(local[i] - L) + 0.55 * Math.abs(medium[i] - L);
    const e = edge[i];

    // Tone is the dominant budget signal.  Structure protects eyes, mouth,
    // nose, hair boundaries and other features from disappearing in high-key
    // regions.  Flat black gets diminishing returns so it cannot consume the
    // entire extra-city budget.
    let tone = 0.48 * Math.pow(Math.max(0, d), 1.42);
    if (d > 0.80 && e < 0.05 && localContrast < 0.022) tone *= 0.20;

    let w = tone;
    w += 0.40 * Math.pow(e, 0.70) * (0.18 + 0.82 * Math.sqrt(Math.max(d, 0.02)));
    w += 2.35 * darkRidge + 0.58 * localContrast;

    if (portrait.confidence > 0.10) {
      const f = portrait.faceMask[i] * portrait.confidence;
      if (f > 0.001) {
        w += f * (
          1.90 * Math.pow(e, 0.62) +
          5.20 * darkRidge +
          0.82 * Math.max(0, medium[i] - L) +
          0.14 * Math.pow(Math.max(d, 0.02), 0.75)
        );
      }
    }

    // Highlights retain their single support city but receive very few extras.
    if (L > 0.94 && e < 0.035 && localContrast < 0.018) w *= 0.08;
    weights[i] = Math.max(1e-8, w);
  }

  const counts = new Uint8Array(n);
  counts.fill(1);
  let extrasNeeded = Math.max(0, targetPointCount - n);
  const slots = [];
  const slotFactors = [1.0, 0.62, 0.38];
  for (let i = 0; i < n; i++) {
    const w = weights[i];
    for (let level = 0; level < maxPerCell - 1; level++) {
      slots.push({ i, score: w * slotFactors[level] });
    }
  }
  slots.sort((a, b) => b.score - a.score || a.i - b.i);
  const useSlots = Math.min(extrasNeeded, slots.length);
  for (let k = 0; k < useSlots; k++) counts[slots[k].i]++;

  const rng = createSeededRng(hashString(
    `singleLineCities31|${canvasWidth}|${canvasHeight}|${targetPointCount}|${currentContrast}|${currentInverseImage}`
  ));
  const cellW = canvasWidth / cols;
  const cellH = canvasHeight / rows;
  const points = new Array(n + useSlots);
  let outPos = 0;

  // Random placement inside each cell is intentional.  It removes RC30's
  // repeated corner/diagonal motifs and follows the Bosch/Herman city model.
  // A small inset avoids cities landing exactly on shared cell boundaries.
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const idx = y * cols + x;
      const count = counts[idx];
      for (let k = 0; k < count; k++) {
        const u = 0.10 + 0.80 * rng();
        const v = 0.10 + 0.80 * rng();
        points[outPos++] = {
          x: (x + u) * cellW,
          y: (y + v) * cellH,
          weight: weights[idx]
        };
      }
    }
  }
  points.length = outPos;
  return points;
}


function buildSingleLineLuminanceGrid(canvasWidth, canvasHeight) {
  const aspect = canvasHeight / Math.max(1, canvasWidth);
  let cols = 100;
  let rows = Math.max(72, Math.round(cols * aspect));
  if (rows > 140) {
    const s = 140 / rows;
    rows = 140;
    cols = Math.max(72, Math.round(cols * s));
  }

  const n = cols * rows;
  const rawLum = new Float32Array(n);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      rawLum[y * cols + x] = clamp(sampleCellMeanLuminance(x, y, cols, rows), 0, 1);
    }
  }

  const black = percentile(rawLum, 0.010);
  let white = percentile(rawLum, 0.995);
  if (white - black < 0.16) white = percentile(rawLum, 0.999);
  white = Math.max(black + 0.12, white);
  const span = Math.max(0.12, white - black);

  const lum = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let L = clamp((rawLum[i] - black) / span, 0, 1);
    L = Math.pow(L, 1 / Math.max(0.1, currentContrast));
    lum[i] = L;
  }
  return { cols, rows, lum };
}

function estimateSingleLineBorderBackground(lum, cols, rows) {
  // Portrait-aware preparation without identity or colour assumptions.
  // Estimate the dominant border tone from a small histogram mode rather than
  // a median: subjects often touch one or more borders, while the true studio
  // background still tends to dominate one tonal bin.
  const border = [];
  const rim = Math.max(2, Math.min(4, Math.floor(Math.min(cols, rows) * 0.025)));
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (x < rim || x >= cols - rim || y < rim || y >= rows - rim) {
        border.push(lum[y * cols + x]);
      }
    }
  }

  const bins = 64;
  const hist = new Int32Array(bins);
  for (let i = 0; i < border.length; i++) {
    const b = clamp(Math.floor(border[i] * bins), 0, bins - 1);
    hist[b]++;
  }
  let bestBin = 0;
  for (let b = 1; b < bins; b++) if (hist[b] > hist[bestBin]) bestBin = b;
  const bgLum = (bestBin + 0.5) / bins;

  const near = [];
  for (let i = 0; i < border.length; i++) {
    if (Math.abs(border[i] - bgLum) < 0.10) near.push(Math.abs(border[i] - bgLum));
  }
  const mad = near.length ? percentile(near, 0.50) : 0;
  const tolerance = clamp(0.030 + 3.5 * mad, 0.045, 0.14);
  return { bgLum, tolerance };
}


function buildConnectedFlatBackgroundMask(lum, cols, rows, edge, localContrast, bgLum, tolerance) {
  // RC35: background is a REGION, not merely a tone.  Flood only from the
  // canvas border through pixels that both resemble the dominant border tone
  // and are locally flat.  Textured hair/clothing can therefore share the same
  // darkness as the background without being erased from the city field.
  const n = lum.length;
  const mask = new Float32Array(n);
  const seen = new Uint8Array(n);
  const queue = new Int32Array(n);
  let qHead = 0, qTail = 0;

  function eligible(i, relaxed = false) {
    const toneTol = tolerance * (relaxed ? 1.45 : 1.10);
    const toneMatch = Math.abs(lum[i] - bgLum) <= toneTol;
    const flat = edge[i] < (relaxed ? 0.095 : 0.065) && localContrast[i] < (relaxed ? 0.040 : 0.027);
    return toneMatch && flat;
  }

  function seed(i) {
    if (seen[i] || !eligible(i, true)) return;
    seen[i] = 1;
    queue[qTail++] = i;
  }

  for (let x = 0; x < cols; x++) {
    seed(x);
    seed((rows - 1) * cols + x);
  }
  for (let y = 1; y < rows - 1; y++) {
    seed(y * cols);
    seed(y * cols + cols - 1);
  }

  while (qHead < qTail) {
    const i = queue[qHead++];
    const x = i % cols;
    const y = Math.floor(i / cols);
    mask[i] = 1;
    const nbrs = [];
    if (x > 0) nbrs.push(i - 1);
    if (x + 1 < cols) nbrs.push(i + 1);
    if (y > 0) nbrs.push(i - cols);
    if (y + 1 < rows) nbrs.push(i + cols);
    for (let k = 0; k < nbrs.length; k++) {
      const j = nbrs[k];
      if (seen[j] || !eligible(j, false)) continue;
      seen[j] = 1;
      queue[qTail++] = j;
    }
  }

  // Feather only the connected region edge.  A binary cut looks artificial in
  // city allocation; a small blur makes the transition photographic while the
  // core background still approaches zero weight.
  const soft = boxBlurFloatGrid(mask, cols, rows, 2);
  for (let i = 0; i < n; i++) {
    mask[i] = clamp(Math.max(mask[i], 0.78 * soft[i]), 0, 1);
  }
  return mask;
}


function buildSingleLineGridLuminance(canvasWidth, canvasHeight, cols, raw = false) {
  const aspect = canvasHeight / Math.max(1, canvasWidth);
  const rows = Math.max(2, Math.round(cols * aspect));
  const lum = new Float32Array(cols * rows);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      lum[y * cols + x] = clamp(sampleCellMeanLuminance(x, y, cols, rows), 0, 1);
    }
  }
  if (raw) return { cols, rows, lum };

  // Stable auto-levels before the textbook grayscale quantizer. This is image
  // preparation only: city allocation below remains the Bosch/Herman formula.
  const black = percentile(lum, 0.010);
  let white = percentile(lum, 0.995);
  if (white - black < 0.16) white = percentile(lum, 0.999);
  white = Math.max(black + 0.12, white);
  const span = Math.max(0.12, white - black);
  for (let i = 0; i < lum.length; i++) {
    let L = clamp((lum[i] - black) / span, 0, 1);
    L = Math.pow(L, 1 / Math.max(0.1, currentContrast));
    lum[i] = L;
  }
  return { cols, rows, lum };
}

function textbookCityCounts(lum, gamma = 9) {
  const counts = new Uint8Array(lum.length);
  let total = 0;
  for (let i = 0; i < lum.length; i++) {
    // Bosch/Herman: g = gamma - floor((gamma + 1) * mu), clamped 0..gamma.
    const g = clamp(gamma - Math.floor((gamma + 1) * clamp(lum[i], 0, 0.999999)), 0, gamma);
    // Kaplan/Bosch contrast compensation: floor(g^2 / 3).
    const c = Math.floor((g * g) / 3);
    counts[i] = c;
    total += c;
  }
  return { counts, total };
}

function findTextbookGridForTarget(canvasWidth, canvasHeight, targetPointCount, raw = false) {
  const gamma = 9;
  let best = null;
  // Search the sampling-grid scale.  The slider remains a city/detail target;
  // the emergent count is the nearest count produced by the paper formula.
  for (let cols = 8; cols <= 180; cols++) {
    const grid = buildSingleLineGridLuminance(canvasWidth, canvasHeight, cols, raw);
    const q = textbookCityCounts(grid.lum, gamma);
    const error = Math.abs(q.total - targetPointCount);
    if (!best || error < best.error) best = { ...grid, ...q, gamma, error };
  }
  return best;
}

function buildTextbookSingleLineCities(canvasWidth, canvasHeight, targetPointCount, raw, seedTag) {
  const field = findTextbookGridForTarget(canvasWidth, canvasHeight, targetPointCount, raw);
  if (!field || !field.total) return [];
  const { cols, rows, lum, counts } = field;
  const rng = createSeededRng(hashString(
    `${seedTag}|${canvasWidth}|${canvasHeight}|${targetPointCount}|${currentContrast}|${currentInverseImage}|${cols}|${rows}`
  ));
  const cellW = canvasWidth / cols;
  const cellH = canvasHeight / rows;
  const points = new Array(field.total);
  let p = 0;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const idx = y * cols + x;
      for (let k = 0; k < counts[idx]; k++) {
        points[p++] = {
          x: (x + rng()) * cellW,
          y: (y + rng()) * cellH,
          weight: 1 - lum[idx]
        };
      }
    }
  }
  return points;
}

function buildClassicSingleLineCities(canvasWidth, canvasHeight, targetPointCount) {
  // RC39 product default — line-density compensation, derived from the TSP-art
  // paper rather than from the previous render. A TSP tour darkens an image
  // roughly with the square root of city density, so city density must be
  // steeper than the desired visible tone. Kaplan/Bosch compensate the
  // grid-based method with floor(g^2 / 3); we use that transform as the
  // allocation weight while preserving a high-resolution image grid.
  const field = buildSingleLineLuminanceGrid(canvasWidth, canvasHeight);
  const { cols, rows, lum } = field;
  const n = lum.length;

  const local = boxBlurFloatGrid(lum, cols, rows, 1);
  const medium = boxBlurFloatGrid(lum, cols, rows, 3);
  const edge = normalizeFloatGridByPercentile(
    sobelMagnitudeFloatGrid(lum, cols, rows), 0.982
  );
  const localContrast = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    localContrast[i] = Math.abs(local[i] - lum[i]) + 0.45 * Math.abs(medium[i] - lum[i]);
  }

  // A large flat border-connected field is treated as photographic backdrop,
  // not as the subject simply because it is black. Textured hair, clothing,
  // architecture, animals, etc. survive because the flood requires local
  // flatness as well as border-tone similarity.
  const bg = estimateSingleLineBorderBackground(lum, cols, rows);
  const bgMask = buildConnectedFlatBackgroundMask(
    lum, cols, rows, edge, localContrast, bg.bgLum, bg.tolerance
  );

  const gamma = 9;
  const compensation = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const L = lum[i];
    const d = 1 - L;
    const darkRidge = Math.max(0, local[i] - L);

    // Desired visible ink tone. Tone leads; structure only protects small
    // features. A very small non-background surface floor prevents bright
    // faces/objects from becoming giant empty holes while leaving true white
    // highlights capable of receiving zero cities.
    let ink = d;
    ink += 0.12 * edge[i] + 0.18 * darkRidge + 0.03 * localContrast[i];
    ink *= (1 - 0.90 * bgMask[i]);

    const foreground = 1 - bgMask[i];
    if (foreground > 0.20 && L < 0.94) {
      const surfaceFloor = 0.03 + 0.10 * ((0.94 - L) / 0.94);
      ink = Math.max(ink, foreground * surfaceFloor);
    }
    ink = clamp(ink, 0, 1);

    // Bosch/Kaplan contrast compensation: first quantize to g, then use
    // floor(g^2 / 3) as the city-allocation weight. This is the crucial
    // difference between a recognizable TSP image and a washed-out maze.
    const mu = 1 - ink;
    const g = clamp(gamma - Math.floor((gamma + 1) * clamp(mu, 0, 0.999999)), 0, gamma);
    compensation[i] = Math.floor((g * g) / 3);
  }

  let totalWeight = 0;
  for (let i = 0; i < n; i++) totalWeight += compensation[i];
  if (!(totalWeight > 0)) {
    return buildTextbookSingleLineCities(
      canvasWidth, canvasHeight, targetPointCount, false,
      'singleLineClassic39Fallback'
    );
  }

  // Keep the UI detail control meaningful without lowering the analysis-grid
  // resolution. The compensated paper counts define relative city density;
  // largest-remainder allocation scales that field to the requested total.
  const counts = allocatePaperCityCounts(
    compensation, targetPointCount,
    `singleLineClassic39Counts|${canvasWidth}|${canvasHeight}|${targetPointCount}|${currentContrast}|${currentInverseImage}`
  );

  const rng = createSeededRng(hashString(
    `singleLineClassic39Placement|${canvasWidth}|${canvasHeight}|${targetPointCount}|${currentContrast}|${currentInverseImage}`
  ));
  const cellW = canvasWidth / cols;
  const cellH = canvasHeight / rows;
  const points = new Array(targetPointCount);
  let p = 0;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const idx = y * cols + x;
      const count = counts[idx];
      for (let k = 0; k < count && p < targetPointCount; k++) {
        points[p++] = {
          x: (x + rng()) * cellW,
          y: (y + rng()) * cellH,
          weight: compensation[idx]
        };
      }
    }
  }
  points.length = p;
  return points;
}

function buildStrictClassicSingleLineCities(canvasWidth, canvasHeight, targetPointCount) {
  return buildTextbookSingleLineCities(
    canvasWidth, canvasHeight, targetPointCount, true,
    'singleLineStrictClassic39'
  );
}

function buildStippledSingleLineCities(canvasWidth, canvasHeight, targetPointCount) {
  // Weighted-stipple TSP is retained as a distinct product option.
  let points = buildStipplePoints(
    canvasWidth, canvasHeight, targetPointCount,
    'singleLineStippled39', 'stippleEven'
  );
  points = injectFeatureAnchors(points, canvasWidth, canvasHeight, targetPointCount, 'stippleEven');
  points = injectPortraitAnchors(points, canvasWidth, canvasHeight, targetPointCount, 'stippleEven');
  return points;
}

// ─────────────────────────────────────────────────────────────────────────────
// RC42 REFERENCE-GROUNDED TSP CITY GENERATORS
//
// Four product styles are distinct algorithms, not parameter presets:
//  1) Classic / Marilyn: Bosch-Herman grid + Kaplan/Bosch g^2/3 compensation.
//  2) Voronoi / Organic: Secord weighted centroidal Voronoi stippling.
//  3) Dithered / Maze: ordered-dither city placement.
//  4) Textured / Directional: Voronoi cities with anisotropic route metric.
// ─────────────────────────────────────────────────────────────────────────────

function buildReferenceGrayscaleFieldV42(canvasWidth, canvasHeight, cols, contrastBoost = 1.0, whiteCut = 1.01) {
  const aspect = canvasHeight / Math.max(1, canvasWidth);
  const rows = Math.max(8, Math.round(cols * aspect));
  const lum = new Float32Array(cols * rows);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      lum[y * cols + x] = clamp(sampleCellMeanLuminance(x, y, cols, rows), 0, 1);
    }
  }

  // Stable image preparation before the reference algorithms.  The algorithms
  // below operate only on grayscale values after this point.
  const black = percentile(lum, 0.010);
  let white = percentile(lum, 0.995);
  if (white - black < 0.16) white = percentile(lum, 0.999);
  white = Math.max(black + 0.12, white);
  const span = Math.max(0.12, white - black);
  const rho = new Float32Array(lum.length);
  const userGamma = 1 / Math.max(0.1, currentContrast);

  for (let i = 0; i < lum.length; i++) {
    let L = clamp((lum[i] - black) / span, 0, 1);
    L = Math.pow(L, userGamma);
    if (contrastBoost !== 1) L = clamp(0.5 + (L - 0.5) * contrastBoost, 0, 1);
    if (L >= whiteCut) L = 1;
    lum[i] = L;
    rho[i] = 1 - L;
  }
  return { cols, rows, lum, rho };
}

function buildClassicMarilynCitiesV42(canvasWidth, canvasHeight, targetPointCount) {
  // Bosch/Herman grid city placement with the Kaplan/Bosch contrast-corrected
  // count law.  This remains the product default and intentionally permits
  // zero-city light cells.
  return buildTextbookSingleLineCities(
    canvasWidth, canvasHeight, targetPointCount, false, 'tsp42-classic-reference'
  );
}

function sampleReferenceDensityPointV42(field, canvasWidth, canvasHeight, rng, cdfInfo) {
  const idx = cdfPick(cdfInfo.cdf, cdfInfo.total, rng());
  const x = idx % field.cols;
  const y = Math.floor(idx / field.cols);
  return {
    x: ((x + rng()) / field.cols) * canvasWidth,
    y: ((y + rng()) / field.rows) * canvasHeight,
    weight: field.rho[idx]
  };
}

function buildWeightedCvdCitiesV42(canvasWidth, canvasHeight, targetPointCount, seedTag) {
  // Secord: rho(x,y) = 1 - f(x,y), then Lloyd relaxation to weighted Voronoi
  // centroids.  Kaplan/Bosch recommend contrast boosting and rounding a band
  // of bright grays to pure white for TSP art; that creates city-free paper.
  const field = buildReferenceGrayscaleFieldV42(canvasWidth, canvasHeight, 250, 1.30, 0.94);
  const cdfInfo = buildCdf(field.rho);
  if (!(cdfInfo.total > 0)) return [];

  const rng = createSeededRng(hashString(
    `${seedTag}|${canvasWidth}|${canvasHeight}|${targetPointCount}|${currentContrast}|${currentInverseImage}`
  ));
  const points = new Array(targetPointCount);
  for (let i = 0; i < targetPointCount; i++) {
    points[i] = sampleReferenceDensityPointV42(field, canvasWidth, canvasHeight, rng, cdfInfo);
  }

  const cellW = canvasWidth / field.cols;
  const cellH = canvasHeight / field.rows;
  const avgSpacing = Math.sqrt((canvasWidth * canvasHeight) / Math.max(1, targetPointCount));
  const maxIterations = 6;
  const minIterations = 4;

  for (let iter = 0; iter < maxIterations; iter++) {
    const buckets = buildPointBuckets(points, canvasWidth, canvasHeight, 1.60);
    const sumW = new Float64Array(targetPointCount);
    const sumX = new Float64Array(targetPointCount);
    const sumY = new Float64Array(targetPointCount);

    for (let y = 0; y < field.rows; y++) {
      const py = (y + 0.5) * cellH;
      for (let x = 0; x < field.cols; x++) {
        const idx = y * field.cols + x;
        const w = field.rho[idx];
        if (!(w > 0)) continue;
        const px = (x + 0.5) * cellW;
        const j = nearestPointIndexFast(px, py, points, buckets);
        if (j < 0) continue;
        sumW[j] += w;
        sumX[j] += px * w;
        sumY[j] += py * w;
      }
    }

    let moveSum = 0;
    const damping = iter < 2 ? 0.84 : 0.96;
    for (let i = 0; i < targetPointCount; i++) {
      const ox = points[i].x, oy = points[i].y;
      if (sumW[i] > 0) {
        const nx = sumX[i] / sumW[i];
        const ny = sumY[i] / sumW[i];
        points[i].x = clamp(ox * (1 - damping) + nx * damping, 0, canvasWidth - 0.001);
        points[i].y = clamp(oy * (1 - damping) + ny * damping, 0, canvasHeight - 0.001);
      } else {
        const repl = sampleReferenceDensityPointV42(field, canvasWidth, canvasHeight, rng, cdfInfo);
        points[i].x = repl.x;
        points[i].y = repl.y;
        points[i].weight = repl.weight;
      }
      moveSum += Math.hypot(points[i].x - ox, points[i].y - oy);
    }
    const meanMove = moveSum / Math.max(1, targetPointCount);
    if (iter + 1 >= minIterations && meanMove < avgSpacing * 0.015) break;
  }
  return points;
}

function buildVoronoiOrganicCitiesV42(canvasWidth, canvasHeight, targetPointCount, seedTag = 'tsp42-voronoi') {
  return buildWeightedCvdCitiesV42(canvasWidth, canvasHeight, targetPointCount, seedTag);
}

const TSP42_BAYER8 = [
   0,32, 8,40, 2,34,10,42,
  48,16,56,24,50,18,58,26,
  12,44, 4,36,14,46, 6,38,
  60,28,52,20,62,30,54,22,
   3,35,11,43, 1,33, 9,41,
  51,19,59,27,49,17,57,25,
  15,47, 7,39,13,45, 5,37,
  63,31,55,23,61,29,53,21
];

function buildDitheredMazeCitiesV42(canvasWidth, canvasHeight, targetPointCount) {
  // Ordered dithering: fixed candidate lattice, thresholded by a Bayer matrix.
  // A ranked margin is used only to make the user-facing city count exact.
  const aspect = canvasHeight / Math.max(1, canvasWidth);
  const candidateCount = Math.max(targetPointCount * 3.6, 18000);
  const cols = clamp(Math.round(Math.sqrt(candidateCount / Math.max(0.20, aspect))), 80, 400);
  const field = buildReferenceGrayscaleFieldV42(canvasWidth, canvasHeight, cols, 1.18, 0.975);
  const cellW = canvasWidth / field.cols;
  const cellH = canvasHeight / field.rows;
  const ranked = [];

  for (let y = 0; y < field.rows; y++) {
    for (let x = 0; x < field.cols; x++) {
      const i = y * field.cols + x;
      const density = field.rho[i];
      if (!(density > 0)) continue;
      const threshold = (TSP42_BAYER8[(y & 7) * 8 + (x & 7)] + 0.5) / 64;
      ranked.push({ i, margin: density - threshold, density });
    }
  }
  ranked.sort((a, b) => b.margin - a.margin || b.density - a.density || a.i - b.i);
  const n = Math.min(targetPointCount, ranked.length);
  const points = new Array(n);
  for (let p = 0; p < n; p++) {
    const idx = ranked[p].i;
    const x = idx % field.cols;
    const y = Math.floor(idx / field.cols);
    points[p] = {
      x: (x + 0.5) * cellW,
      y: (y + 0.5) * cellH,
      weight: ranked[p].density
    };
  }
  return points;
}

function buildTexturedCitiesV42(canvasWidth, canvasHeight, targetPointCount) {
  return buildVoronoiOrganicCitiesV42(canvasWidth, canvasHeight, targetPointCount, 'tsp42-textured');
}

function buildTspToneFieldV43(canvasWidth, canvasHeight, cols) {
  // RC43 shared TSP tone field.  This is deliberately separate from Stipple's
  // finished-render engine: all four TSP styles share the same perceptual
  // target, then differ only in how they place cities / measure the tour.
  const aspect = canvasHeight / Math.max(1, canvasWidth);
  const rows = Math.max(8, Math.round(cols * aspect));
  const n = cols * rows;
  const lum = new Float32Array(n);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      let L = clamp(sampleCellMeanLuminance(x, y, cols, rows), 0, 1);
      L = Math.pow(L, 1 / Math.max(0.1, currentContrast));
      lum[y * cols + x] = L;
    }
  }

  const local = boxBlurFloatGrid(lum, cols, rows, 1);
  const medium = boxBlurFloatGrid(lum, cols, rows, 4);
  const edge = normalizeFloatGridByPercentile(sobelMagnitudeFloatGrid(lum, cols, rows), 0.982);
  const edgeSupport = boxBlurFloatGrid(edge, cols, rows, 2);
  const localContrast = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    localContrast[i] = Math.abs(local[i] - lum[i]) + 0.55 * Math.abs(medium[i] - lum[i]);
  }

  const bg = estimateSingleLineBorderBackground(lum, cols, rows);
  const bgMask = buildConnectedFlatBackgroundMask(lum, cols, rows, edge, localContrast, bg.bgLum, bg.tolerance);
  const portrait = buildSkinSupportMap(cols, rows);
  const portraitRegion = boxBlurFloatGrid(portrait.faceMask, cols, rows, 4);
  const rho = new Float32Array(n);
  // RC91: Classic exposes Feature Detail independently from Tone Support.
  // 50 is exactly neutral so RC90 geometry is preserved at the baseline.
  const classicFeatureFactor = currentSingleLineVariant === 'classic'
    ? (0.55 + 0.90 * clamp(currentTspClassicFeatureDetail, 0, 160) / 100)
    : 1.0;

  for (let i = 0; i < n; i++) {
    const L = lum[i];
    const d = 1 - L;
    const darkRidge = Math.max(0, local[i] - L);
    const structure = clamp(0.62 * edgeSupport[i] + 2.6 * darkRidge + 0.95 * localContrast[i], 0, 1);
    const foreground = 1 - bgMask[i];
    const pr = portrait.confidence > 0.10 ? clamp(portraitRegion[i] * portrait.confidence, 0, 1) : 0;

    // TSP tone compensation: city density is steeper than the desired visible
    // darkness, while feature energy is added separately so eyes, brows, lips,
    // nostrils, hair boundaries and object edges remain readable in light areas.
    const tonalInk = clamp(d * (1 - 0.86 * bgMask[i]), 0, 1);
    let city = Math.pow(tonalInk, 2.18);
    city += classicFeatureFactor * 0.34 * Math.pow(structure, 1.05) * (0.20 + 0.80 * foreground);
    city += pr * (0.035 + classicFeatureFactor * 0.46 * Math.pow(structure, 0.72) + 0.10 * d);

    // Keep a tiny non-zero subject floor only where the source is not an actual
    // white highlight.  This prevents kilometer-long bridges without flattening
    // the face into a uniform maze.
    if (foreground > 0.35 && L < 0.94) city = Math.max(city, 0.018 * foreground);

    if (L > 0.985 && structure < 0.030 && pr < 0.08) city = 0;
    rho[i] = clamp(city, 0, 1);
  }

  // RC90 keeps the RC43 field byte-equivalent at each preset's neutral point,
  // while making the surviving compact controls genuinely functional.
  if (currentSingleLineVariant === 'classic') {
    const ctl = clamp(currentTspClassicToneSupport, 0, 160);
    const delta = (ctl - 30) / (ctl >= 30 ? 70 : 30);
    if (Math.abs(delta) > 1e-9) {
      for (let i = 0; i < rho.length; i++) {
        const r = rho[i];
        rho[i] = delta > 0
          ? clamp(r * (1 - 0.45 * delta) + Math.sqrt(r) * (0.45 * delta), 0, 1)
          : Math.pow(r, 1 + 0.85 * (-delta));
      }
    }
  } else if (currentSingleLineVariant === 'voronoi') {
    const power = 0.5 + clamp(currentTspVoronoiTone, 0, 160) / 100;
    if (Math.abs(power - 1) > 1e-9) for (let i = 0; i < rho.length; i++) rho[i] = Math.pow(rho[i], power);
  } else if (currentSingleLineVariant === 'dithered') {
    const power = 0.5 + clamp(currentTspDitherTone, 0, 100) / 100;
    if (Math.abs(power - 1) > 1e-9) for (let i = 0; i < rho.length; i++) rho[i] = Math.pow(rho[i], power);
  }

  return { cols, rows, lum, rho };
}

function allocateBalancedCityCountsV43(weights, targetPointCount, seedTag) {
  const counts = new Uint16Array(weights.length);
  let totalWeight = 0;
  for (let i = 0; i < weights.length; i++) totalWeight += Math.max(0, weights[i]);
  if (!(totalWeight > 0) || targetPointCount <= 0) return counts;

  const residual = [];
  let assigned = 0;
  const rng = createSeededRng(hashString(seedTag));
  for (let i = 0; i < weights.length; i++) {
    const exact = Math.max(0, weights[i]) * targetPointCount / totalWeight;
    const base = Math.floor(exact);
    counts[i] = base;
    assigned += base;
    const frac = exact - base;
    if (frac > 1e-10) {
      // Weighted random priority gives low-density midtones a fair chance at a
      // city instead of largest-remainder turning the field into a hard mask.
      const key = -Math.log(Math.max(1e-12, rng())) / frac;
      residual.push({ i, key });
    }
  }
  let remainder = Math.min(targetPointCount - assigned, residual.length);
  residual.sort((a, b) => a.key - b.key || a.i - b.i);
  for (let r = 0; r < remainder; r++) counts[residual[r].i]++;
  return counts;
}

function buildClassicMarilynCitiesV43(canvasWidth, canvasHeight, targetPointCount) {
  // RC92 Classic / Marilyn: return to the zero-inclusive grid grammar instead
  // of proportionally spreading all 11,508 cities over every non-zero weight.
  // Bright cells can receive zero cities; dark cells can receive up to four.
  // This is the key visual distinction between Classic TSP art and a uniform
  // maze.  Tone Support and Feature Detail redistribute the fixed city budget.
  if (targetPointCount <= 0) return [];
  const aspect = canvasHeight / Math.max(1, canvasWidth);
  const desiredCells = Math.max(5200, Math.round(targetPointCount * 1.13));
  const cols = clamp(Math.round(Math.sqrt(desiredCells / Math.max(0.22, aspect))), 58, 190);
  const rows = Math.max(8, Math.round(cols * aspect));
  const n = cols * rows;

  // Robust photographic normalization before quantization.
  const raw = new Float32Array(n);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) raw[y * cols + x] = clamp(sampleCellMeanLuminance(x, y, cols, rows), 0, 1);
  }
  const black = percentile(raw, 0.006);
  let white = percentile(raw, 0.996);
  if (white - black < 0.16) white = percentile(raw, 0.999);
  white = Math.max(black + 0.12, white);
  const span = Math.max(0.12, white - black);
  const lum = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let L = clamp((raw[i] - black) / span, 0, 1);
    L = Math.pow(L, 1 / Math.max(0.1, currentContrast));
    lum[i] = currentInverseImage ? 1 - L : L;
  }

  const local = boxBlurFloatGrid(lum, cols, rows, 1);
  const medium = boxBlurFloatGrid(lum, cols, rows, 3);
  const edge = normalizeFloatGridByPercentile(sobelMagnitudeFloatGrid(lum, cols, rows), 0.985);
  const localContrast = new Float32Array(n);
  for (let i = 0; i < n; i++) localContrast[i] = Math.abs(local[i] - lum[i]) + 0.50 * Math.abs(medium[i] - lum[i]);
  const bg = estimateSingleLineBorderBackground(lum, cols, rows);
  const bgMask = buildConnectedFlatBackgroundMask(lum, cols, rows, edge, localContrast, bg.bgLum, bg.tolerance);

  const toneCtl = clamp(currentTspClassicToneSupport, 0, 160) / 100;
  const featureCtl = clamp(currentTspClassicFeatureDetail, 0, 160) / 100;
  const ink = new Float32Array(n);
  const featureScore = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const L = lum[i];
    const d = 1 - L;
    const fg = 1 - bgMask[i];
    const darkRidge = Math.max(0, local[i] - L);
    const compact = clamp(0.52 * edge[i] + 2.8 * darkRidge + 0.75 * localContrast[i], 0, 1);

    // Broad tone leads. Flat border-connected backdrop is strongly moderated.
    let v = d * (1 - 0.94 * bgMask[i]);

    // Tone Support is deliberately bounded: it helps informative midtones but
    // never creates a generic light-face carpet. Near-white planes remain open.
    const mid = 4 * d * (1 - d);
    v += fg * mid * (0.018 + 0.095 * toneCtl) * (0.30 + 0.70 * Math.sqrt(compact));

    // Compact features receive a small zero-sum preference before the 0..4
    // quantizer. This protects eyes/lips/hair detail without contour tracing.
    v += fg * compact * (0.025 + 0.115 * featureCtl) * (0.30 + 0.70 * Math.sqrt(Math.max(d, 0.02)));

    if (L > 0.965 && compact < 0.045) v *= 0.12;
    if (L > 0.992 && compact < 0.08) v = 0;
    ink[i] = clamp(v, 0, 1);
    // Generic compact-feature score used only for a bounded zero-sum reserve.
    // It has no face detector: dark local ridges/edges simply outrank flat tone.
    featureScore[i] = fg * Math.pow(compact, 1.35) * (0.18 + 0.82 * Math.sqrt(Math.max(d, 0.015)));
  }

  const counts = new Uint8Array(n);
  const quantize = (exposure) => {
    let total = 0;
    for (let i = 0; i < n; i++) {
      const adjustedInk = ink[i] <= 0 ? 0 : Math.pow(ink[i], exposure);
      const mu = 1 - adjustedInk;
      const g = clamp(4 - Math.floor(5 * clamp(mu, 0, 0.999999)), 0, 4);
      counts[i] = g;
      total += g;
    }
    return total;
  };

  // Lower exponent opens the exposure (more cities); higher exponent closes it.
  let lo = 0.16, hi = 5.0;
  let total = 0;
  for (let iter = 0; iter < 28; iter++) {
    const mid = (lo + hi) * 0.5;
    total = quantize(mid);
    if (total > targetPointCount) lo = mid;
    else hi = mid;
  }
  total = quantize((lo + hi) * 0.5);

  // Exact requested city count, preserving the 0..4 grammar. Remove from the
  // lightest/redundant occupied cells first; add to darkest/high-information
  // cells first. No proportional rescaling that repopulates every light cell.
  const order = Array.from({ length: n }, (_, i) => i);
  if (total > targetPointCount) {
    order.sort((a, b) => ink[a] - ink[b] || edge[a] - edge[b] || a - b);
    let excess = total - targetPointCount;
    for (let q = 0; q < order.length && excess > 0; q++) {
      const i = order[q];
      while (counts[i] > 0 && excess > 0) { counts[i]--; excess--; }
    }
  } else if (total < targetPointCount) {
    order.sort((a, b) => (ink[b] + 0.12 * edge[b]) - (ink[a] + 0.12 * edge[a]) || a - b);
    let missing = targetPointCount - total;
    let guard = 0;
    while (missing > 0 && guard++ < 5) {
      let changed = false;
      for (let q = 0; q < order.length && missing > 0; q++) {
        const i = order[q];
        if (counts[i] >= 4 || ink[i] <= 0) continue;
        counts[i]++; missing--; changed = true;
      }
      if (!changed) break;
    }
  }

  // RC92 compact-feature protection.  Reallocate only a bounded share of the
  // already-fixed city budget, so eyes/lips/nostrils/fine hair can survive the
  // route-density transform without filling smooth skin or changing total count.
  const featureBudget = Math.round(targetPointCount * (0.022 + 0.060 * featureCtl));
  const receivers = Array.from({ length: n }, (_, i) => i)
    .filter(i => featureScore[i] > 0.16 && ink[i] > 0)
    .sort((a, b) => featureScore[b] - featureScore[a] || ink[b] - ink[a] || a - b);
  const donors = Array.from({ length: n }, (_, i) => i)
    .filter(i => counts[i] > 0)
    .sort((a, b) => featureScore[a] - featureScore[b] || ink[a] - ink[b] || counts[b] - counts[a] || a - b);
  let moved = 0;
  let donorPos = 0;
  for (let q = 0; q < receivers.length && moved < featureBudget; q++) {
    const i = receivers[q];
    const fs = featureScore[i];
    const desired = fs > 0.72 ? 3 : (fs > 0.42 ? 2 : 1);
    while (counts[i] < desired && counts[i] < 4 && moved < featureBudget) {
      let donor = -1;
      while (donorPos < donors.length) {
        const dIdx = donors[donorPos];
        if (dIdx !== i && counts[dIdx] > 0 && featureScore[dIdx] < Math.min(0.28, fs * 0.55)) { donor = dIdx; break; }
        donorPos++;
      }
      if (donor < 0) break;
      counts[donor]--;
      counts[i]++;
      moved++;
      if (counts[donor] <= 0) donorPos++;
    }
  }

  const rng = createSeededRng(hashString(
    `tsp92-classic|${canvasWidth}|${canvasHeight}|${targetPointCount}|${currentContrast}|${currentInverseImage}|${currentTspClassicToneSupport}|${currentTspClassicFeatureDetail}`
  ));
  const cellW = canvasWidth / cols, cellH = canvasHeight / rows;
  const points = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = y * cols + x;
      for (let k = 0; k < counts[i] && points.length < targetPointCount; k++) {
        const u = 0.08 + 0.84 * rng();
        const v = 0.08 + 0.84 * rng();
        points.push({ x: (x + u) * cellW, y: (y + v) * cellH, weight: ink[i] });
      }
    }
  }

  // Pathological nearly-white images may not have enough eligible 0..4 slots.
  // Keep the public count invariant without touching ordinary photographs.
  if (points.length < targetPointCount) {
    const eligible = order.filter(i => ink[i] > 0);
    let q = 0;
    while (points.length < targetPointCount && eligible.length) {
      const i = eligible[q++ % eligible.length];
      const x = i % cols, y = Math.floor(i / cols);
      points.push({ x: (x + 0.08 + 0.84 * rng()) * cellW, y: (y + 0.08 + 0.84 * rng()) * cellH, weight: ink[i] });
    }
  }
  return points;
}

function sampleTspFieldPointV43(field, canvasWidth, canvasHeight, rng, cdfInfo) {
  const i = cdfPick(cdfInfo.cdf, cdfInfo.total, rng());
  const x = i % field.cols;
  const y = Math.floor(i / field.cols);
  return {
    x: ((x + rng()) / field.cols) * canvasWidth,
    y: ((y + rng()) / field.rows) * canvasHeight,
    weight: field.rho[i]
  };
}

function buildVoronoiOrganicCitiesV43(canvasWidth, canvasHeight, targetPointCount, seedTag = 'tsp43-voronoi') {
  // Secord weighted centroidal Voronoi stippling over the same product tone
  // field as Classic.  This is the organic/even-spacing option.
  const field = buildTspToneFieldV43(canvasWidth, canvasHeight, 190);
  const cdfInfo = buildCdf(field.rho);
  if (!(cdfInfo.total > 0)) return [];
  const rng = createSeededRng(hashString(
    `${seedTag}|${canvasWidth}|${canvasHeight}|${targetPointCount}|${currentContrast}|${currentInverseImage}`
  ));
  const points = new Array(targetPointCount);
  for (let i = 0; i < targetPointCount; i++) points[i] = sampleTspFieldPointV43(field, canvasWidth, canvasHeight, rng, cdfInfo);

  const cellW = canvasWidth / field.cols;
  const cellH = canvasHeight / field.rows;
  const avgSpacing = Math.sqrt((canvasWidth * canvasHeight) / Math.max(1, targetPointCount));
  const maxRelaxIterations = currentSingleLineVariant === 'voronoi'
    ? Math.round(2 + clamp(currentTspVoronoiSmoothness, 0, 160) * 0.06)
    : 5;
  for (let iter = 0; iter < maxRelaxIterations; iter++) {
    const buckets = buildPointBuckets(points, canvasWidth, canvasHeight, 1.55);
    const sumW = new Float64Array(targetPointCount);
    const sumX = new Float64Array(targetPointCount);
    const sumY = new Float64Array(targetPointCount);
    for (let y = 0; y < field.rows; y++) {
      const py = (y + 0.5) * cellH;
      for (let x = 0; x < field.cols; x++) {
        const gi = y * field.cols + x;
        const w = field.rho[gi];
        if (!(w > 0)) continue;
        const px = (x + 0.5) * cellW;
        const j = nearestPointIndexFast(px, py, points, buckets);
        if (j < 0) continue;
        sumW[j] += w; sumX[j] += px * w; sumY[j] += py * w;
      }
    }
    let move = 0;
    const damping = iter < 2 ? 0.82 : 0.95;
    for (let i = 0; i < points.length; i++) {
      const ox = points[i].x, oy = points[i].y;
      if (sumW[i] > 0) {
        const nx = sumX[i] / sumW[i], ny = sumY[i] / sumW[i];
        points[i].x = clamp(ox * (1 - damping) + nx * damping, 0, canvasWidth - 0.001);
        points[i].y = clamp(oy * (1 - damping) + ny * damping, 0, canvasHeight - 0.001);
      } else {
        const q = sampleTspFieldPointV43(field, canvasWidth, canvasHeight, rng, cdfInfo);
        points[i].x = q.x; points[i].y = q.y; points[i].weight = q.weight;
      }
      move += Math.hypot(points[i].x - ox, points[i].y - oy);
    }
    if (iter >= 3 && move / Math.max(1, points.length) < avgSpacing * 0.018) break;
  }
  return points;
}

function buildDitheredMazeCitiesV43(canvasWidth, canvasHeight, targetPointCount) {
  // Ordered Bayer placement over the shared field.  Unlike RC42, the density
  // target already contains foreground/midtone support; the maze option can be
  // stylized without erasing the subject interior.
  const aspect = canvasHeight / Math.max(1, canvasWidth);
  const candidateCount = Math.max(22000, Math.round(targetPointCount * 3.5));
  const cols = clamp(Math.round(Math.sqrt(candidateCount / Math.max(0.22, aspect))), 90, 360);
  const field = buildTspToneFieldV43(canvasWidth, canvasHeight, cols);
  const ranked = [];
  for (let y = 0; y < field.rows; y++) {
    for (let x = 0; x < field.cols; x++) {
      const i = y * field.cols + x;
      const d = field.rho[i];
      if (!(d > 0)) continue;
      const threshold = (TSP42_BAYER8[(y & 7) * 8 + (x & 7)] + 0.5) / 64;
      const patternScale = 0.5 + clamp(currentTspDitherPattern, 0, 100) / 100;
      ranked.push({ i, score: d - threshold * patternScale, d });
    }
  }
  ranked.sort((a, b) => b.score - a.score || b.d - a.d || a.i - b.i);
  const n = Math.min(targetPointCount, ranked.length);
  const cellW = canvasWidth / field.cols, cellH = canvasHeight / field.rows;
  const points = new Array(n);
  for (let p = 0; p < n; p++) {
    const i = ranked[p].i, x = i % field.cols, y = Math.floor(i / field.cols);
    points[p] = { x: (x + 0.5) * cellW, y: (y + 0.5) * cellH, weight: ranked[p].d };
  }
  return points;
}

function buildTexturedCitiesV43(canvasWidth, canvasHeight, targetPointCount) {
  const points = buildVoronoiOrganicCitiesV43(canvasWidth, canvasHeight, targetPointCount, 'tsp43-textured');
  if (!points.length) return points;

  // RC92 keeps the two Textured controls. Texture Scale chooses the
  // spatial radius used to estimate image flow; Direction Strength controls
  // a bounded tangent displacement. This changes city geometry, not just UI.
  const scaleCtl = clamp(currentTspTexturedScale, 0, 100) / 100;
  const directionCtl = clamp(currentTspTexturedDirection, 0, 100) / 100;
  const tone = buildToneMap(canvasWidth, canvasHeight, 220);
  const blurRadius = Math.max(1, Math.round(1 + 8 * scaleCtl));
  const smooth = boxBlurFloatGrid(tone.lum, tone.cols, tone.rows, blurRadius);
  const avgSpacing = Math.sqrt((canvasWidth * canvasHeight) / Math.max(1, points.length));
  // RC92 deliberately uses a stronger-than-neutral Direction default while keeping
  // the displacement bounded; Texture Scale remains centered at 50.
  const directionDelta = (directionCtl - 0.5) * 2;
  const textureDelta = (scaleCtl - 0.5) * 2;
  const amplitude = avgSpacing * (0.16 * directionDelta + 0.10 * textureDelta);
  if (Math.abs(amplitude) < 1e-9) return points;

  const sample = (gx, gy) => {
    const x = clamp(gx, 0, tone.cols - 1);
    const y = clamp(gy, 0, tone.rows - 1);
    return smooth[y * tone.cols + x];
  };

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const gx = clamp(Math.floor(p.x / Math.max(1e-6, canvasWidth) * tone.cols), 1, tone.cols - 2);
    const gy = clamp(Math.floor(p.y / Math.max(1e-6, canvasHeight) * tone.rows), 1, tone.rows - 2);
    const dx = sample(gx + 1, gy) - sample(gx - 1, gy);
    const dy = sample(gx, gy + 1) - sample(gx, gy - 1);
    const mag = Math.hypot(dx, dy);
    if (mag < 1e-7) continue;
    const tx = -dy / mag, ty = dx / mag;
    const sign = (i & 1) ? 1 : -1;
    const localAmp = amplitude * sign;
    p.x = clamp(p.x + tx * localAmp, 0, canvasWidth - 0.001);
    p.y = clamp(p.y + ty * localAmp, 0, canvasHeight - 0.001);
  }
  return points;
}

function buildTspFeatureFieldV43(canvasWidth, canvasHeight, maxCols = 300) {
  const toneMap = buildToneMap(canvasWidth, canvasHeight, maxCols);
  const black = percentile(toneMap.lum, 0.006);
  let white = percentile(toneMap.lum, 0.995);
  if (white - black < 0.18) white = percentile(toneMap.lum, 0.999);
  white = Math.max(black + 0.14, white);
  const span = Math.max(0.14, white - black);
  const lum = new Float32Array(toneMap.lum.length);
  for (let i = 0; i < lum.length; i++) {
    let L = clamp((toneMap.lum[i] - black) / span, 0, 1);
    L = Math.pow(L, 1 / Math.max(0.1, currentContrast));
    lum[i] = L;
  }
  const local = boxBlurFloatGrid(lum, toneMap.cols, toneMap.rows, 2);
  const medium = boxBlurFloatGrid(lum, toneMap.cols, toneMap.rows, 5);
  const edge = normalizeFloatGridByPercentile(sobelMagnitudeFloatGrid(lum, toneMap.cols, toneMap.rows), 0.982);
  const portrait = buildSkinSupportMap(toneMap.cols, toneMap.rows);
  const weights = new Float32Array(lum.length);
  let maxW = 0;
  for (let i = 0; i < weights.length; i++) {
    const darkness = 1 - lum[i];
    const darkRidge = clamp(Math.max(0, local[i] - lum[i]) * 8.5 + Math.max(0, medium[i] - lum[i]) * 4.5, 0, 1);
    const faceBoost = portrait.confidence > 0.15 ? (0.28 + 3.10 * portrait.faceMask[i]) : 1.0;
    const structure = (0.74 * Math.pow(edge[i], 0.78) + 0.70 * Math.pow(darkRidge, 0.82))
      * (0.22 + 0.78 * Math.sqrt(Math.max(darkness, 0.03))) * faceBoost;
    // Mostly structure, with enough tone to retain dark masses between edges.
    let w = 1.00 * structure + 0.10 * Math.pow(Math.max(0, darkness), 1.65);
    if (edge[i] < 0.020 && darkRidge < 0.020 && darkness < 0.08) w = 0;
    weights[i] = Math.max(0, w);
    if (weights[i] > maxW) maxW = weights[i];
  }
  if (maxW > 1e-9) {
    const inv = 1 / maxW;
    for (let i = 0; i < weights.length; i++) weights[i] = clamp(weights[i] * inv, 0, 1);
  }
  const styleTone = currentSingleLineVariant === 'voronoi' ? currentTspVoronoiTone
    : (currentSingleLineVariant === 'dithered' ? currentTspDitherTone : 50);
  if (styleTone !== 50) {
    const power = 0.5 + clamp(styleTone, 0, 100) / 100;
    for (let i = 0; i < weights.length; i++) weights[i] = Math.pow(weights[i], power);
  }
  return { cols: toneMap.cols, rows: toneMap.rows, lum, rho: weights };
}

function sampleTspFeatureCitiesV43(canvasWidth, canvasHeight, targetPointCount, seedTag) {
  const field = buildTspFeatureFieldV43(canvasWidth, canvasHeight, 300);
  const cdfInfo = buildCdf(field.rho);
  if (!(cdfInfo.total > 0)) return [];
  const rng = createSeededRng(hashString(`${seedTag}|${canvasWidth}|${canvasHeight}|${targetPointCount}|${currentContrast}|${currentInverseImage}`));
  const points = new Array(targetPointCount);
  for (let i = 0; i < targetPointCount; i++) {
    const idx = cdfPick(cdfInfo.cdf, cdfInfo.total, rng());
    const x = idx % field.cols, y = Math.floor(idx / field.cols);
    points[i] = {
      x: ((x + rng()) / field.cols) * canvasWidth,
      y: ((y + rng()) / field.rows) * canvasHeight,
      weight: field.rho[idx]
    };
  }
  return { points, field, cdfInfo, rng };
}

function buildClassicMarilynCitiesV43b(canvasWidth, canvasHeight, targetPointCount) {
  // Product-default TSP city cloud: high-resolution image structure plus tone.
  // Random placement remains faithful to the classic city-placement aesthetic,
  // while avoiding the coarse-cell feature loss seen in RC42.
  const q = sampleTspFeatureCitiesV43(canvasWidth, canvasHeight, targetPointCount, 'tsp43-classic-feature');
  return q.points || [];
}

function buildVoronoiOrganicCitiesV43b(canvasWidth, canvasHeight, targetPointCount, seedTag = 'tsp43-voronoi-feature') {
  const q = sampleTspFeatureCitiesV43(canvasWidth, canvasHeight, targetPointCount, seedTag);
  const points = q.points || [];
  if (!points.length) return points;
  const field = q.field, cdfInfo = q.cdfInfo, rng = q.rng;
  const cellW = canvasWidth / field.cols, cellH = canvasHeight / field.rows;
  const avgSpacing = Math.sqrt((canvasWidth * canvasHeight) / Math.max(1, targetPointCount));
  const maxRelaxIterations = currentSingleLineVariant === 'voronoi'
    ? Math.round(2 + clamp(currentTspVoronoiSmoothness, 0, 160) * 0.06)
    : 5;
  for (let iter = 0; iter < maxRelaxIterations; iter++) {
    const buckets = buildPointBuckets(points, canvasWidth, canvasHeight, 1.55);
    const sumW = new Float64Array(targetPointCount), sumX = new Float64Array(targetPointCount), sumY = new Float64Array(targetPointCount);
    for (let y = 0; y < field.rows; y++) {
      const py = (y + 0.5) * cellH;
      for (let x = 0; x < field.cols; x++) {
        const gi = y * field.cols + x, w = field.rho[gi];
        if (!(w > 0)) continue;
        const px = (x + 0.5) * cellW;
        const j = nearestPointIndexFast(px, py, points, buckets);
        if (j < 0) continue;
        sumW[j] += w; sumX[j] += px * w; sumY[j] += py * w;
      }
    }
    let move = 0;
    const damping = iter < 2 ? 0.82 : 0.95;
    for (let i = 0; i < points.length; i++) {
      const ox = points[i].x, oy = points[i].y;
      if (sumW[i] > 0) {
        const nx = sumX[i] / sumW[i], ny = sumY[i] / sumW[i];
        points[i].x = clamp(ox * (1 - damping) + nx * damping, 0, canvasWidth - 0.001);
        points[i].y = clamp(oy * (1 - damping) + ny * damping, 0, canvasHeight - 0.001);
      } else {
        const idx = cdfPick(cdfInfo.cdf, cdfInfo.total, rng());
        const x = idx % field.cols, y = Math.floor(idx / field.cols);
        points[i].x = ((x + rng()) / field.cols) * canvasWidth;
        points[i].y = ((y + rng()) / field.rows) * canvasHeight;
        points[i].weight = field.rho[idx];
      }
      move += Math.hypot(points[i].x - ox, points[i].y - oy);
    }
    if (iter >= 3 && move / Math.max(1, points.length) < avgSpacing * 0.018) break;
  }
  return points;
}

function buildDitheredMazeCitiesV43b(canvasWidth, canvasHeight, targetPointCount) {
  const field = buildTspFeatureFieldV43(canvasWidth, canvasHeight, 320);
  const ranked = [];
  for (let y = 0; y < field.rows; y++) {
    for (let x = 0; x < field.cols; x++) {
      const i = y * field.cols + x, d = field.rho[i];
      if (!(d > 0)) continue;
      const threshold = (TSP42_BAYER8[(y & 7) * 8 + (x & 7)] + 0.5) / 64;
      const patternScale = 0.5 + clamp(currentTspDitherPattern, 0, 100) / 100; // 50 preserves RC90/RC43 neutral behavior.
      ranked.push({ i, score: d - threshold * patternScale, d });
    }
  }
  ranked.sort((a, b) => b.score - a.score || b.d - a.d || a.i - b.i);
  const n = Math.min(targetPointCount, ranked.length);
  const cellW = canvasWidth / field.cols, cellH = canvasHeight / field.rows;
  const points = new Array(n);
  for (let p = 0; p < n; p++) {
    const i = ranked[p].i, x = i % field.cols, y = Math.floor(i / field.cols);
    points[p] = { x: (x + 0.5) * cellW, y: (y + 0.5) * cellH, weight: ranked[p].d };
  }
  return points;
}

function buildClassicMarilynGridCities(canvasWidth, canvasHeight, targetPointCount) {
  // Use the original RC43 feature anchor approach with improved calibration
  const toneCtl = clamp(currentTspClassicToneSupport, 0, 160) / 100;
  const featureCtl = clamp(50, 0, 100) / 100; // Use neutral feature detail
  const supportShare = clamp(0.22 * toneCtl + 0.12 * (1 - featureCtl), 0, 0.34);
  const featureBias = 0.70 + 0.30 * featureCtl;
  const supportBias = 1.00 - 0.22 * featureCtl;

  if (supportShare <= 1e-9) {
    return buildFeatureAnchorPoints(canvasWidth, canvasHeight, targetPointCount);
  }

  const supportCount = Math.round(targetPointCount * supportShare);
  const featureCount = Math.max(0, targetPointCount - supportCount);
  const featurePoints = buildFeatureAnchorPoints(canvasWidth, canvasHeight, Math.max(0, Math.round(featureCount * featureBias)));
  const supportPoints = buildSingleLineSupportPoints(canvasWidth, canvasHeight, Math.max(0, Math.round(supportCount * supportBias)));
  const points = featurePoints.concat(supportPoints);

  if (points.length > targetPointCount) {
    points.length = targetPointCount;
  }

  return points;
}

function buildSingleLineCities(canvasWidth, canvasHeight, targetPointCount) {
  switch (currentSingleLineVariant) {
    case 'voronoi': return buildVoronoiOrganicCitiesV43(canvasWidth, canvasHeight, targetPointCount);
    case 'dithered': return buildDitheredMazeCitiesV43(canvasWidth, canvasHeight, targetPointCount);
    case 'textured': return buildTexturedCitiesV43(canvasWidth, canvasHeight, targetPointCount);
    case 'classic':
    default: return buildClassicMarilynCitiesV43(canvasWidth, canvasHeight, targetPointCount);
  }
}

function findKNearest(points, canvasWidth, canvasHeight, k = 24) {
  const buckets = buildPointBuckets(points, canvasWidth, canvasHeight, 1.9);
  const out = new Array(points.length);
  const { bucketSize, bucketCols, bucketRows } = buckets;

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const cx = clamp(Math.floor(p.x / bucketSize), 0, bucketCols - 1);
    const cy = clamp(Math.floor(p.y / bucketSize), 0, bucketRows - 1);
    const found = [];
    const maxRing = Math.max(bucketCols, bucketRows);
    for (let r = 0; r <= maxRing; r++) {
      const minX = Math.max(0, cx - r), maxX = Math.min(bucketCols - 1, cx + r);
      const minY = Math.max(0, cy - r), maxY = Math.min(bucketRows - 1, cy + r);
      for (let by = minY; by <= maxY; by++) {
        for (let bx = minX; bx <= maxX; bx++) {
          if (r > 0 && bx !== minX && bx !== maxX && by !== minY && by !== maxY) continue;
          const arr = buckets.buckets[by * bucketCols + bx];
          if (!arr) continue;
          for (let q = 0; q < arr.length; q++) {
            const j = arr[q];
            if (j === i) continue;
            const dx = points[j].x - p.x;
            const dy = points[j].y - p.y;
            found.push({ j, d2: dx * dx + dy * dy });
          }
        }
      }
      if (found.length >= k * 2 || (found.length >= k && r >= 2)) break;
    }
    found.sort((a, b) => a.d2 - b.d2);
    out[i] = found.slice(0, k).map(v => v.j);
  }
  return out;
}

function dsuCreate(n) {
  const parent = new Int32Array(n);
  const size = new Int32Array(n);
  for (let i = 0; i < n; i++) { parent[i] = i; size[i] = 1; }
  function find(a) {
    let r = a;
    while (parent[r] !== r) r = parent[r];
    while (parent[a] !== a) { const next = parent[a]; parent[a] = r; a = next; }
    return r;
  }
  function union(a, b) {
    a = find(a); b = find(b);
    if (a === b) return false;
    if (size[a] < size[b]) { const t = a; a = b; b = t; }
    parent[b] = a;
    size[a] += size[b];
    return true;
  }
  return { find, union };
}

function addPathEdge(a, b, degree, adjA, adjB, dsu) {
  if (a === b || degree[a] >= 2 || degree[b] >= 2) return false;
  if (dsu.find(a) === dsu.find(b)) return false;
  if (!dsu.union(a, b)) return false;
  if (adjA[a] < 0) adjA[a] = b; else adjB[a] = b;
  if (adjA[b] < 0) adjA[b] = a; else adjB[b] = a;
  degree[a]++;
  degree[b]++;
  return true;
}

function buildMultiFragmentPath(points, canvasWidth, canvasHeight) {
  const n = points.length;
  if (n < 2) return points.map((_, i) => i);
  const k = n > 25000 ? 30 : 52;
  const neighbors = findKNearest(points, canvasWidth, canvasHeight, k);
  const edges = [];
  for (let i = 0; i < n; i++) {
    for (let q = 0; q < neighbors[i].length; q++) {
      const j = neighbors[i][q];
      if (j <= i) continue;
      const dx = points[j].x - points[i].x;
      const dy = points[j].y - points[i].y;
      edges.push({ a: i, b: j, d2: dx * dx + dy * dy });
    }
  }
  edges.sort((a, b) => a.d2 - b.d2);

  const degree = new Uint8Array(n);
  const adjA = new Int32Array(n); adjA.fill(-1);
  const adjB = new Int32Array(n); adjB.fill(-1);
  const dsu = dsuCreate(n);
  let usedEdges = 0;

  for (let e = 0; e < edges.length && usedEdges < n - 1; e++) {
    if (addPathEdge(edges[e].a, edges[e].b, degree, adjA, adjB, dsu)) usedEdges++;
  }

  // If local candidates leave multiple path fragments, connect component
  // endpoints in batched nearest-neighbour passes.  RC26 avoids the previous
  // O(E^2) all-endpoint scan, which could stall the browser at 18k cities.
  let bridgeK = 16;
  for (let pass = 0; usedEdges < n - 1 && pass < 7; pass++) {
    const endpointIds = [];
    const endpointPoints = [];
    for (let i = 0; i < n; i++) {
      if (degree[i] < 2) {
        endpointIds.push(i);
        endpointPoints.push(points[i]);
      }
    }
    if (endpointIds.length < 2) break;

    const k = Math.min(endpointIds.length - 1, bridgeK);
    const near = findKNearest(endpointPoints, canvasWidth, canvasHeight, Math.max(1, k));
    const bridgeEdges = [];
    for (let ei = 0; ei < endpointIds.length; ei++) {
      const a = endpointIds[ei];
      for (let q = 0; q < near[ei].length; q++) {
        const ej = near[ei][q];
        if (ej <= ei) continue;
        const b = endpointIds[ej];
        if (dsu.find(a) === dsu.find(b)) continue;
        const dx = points[b].x - points[a].x;
        const dy = points[b].y - points[a].y;
        bridgeEdges.push({ a, b, d2: dx * dx + dy * dy });
      }
    }
    bridgeEdges.sort((a, b) => a.d2 - b.d2);
    let added = 0;
    for (let e = 0; e < bridgeEdges.length && usedEdges < n - 1; e++) {
      if (addPathEdge(bridgeEdges[e].a, bridgeEdges[e].b, degree, adjA, adjB, dsu)) {
        usedEdges++;
        added++;
      }
    }
    if (added === 0) bridgeK *= 3;
    else bridgeK = Math.min(bridgeK * 2, 256);
  }

  // Extremely defensive final merge.  Normally the batched endpoint passes
  // complete the Hamiltonian path.  If not, connect one endpoint component to
  // the nearest endpoint of another component using a bounded expanding scan.
  while (usedEdges < n - 1) {
    const endpoints = [];
    for (let i = 0; i < n; i++) if (degree[i] < 2) endpoints.push(i);
    if (endpoints.length < 2) break;
    let bestA = -1, bestB = -1, bestD2 = Infinity;
    const sampleStride = Math.max(1, Math.floor(endpoints.length / 512));
    for (let ii = 0; ii < endpoints.length; ii += sampleStride) {
      const a = endpoints[ii];
      const ra = dsu.find(a);
      for (let jj = 0; jj < endpoints.length; jj += sampleStride) {
        const b = endpoints[jj];
        if (a === b || ra === dsu.find(b)) continue;
        const dx = points[b].x - points[a].x;
        const dy = points[b].y - points[a].y;
        const d2 = dx * dx + dy * dy;
        if (d2 < bestD2) { bestD2 = d2; bestA = a; bestB = b; }
      }
    }
    if (bestA < 0 || !addPathEdge(bestA, bestB, degree, adjA, adjB, dsu)) break;
    usedEdges++;
  }

  let start = 0;
  for (let i = 0; i < n; i++) if (degree[i] === 1) { start = i; break; }
  const order = new Array(n);
  let prev = -1, cur = start;
  for (let pos = 0; pos < n; pos++) {
    order[pos] = cur;
    const a = adjA[cur], b = adjB[cur];
    const next = a !== prev && a >= 0 ? a : (b !== prev && b >= 0 ? b : -1);
    prev = cur;
    if (next < 0) {
      if (pos !== n - 1) {
        // Defensive fallback: append any unvisited vertices.
        const seen = new Uint8Array(n);
        for (let q = 0; q <= pos; q++) seen[order[q]] = 1;
        let w = pos + 1;
        for (let i = 0; i < n; i++) if (!seen[i]) order[w++] = i;
      }
      break;
    }
    cur = next;
  }
  return order;
}

function reverseOrderSegment(order, start, end) {
  while (start < end) {
    const t = order[start];
    order[start] = order[end];
    order[end] = t;
    start++; end--;
  }
}

function improvePath2Opt(points, order, canvasWidth, canvasHeight) {
  const n = order.length;
  if (n < 4) return order;
  const neighbors = findKNearest(points, canvasWidth, canvasHeight, n > 25000 ? 24 : 44);
  const pos = new Int32Array(n);
  for (let i = 0; i < n; i++) pos[order[i]] = i;
  const dist = (a, b) => Math.hypot(points[a].x - points[b].x, points[a].y - points[b].y);

  for (let pass = 0; pass < 6; pass++) {
    let changes = 0;
    const maxChanges = n > 25000 ? 3000 : 6000;
    for (let i = 0; i < n - 3 && changes < maxChanges; i++) {
      const a = order[i], b = order[i + 1];
      const oldAB = dist(a, b);
      let bestJ = -1, bestDelta = -1e-5;
      const cand = neighbors[a];
      for (let q = 0; q < cand.length; q++) {
        const j = pos[cand[q]];
        if (j <= i + 1 || j >= n - 1) continue;
        const c = order[j], d = order[j + 1];
        const delta = dist(a, c) + dist(b, d) - oldAB - dist(c, d);
        if (delta < bestDelta) { bestDelta = delta; bestJ = j; }
      }
      if (bestJ >= 0) {
        reverseOrderSegment(order, i + 1, bestJ);
        for (let q = i + 1; q <= bestJ; q++) pos[order[q]] = q;
        changes++;
      }
    }
    if (changes === 0) break;
  }
  return order;
}

function improveCycle2Opt(points, order, canvasWidth, canvasHeight, sharedNeighbors = null, maxPasses = 9) {
  const n = order.length;
  if (n < 4) return order;

  // Candidate-based cyclic 2-opt: unlike the older open-path pass, this also
  // optimizes the endpoint closure.  That matters because a TSP tour is a
  // cycle; optimizing it as a cycle first prevents a late, giant bridge from
  // becoming baked into the portrait.  We cut the worst cycle edge only after
  // the complete tour has settled.
  const neighbors = sharedNeighbors || findKNearest(points, canvasWidth, canvasHeight, n > 26000 ? 44 : 80);
  const pos = new Int32Array(n);
  for (let i = 0; i < n; i++) pos[order[i]] = i;
  const dist = (a, b) => Math.hypot(points[a].x - points[b].x, points[a].y - points[b].y);

  for (let pass = 0; pass < maxPasses; pass++) {
    let changes = 0;
    const maxChanges = n > 26000 ? 5000 : 12000;
    for (let i = 0; i < n && changes < maxChanges; i++) {
      const a = order[i];
      const b = order[(i + 1) % n];
      const oldAB = dist(a, b);
      const cand = neighbors[a];
      let bestU = -1, bestV = -1, bestDelta = -1e-6;

      for (let q = 0; q < cand.length; q++) {
        const j = pos[cand[q]];
        if (j === i) continue;
        const u = Math.min(i, j);
        const v = Math.max(i, j);
        // Adjacent cycle edges cannot produce a useful 2-opt move.
        if (v === u + 1 || (u === 0 && v === n - 1)) continue;
        const c = order[j];
        const d = order[(j + 1) % n];
        const delta = dist(a, c) + dist(b, d) - oldAB - dist(c, d);
        if (delta < bestDelta) {
          bestDelta = delta;
          bestU = u;
          bestV = v;
        }
      }

      if (bestU >= 0) {
        reverseOrderSegment(order, bestU + 1, bestV);
        for (let q = bestU + 1; q <= bestV; q++) pos[order[q]] = q;
        changes++;
      }
    }
    if (changes === 0) break;
  }
  return order;
}

function repairCycleLongBridges(points, order) {
  const n = order.length;
  if (n < 5) return order;
  const dist = (a, b) => Math.hypot(points[a].x - points[b].x, points[a].y - points[b].y);

  const lengths = new Array(n);
  for (let i = 0; i < n; i++) lengths[i] = dist(order[i], order[(i + 1) % n]);
  const sorted = lengths.slice().sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] || 0;
  const threshold = Math.max(4, median * 3.15);

  // Target only conspicuous bridges.  For each one, search the entire cycle
  // for the best legal 2-opt reconnection.  This is intentionally more
  // expensive than the normal candidate pass, but it runs on only the worst
  // few edges and has a large visual payoff on sparse highlights/skin.
  for (let repair = 0; repair < 180; repair++) {
    let iLongest = -1;
    let longest = threshold;
    for (let i = 0; i < n; i++) {
      const len = dist(order[i], order[(i + 1) % n]);
      if (len > longest) { longest = len; iLongest = i; }
    }
    if (iLongest < 0) break;

    let bestU = -1, bestV = -1, bestDelta = -1e-6;
    for (let j = 0; j < n; j++) {
      if (j === iLongest) continue;
      const u = Math.min(iLongest, j);
      const v = Math.max(iLongest, j);
      if (v === u + 1 || (u === 0 && v === n - 1)) continue;
      const a = order[u], b = order[(u + 1) % n];
      const c = order[v], d = order[(v + 1) % n];
      const delta = dist(a, c) + dist(b, d) - dist(a, b) - dist(c, d);
      if (delta < bestDelta) { bestDelta = delta; bestU = u; bestV = v; }
    }
    if (bestU < 0) break;
    reverseOrderSegment(order, bestU + 1, bestV);
  }
  return order;
}

function cutWorstCycleEdge(points, order) {
  const n = order.length;
  if (n < 2) return order;
  let cut = n - 1;
  let worst = -1;
  for (let i = 0; i < n; i++) {
    const a = points[order[i]], b = points[order[(i + 1) % n]];
    const len = Math.hypot(a.x - b.x, a.y - b.y);
    if (len > worst) { worst = len; cut = i; }
  }
  if (cut === n - 1) return order;
  return order.slice(cut + 1).concat(order.slice(0, cut + 1));
}

function medianSegmentLength(points, order) {
  const lengths = new Float64Array(Math.max(0, order.length - 1));
  for (let i = 0; i < lengths.length; i++) {
    const a = points[order[i]], b = points[order[i + 1]];
    lengths[i] = Math.hypot(a.x - b.x, a.y - b.y);
  }
  if (!lengths.length) return 0;
  const copy = Array.from(lengths).sort((a, b) => a - b);
  return copy[Math.floor(copy.length / 2)];
}

function repairLongBridges(points, order) {
  const n = order.length;
  if (n < 5) return order;
  const dist = (a, b) => Math.hypot(points[a].x - points[b].x, points[a].y - points[b].y);
  const median = medianSegmentLength(points, order);
  const threshold = Math.max(5, median * 4.0);
  const maxRepairs = 96;

  for (let repair = 0; repair < maxRepairs; repair++) {
    let iLongest = -1, longest = threshold;
    for (let i = 0; i < n - 1; i++) {
      const len = dist(order[i], order[i + 1]);
      if (len > longest) { longest = len; iLongest = i; }
    }
    if (iLongest < 0) break;

    const a = order[iLongest], b = order[iLongest + 1];
    const oldAB = dist(a, b);
    let bestJ = -1, bestDelta = -1e-4;
    for (let j = 0; j < n - 1; j++) {
      if (Math.abs(j - iLongest) <= 1) continue;
      const c = order[j], d = order[j + 1];
      const delta = dist(a, c) + dist(b, d) - oldAB - dist(c, d);
      if (delta < bestDelta) { bestDelta = delta; bestJ = j; }
    }
    if (bestJ < 0) break;

    if (iLongest < bestJ) reverseOrderSegment(order, iLongest + 1, bestJ);
    else reverseOrderSegment(order, bestJ + 1, iLongest);
  }
  return order;
}


function optimizeCycleAndCut(points, order) {
  const n = order.length;
  if (n < 5) return order;
  const dist = (a, b) => Math.hypot(points[a].x - points[b].x, points[a].y - points[b].y);
  const cycleLengths = new Float64Array(n);
  for (let i = 0; i < n; i++) cycleLengths[i] = dist(order[i], order[(i + 1) % n]);
  const sorted = Array.from(cycleLengths).sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const threshold = Math.max(6, median * 3.5);

  // Treat the open path temporarily as a cycle. Repairing the artificial
  // endpoint closure lets 2-opt redistribute bad bridges globally; afterward
  // we cut the single worst remaining cycle edge to regain one open stroke.
  for (let repair = 0; repair < 120; repair++) {
    let longEdge = -1;
    let longLen = threshold;
    for (let i = 0; i < n; i++) {
      const len = dist(order[i], order[(i + 1) % n]);
      if (len > longLen) { longLen = len; longEdge = i; }
    }
    if (longEdge < 0) break;

    let bestU = -1, bestV = -1, bestDelta = -1e-6;
    for (let j = 0; j < n; j++) {
      if (j === longEdge) continue;
      const u = Math.min(longEdge, j);
      const v = Math.max(longEdge, j);
      if (v === u + 1 || (u === 0 && v === n - 1)) continue;
      const a = order[u], b = order[u + 1];
      const c = order[v], d = order[(v + 1) % n];
      const delta = dist(a, c) + dist(b, d) - dist(a, b) - dist(c, d);
      if (delta < bestDelta) { bestDelta = delta; bestU = u; bestV = v; }
    }
    if (bestU < 0) break;
    reverseOrderSegment(order, bestU + 1, bestV);
  }

  let cut = 0;
  let worst = -1;
  for (let i = 0; i < n; i++) {
    const len = dist(order[i], order[(i + 1) % n]);
    if (len > worst) { worst = len; cut = i; }
  }
  if (cut === n - 1) return order;
  return order.slice(cut + 1).concat(order.slice(0, cut + 1));
}

function cycleTourLength(points, order) {
  let total = 0;
  const n = order.length;
  for (let i = 0; i < n; i++) {
    const a = points[order[i]], b = points[order[(i + 1) % n]];
    total += Math.hypot(a.x - b.x, a.y - b.y);
  }
  return total;
}

function improveCycleOrOpt1(points, order, canvasWidth, canvasHeight, sharedNeighbors = null, maxPasses = 3) {
  const n = order.length;
  if (n < 6) return order;
  const neighbors = sharedNeighbors || findKNearest(points, canvasWidth, canvasHeight, n > 26000 ? 40 : 72);
  const pos = new Int32Array(n);
  for (let i = 0; i < n; i++) pos[order[i]] = i;
  const dist = (a, b) => Math.hypot(points[a].x - points[b].x, points[a].y - points[b].y);

  for (let pass = 0; pass < maxPasses; pass++) {
    let moves = 0;
    const maxMoves = n > 26000 ? 700 : 1400;
    for (let scan = 0; scan < n && moves < maxMoves; scan++) {
      const i = scan;
      const b = order[i];
      const prev = order[(i - 1 + n) % n];
      const next = order[(i + 1) % n];
      const removalDelta = dist(prev, next) - dist(prev, b) - dist(b, next);
      let bestJ = -1;
      let bestDelta = -1e-5;
      const cand = neighbors[b];

      for (let q = 0; q < cand.length; q++) {
        const cp = pos[cand[q]];
        const edgeStarts = [cp, (cp - 1 + n) % n];
        for (let z = 0; z < 2; z++) {
          const j = edgeStarts[z];
          const c = order[j], d = order[(j + 1) % n];
          if (c === b || d === b || c === prev || d === next) continue;
          const delta = removalDelta + dist(c, b) + dist(b, d) - dist(c, d);
          if (delta < bestDelta) {
            bestDelta = delta;
            bestJ = j;
          }
        }
      }

      if (bestJ >= 0) {
        const vertex = order[i];
        order.splice(i, 1);
        let j = bestJ;
        if (j > i) j--;
        const insertAt = j + 1;
        order.splice(insertAt, 0, vertex);
        const lo = Math.min(i, insertAt), hi = Math.max(i, insertAt);
        for (let q = lo; q <= hi; q++) pos[order[q]] = q;
        moves++;
      }
    }
    if (moves === 0) break;
  }
  return order;
}


function improveCycleOrOptSegment(points, order, canvasWidth, canvasHeight, segmentLength, sharedNeighbors = null, maxPasses = 2) {
  const n = order.length;
  if (n < segmentLength + 5 || segmentLength < 2 || segmentLength > 3) return order;
  const neighbors = sharedNeighbors || findKNearest(points, canvasWidth, canvasHeight, n > 26000 ? 40 : 72);
  const pos = new Int32Array(n);
  for (let i = 0; i < n; i++) pos[order[i]] = i;
  const dist = (a, b) => Math.hypot(points[a].x - points[b].x, points[a].y - points[b].y);

  for (let pass = 0; pass < maxPasses; pass++) {
    let moves = 0;
    const maxMoves = n > 26000 ? 450 : 1000;
    for (let i = 0; i < n && moves < maxMoves; i++) {
      const end = (i + segmentLength - 1) % n;
      // Keep this move simple and deterministic: do not relocate a segment
      // that wraps over the array boundary. The cycle itself is still handled
      // correctly by prev/next indices.
      if (i + segmentLength > n) break;

      const first = order[i];
      const last = order[end];
      const prev = order[(i - 1 + n) % n];
      const next = order[(end + 1) % n];
      const removalDelta = dist(prev, next) - dist(prev, first) - dist(last, next);
      let bestJ = -1;
      let bestReverse = false;
      let bestDelta = -1e-5;

      // Candidate insertion edges come from neighbors of both segment ends.
      const firstCandidates = neighbors[first];
      const lastCandidates = neighbors[last];
      const candidateTotal = firstCandidates.length + lastCandidates.length;
      for (let q = 0; q < candidateTotal; q++) {
        const candidateVertex = q < firstCandidates.length ? firstCandidates[q] : lastCandidates[q - firstCandidates.length];
        const cp = pos[candidateVertex];
        const edgeStarts = [cp, (cp - 1 + n) % n];
        for (let z = 0; z < 2; z++) {
          const j = edgeStarts[z];
          const c = order[j], d = order[(j + 1) % n];
          // Target edge may not touch or fall inside the moving segment.
          let illegal = false;
          for (let t = 0; t < segmentLength; t++) {
            const v = order[i + t];
            if (c === v || d === v) { illegal = true; break; }
          }
          if (illegal || c === prev || d === next) continue;

          const forward = removalDelta + dist(c, first) + dist(last, d) - dist(c, d);
          if (forward < bestDelta) {
            bestDelta = forward;
            bestJ = j;
            bestReverse = false;
          }
          const reversed = removalDelta + dist(c, last) + dist(first, d) - dist(c, d);
          if (reversed < bestDelta) {
            bestDelta = reversed;
            bestJ = j;
            bestReverse = true;
          }
        }
      }

      if (bestJ >= 0) {
        let segment = order.splice(i, segmentLength);
        if (bestReverse) segment.reverse();
        let j = bestJ;
        if (j >= i + segmentLength) j -= segmentLength;
        else if (j >= i) continue; // Defensive: target was inside removed range.
        const insertAt = j + 1;
        order.splice(insertAt, 0, ...segment);
        const lo = Math.min(i, insertAt);
        const hi = Math.min(n - 1, Math.max(i + segmentLength, insertAt + segmentLength));
        for (let q = lo; q <= hi; q++) pos[order[q]] = q;
        moves++;
      }
    }
    if (moves === 0) break;
    // Full refresh after a pass avoids subtle stale-position errors after many
    // segment relocations.
    for (let i = 0; i < n; i++) pos[order[i]] = i;
  }
  return order;
}

function orient2d(a, b, c) {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

function properSegmentsIntersect(a, b, c, d) {
  const o1 = orient2d(a, b, c);
  const o2 = orient2d(a, b, d);
  const o3 = orient2d(c, d, a);
  const o4 = orient2d(c, d, b);
  // Ignore collinear/touching cases; those do not create the visually bad
  // Euclidean crossings this cleanup is intended to remove.
  return ((o1 > 0 && o2 < 0) || (o1 < 0 && o2 > 0)) &&
         ((o3 > 0 && o4 < 0) || (o3 < 0 && o4 > 0));
}

function uncrossLongestCycleEdges(points, order, maxRepairs = 80) {
  const n = order.length;
  if (n < 6) return order;
  const dist = (a, b) => Math.hypot(points[a].x - points[b].x, points[a].y - points[b].y);
  let repaired = 0;

  // Batch the crossing search. Recomputing and sorting all 18k edge lengths
  // after every single repair was needlessly expensive; a short batch keeps
  // the same visual benefit while remaining practical in a browser extension.
  for (let pass = 0; pass < 5 && repaired < maxRepairs; pass++) {
    const lengths = new Array(n);
    for (let i = 0; i < n; i++) {
      lengths[i] = { i, len: dist(order[i], order[(i + 1) % n]) };
    }
    lengths.sort((a, b) => b.len - a.len);
    const examine = Math.min(n, 120);
    let passChanges = 0;

    for (let rank = 0; rank < examine && repaired < maxRepairs; rank++) {
      const i = lengths[rank].i;
      const aIdx = order[i], bIdx = order[(i + 1) % n];
      const a = points[aIdx], b = points[bIdx];
      const minAx = Math.min(a.x, b.x), maxAx = Math.max(a.x, b.x);
      const minAy = Math.min(a.y, b.y), maxAy = Math.max(a.y, b.y);

      for (let j = 0; j < n; j++) {
        if (j === i || (j + 1) % n === i || (i + 1) % n === j) continue;
        const cIdx = order[j], dIdx = order[(j + 1) % n];
        const c = points[cIdx], d = points[dIdx];
        if (Math.max(c.x, d.x) < minAx || Math.min(c.x, d.x) > maxAx ||
            Math.max(c.y, d.y) < minAy || Math.min(c.y, d.y) > maxAy) continue;
        if (!properSegmentsIntersect(a, b, c, d)) continue;

        const u = Math.min(i, j);
        const v = Math.max(i, j);
        if (v === u + 1 || (u === 0 && v === n - 1)) continue;
        reverseOrderSegment(order, u + 1, v);
        repaired++;
        passChanges++;
        break;
      }
      // Rebuild edge ranking after a handful of reversals; beyond this point
      // the old ranking is no longer a useful description of the current tour.
      if (passChanges >= 16) break;
    }
    if (passChanges === 0) break;
  }
  return order;
}

function cycleTourQuality(points, order) {
  const n = order.length;
  if (!n) return Infinity;
  const lengths = new Array(n);
  let total = 0;
  for (let i = 0; i < n; i++) {
    const a = points[order[i]], b = points[order[(i + 1) % n]];
    const len = Math.hypot(a.x - b.x, a.y - b.y);
    lengths[i] = len;
    total += len;
  }
  const sorted = lengths.slice().sort((a, b) => a - b);
  const median = sorted[Math.floor(n / 2)] || 1;
  const threshold = Math.max(3.5, median * 2.75);
  let excess = 0;
  for (let i = 0; i < n; i++) {
    if (lengths[i] > threshold) excess += lengths[i] - threshold;
  }
  // Total distance still dominates, but conspicuous bridge edges are expensive
  // because they are especially damaging in line art.
  return total + excess * 2.75;
}

function doubleBridgeKick(order, seed) {
  const n = order.length;
  if (n < 12) return order.slice();
  const rng = createSeededRng(seed >>> 0);
  const quarter = Math.floor(n / 4);
  const jitter = Math.max(2, Math.floor(quarter * 0.35));
  const a = clamp(Math.floor(quarter * 0.55 + rng() * jitter), 1, n - 9);
  const b = clamp(Math.floor(quarter * 1.45 + rng() * jitter), a + 2, n - 6);
  const c = clamp(Math.floor(quarter * 2.45 + rng() * jitter), b + 2, n - 3);
  // A B C D -> A C B D, the classic double-bridge 4-opt perturbation.
  return order.slice(0, a)
    .concat(order.slice(b, c))
    .concat(order.slice(a, b))
    .concat(order.slice(c));
}

function chainedCycleLocalSearch(points, baseOrder, canvasWidth, canvasHeight) {
  const n = baseOrder.length;
  const candidateCount = n > 26000 ? 52 : 88;
  const neighbors = findKNearest(points, canvasWidth, canvasHeight, candidateCount);

  function polish(seedOrder, heavy = true) {
    let tour = seedOrder.slice();
    improveCycle2Opt(points, tour, canvasWidth, canvasHeight, neighbors, heavy ? 8 : 4);
    improveCycleOrOpt1(points, tour, canvasWidth, canvasHeight, neighbors, heavy ? 2 : 1);
    improveCycleOrOptSegment(points, tour, canvasWidth, canvasHeight, 2, neighbors, 1);
    improveCycleOrOptSegment(points, tour, canvasWidth, canvasHeight, 3, neighbors, 1);
    improveCycle2Opt(points, tour, canvasWidth, canvasHeight, neighbors, heavy ? 5 : 3);
    uncrossLongestCycleEdges(points, tour, heavy ? 80 : 40);
    repairCycleLongBridges(points, tour);
    improveCycle2Opt(points, tour, canvasWidth, canvasHeight, neighbors, 4);
    return tour;
  }

  let best = polish(baseOrder, true);
  let bestScore = cycleTourQuality(points, best);

  // Chained double-bridge restarts escape local minima. RC13 compares tours
  // with a bridge-aware quality score rather than raw length alone so the
  // visible one-line drawing does not trade a few huge traversals for a tiny
  // reduction in total distance.
  const restarts = 1;
  for (let chain = 0; chain < restarts; chain++) {
    const kicked = doubleBridgeKick(best, hashString(`rc13-kick-${chain}-${points.length}`));
    const trial = polish(kicked, false);
    const score = cycleTourQuality(points, trial);
    if (score < bestScore) {
      best = trial;
      bestScore = score;
    }
  }

  // Final hard cleanup of geometric crossings and visually conspicuous bridges.
  uncrossLongestCycleEdges(points, best, 96);
  repairCycleLongBridges(points, best);
  improveCycle2Opt(points, best, canvasWidth, canvasHeight, neighbors, 4);
  return best;
}


function buildNearestNeighborCycle(points, canvasWidth, canvasHeight, neighbors = null) {
  const n = points.length;
  if (n < 2) return points.map((_, i) => i);
  const cand = neighbors || findKNearest(points, canvasWidth, canvasHeight, 40);
  const visited = new Uint8Array(n);
  const order = new Array(n);

  // Deterministic left-most start avoids seed-to-seed visual drift.
  let current = 0;
  let bestStart = Infinity;
  for (let i = 0; i < n; i++) {
    const score = points[i].x + points[i].y * 0.08;
    if (score < bestStart) { bestStart = score; current = i; }
  }

  order[0] = current;
  visited[current] = 1;
  for (let pos = 1; pos < n; pos++) {
    let next = -1;
    let bestD2 = Infinity;
    const list = cand[current];
    for (let q = 0; q < list.length; q++) {
      const j = list[q];
      if (visited[j]) continue;
      const dx = points[j].x - points[current].x;
      const dy = points[j].y - points[current].y;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestD2) { bestD2 = d2; next = j; }
    }

    // Candidate exhaustion is rare; a full scan is preferable to a random
    // jump because a single bad bridge is visually obvious in TSP artwork.
    if (next < 0) {
      for (let j = 0; j < n; j++) {
        if (visited[j]) continue;
        const dx = points[j].x - points[current].x;
        const dy = points[j].y - points[current].y;
        const d2 = dx * dx + dy * dy;
        if (d2 < bestD2) { bestD2 = d2; next = j; }
      }
    }

    if (next < 0) break;
    order[pos] = next;
    visited[next] = 1;
    current = next;
  }
  return order;
}

function repairTopLongestCycleEdges(points, order, maxRepairs = 100) {
  const n = order.length;
  if (n < 6) return order;
  const dist = (a, b) => Math.hypot(points[a].x - points[b].x, points[a].y - points[b].y);

  for (let repair = 0; repair < maxRepairs; repair++) {
    const edgeInfo = new Array(n);
    const lengths = new Array(n);
    for (let i = 0; i < n; i++) {
      const len = dist(order[i], order[(i + 1) % n]);
      edgeInfo[i] = { i, len };
      lengths[i] = len;
    }
    const sortedLens = lengths.slice().sort((a, b) => a - b);
    const median = sortedLens[Math.floor(n / 2)] || 1;
    const threshold = Math.max(4, median * 2.70);
    edgeInfo.sort((a, b) => b.len - a.len);

    let changed = false;
    const examine = Math.min(60, n);
    for (let rank = 0; rank < examine; rank++) {
      const i = edgeInfo[rank].i;
      if (edgeInfo[rank].len <= threshold) break;
      const a = order[i];
      const b = order[(i + 1) % n];
      const oldAB = edgeInfo[rank].len;
      const oldPenaltyAB = Math.max(0, oldAB - threshold);
      let bestU = -1, bestV = -1, bestScore = -1e-6;

      for (let j = 0; j < n; j++) {
        if (j === i) continue;
        const u = Math.min(i, j);
        const v = Math.max(i, j);
        if (v === u + 1 || (u === 0 && v === n - 1)) continue;
        const c = order[j];
        const d = order[(j + 1) % n];
        const oldCD = dist(c, d);
        const newAC = dist(a, c);
        const newBD = dist(b, d);
        const lengthDelta = newAC + newBD - oldAB - oldCD;
        const oldPenalty = oldPenaltyAB + Math.max(0, oldCD - threshold);
        const newPenalty = Math.max(0, newAC - threshold) + Math.max(0, newBD - threshold);
        // Artistic bridge-aware 2-opt: a tiny increase in total tour length is
        // acceptable when it removes a conspicuous straight bridge.  This is
        // still a TSP tour; only the local-search objective is visually aware.
        const score = lengthDelta + 2.8 * (newPenalty - oldPenalty);
        if (score < bestScore) {
          bestScore = score;
          bestU = u;
          bestV = v;
        }
      }

      if (bestU >= 0) {
        reverseOrderSegment(order, bestU + 1, bestV);
        changed = true;
        break;
      }
    }
    if (!changed) break;
  }
  return order;
}

function repairTopLongestOpenEdges(points, order, maxRepairs = 180) {
  const n = order.length;
  if (n < 6) return order;
  const dist = (a, b) => Math.hypot(points[a].x - points[b].x, points[a].y - points[b].y);

  // RC26: treat unusually long open-path bridges as an artistic defect, not
  // merely a small contribution to total tour length.  Sparse portrait areas
  // should stay light; a handful of long straight edges must not paint across
  // them and turn the result into large polygonal maze cells.
  for (let repair = 0; repair < maxRepairs; repair++) {
    const lengths = new Array(n - 1);
    const ranked = new Array(n - 1);
    for (let i = 0; i < n - 1; i++) {
      const len = dist(order[i], order[i + 1]);
      lengths[i] = len;
      ranked[i] = { i, len };
    }
    const sorted = lengths.slice().sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)] || 1;
    const p90 = sorted[Math.floor(sorted.length * 0.90)] || median;
    const threshold = Math.max(3.25, Math.min(median * 2.20, p90 * 1.35));
    ranked.sort((a, b) => b.len - a.len);
    let changed = false;

    const bridgePenalty = (len) => {
      if (len <= threshold) return 0;
      const e = (len - threshold) / Math.max(1e-6, threshold);
      return threshold * (e + 1.8 * e * e);
    };

    const examine = Math.min(64, ranked.length);
    for (let rank = 0; rank < examine; rank++) {
      const i = ranked[rank].i;
      if (ranked[rank].len <= threshold) break;
      const a = order[i], b = order[i + 1];
      const oldAB = ranked[rank].len;
      let bestJ = -1, bestScore = -1e-6;

      for (let j = 0; j < n - 1; j++) {
        if (Math.abs(j - i) <= 1) continue;
        const c = order[j], d = order[j + 1];
        const oldCD = dist(c, d);
        const newAC = dist(a, c);
        const newBD = dist(b, d);
        const oldPenalty = bridgePenalty(oldAB) + bridgePenalty(oldCD);
        const newPenalty = bridgePenalty(newAC) + bridgePenalty(newBD);
        const lengthDelta = newAC + newBD - oldAB - oldCD;
        // Strongly prefer removing a visible bridge even if total route length
        // grows slightly.  This remains one Hamiltonian stroke through all
        // cities, but preserves the tonal intent of the stipple cloud.
        const score = lengthDelta + 8.0 * (newPenalty - oldPenalty);
        if (score < bestScore) { bestScore = score; bestJ = j; }
      }

      if (bestJ >= 0) {
        if (i < bestJ) reverseOrderSegment(order, i + 1, bestJ);
        else reverseOrderSegment(order, bestJ + 1, i);
        changed = true;
        break;
      }
    }
    if (!changed) break;
  }
  return order;
}

function openPathQuality(points, order) {
  const n = order.length;
  if (n < 2) return 0;
  const lengths = new Array(n - 1);
  let total = 0;
  for (let i = 0; i < n - 1; i++) {
    const a = points[order[i]], b = points[order[i + 1]];
    const len = Math.hypot(a.x - b.x, a.y - b.y);
    lengths[i] = len;
    total += len;
  }
  const sorted = lengths.slice().sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] || 1;
  const threshold = Math.max(3.25, median * 2.20);
  let excess = 0;
  let squared = 0;
  for (let i = 0; i < lengths.length; i++) {
    const e = Math.max(0, lengths[i] - threshold);
    excess += e;
    squared += e * e / Math.max(1, threshold);
  }
  // RC26 selection metric: ordinary length matters, but giant bridges matter
  // much more because they visibly erase the source's light/dark hierarchy.
  return total + 6.0 * excess + 5.0 * squared;
}



// RC27: bounded-time spatial router.  It deliberately avoids the RC26
// multi-fragment global edge sort and repeated all-city KNN/2-opt passes that
// could stall the browser at the 18k default.  The route is still one open
// Hamiltonian path: each city is visited exactly once.
function buildFastSpatialGreedyPath(points, canvasWidth, canvasHeight) {
  const n = points.length;
  if (n < 2) return points.map((_, i) => i);

  const buckets = buildPointBuckets(points, canvasWidth, canvasHeight, 1.35);
  const { bucketSize, bucketCols, bucketRows } = buckets;
  const live = new Int32Array(bucketCols * bucketRows);
  const pointBucket = new Int32Array(n);
  for (let i = 0; i < n; i++) {
    const bx = clamp(Math.floor(points[i].x / bucketSize), 0, bucketCols - 1);
    const by = clamp(Math.floor(points[i].y / bucketSize), 0, bucketRows - 1);
    const bi = by * bucketCols + bx;
    pointBucket[i] = bi;
    live[bi]++;
  }

  // Deterministic open-path start near the upper-left occupied extent.
  let start = 0;
  let startScore = Infinity;
  for (let i = 0; i < n; i++) {
    const score = points[i].x + 0.35 * points[i].y;
    if (score < startScore) { startScore = score; start = i; }
  }

  const visited = new Uint8Array(n);
  const order = new Int32Array(n);
  let current = start;

  function nearestUnvisited(from) {
    const p = points[from];
    const cx = clamp(Math.floor(p.x / bucketSize), 0, bucketCols - 1);
    const cy = clamp(Math.floor(p.y / bucketSize), 0, bucketRows - 1);
    let best = -1;
    let bestD2 = Infinity;
    let foundRing = -1;
    const maxRing = Math.max(bucketCols, bucketRows);

    for (let r = 0; r <= maxRing; r++) {
      const minX = Math.max(0, cx - r), maxX = Math.min(bucketCols - 1, cx + r);
      const minY = Math.max(0, cy - r), maxY = Math.min(bucketRows - 1, cy + r);
      let foundThisRing = false;
      for (let by = minY; by <= maxY; by++) {
        for (let bx = minX; bx <= maxX; bx++) {
          if (r > 0 && bx !== minX && bx !== maxX && by !== minY && by !== maxY) continue;
          const bi = by * bucketCols + bx;
          if (live[bi] <= 0) continue;
          const arr = buckets.buckets[bi];
          if (!arr) continue;
          for (let q = 0; q < arr.length; q++) {
            const j = arr[q];
            if (visited[j] || j === from) continue;
            foundThisRing = true;
            const dx = points[j].x - p.x;
            const dy = points[j].y - p.y;
            const d2 = dx * dx + dy * dy;
            if (d2 < bestD2) { bestD2 = d2; best = j; }
          }
        }
      }
      if (foundThisRing && foundRing < 0) foundRing = r;
      // One extra perimeter catches bucket-boundary nearest neighbours without
      // turning every step into a global search.
      if (foundRing >= 0 && r >= foundRing + 1) break;
    }
    return best;
  }

  for (let pos = 0; pos < n; pos++) {
    order[pos] = current;
    visited[current] = 1;
    live[pointBucket[current]]--;
    if (pos === n - 1) break;
    let next = nearestUnvisited(current);
    if (next < 0) {
      // Defensive O(n) fallback is expected only in pathological bucket states.
      let bestD2 = Infinity;
      for (let j = 0; j < n; j++) {
        if (visited[j]) continue;
        const dx = points[j].x - points[current].x;
        const dy = points[j].y - points[current].y;
        const d2 = dx * dx + dy * dy;
        if (d2 < bestD2) { bestD2 = d2; next = j; }
      }
    }
    current = next;
  }
  return Array.from(order);
}

function collectNearbyVertices(pointIndex, points, bucketInfo, maxCandidates = 28) {
  const { bucketSize, bucketCols, bucketRows, buckets } = bucketInfo;
  const p = points[pointIndex];
  const cx = clamp(Math.floor(p.x / bucketSize), 0, bucketCols - 1);
  const cy = clamp(Math.floor(p.y / bucketSize), 0, bucketRows - 1);
  const found = [];
  const maxRing = Math.max(bucketCols, bucketRows);
  for (let r = 0; r <= maxRing && found.length < maxCandidates * 2; r++) {
    const minX = Math.max(0, cx - r), maxX = Math.min(bucketCols - 1, cx + r);
    const minY = Math.max(0, cy - r), maxY = Math.min(bucketRows - 1, cy + r);
    for (let by = minY; by <= maxY; by++) {
      for (let bx = minX; bx <= maxX; bx++) {
        if (r > 0 && bx !== minX && bx !== maxX && by !== minY && by !== maxY) continue;
        const arr = buckets[by * bucketCols + bx];
        if (!arr) continue;
        for (let q = 0; q < arr.length; q++) {
          const j = arr[q];
          if (j === pointIndex) continue;
          const dx = points[j].x - p.x, dy = points[j].y - p.y;
          found.push({ j, d2: dx * dx + dy * dy });
        }
      }
    }
  }
  found.sort((a,b)=>a.d2-b.d2);
  return found.slice(0, maxCandidates).map(v=>v.j);
}

function fastLocal2Opt(points, order, canvasWidth, canvasHeight, passes = 2) {
  const n = order.length;
  if (n < 4) return order;
  const bucketInfo = buildPointBuckets(points, canvasWidth, canvasHeight, 1.55);
  const pos = new Int32Array(n);
  for (let i = 0; i < n; i++) pos[order[i]] = i;
  const dist = (a,b) => Math.hypot(points[a].x-points[b].x, points[a].y-points[b].y);

  for (let pass = 0; pass < passes; pass++) {
    let changes = 0;
    const changeLimit = Math.min(1800, Math.floor(n * 0.10));
    for (let i = 0; i < n - 3 && changes < changeLimit; i++) {
      const a = order[i], b = order[i+1];
      const oldAB = dist(a,b);
      let bestJ = -1, bestDelta = -1e-5;
      const candidates = collectNearbyVertices(a, points, bucketInfo, 18);
      for (let q = 0; q < candidates.length; q++) {
        const j = pos[candidates[q]];
        if (j <= i + 1 || j >= n - 1) continue;
        const c = order[j], d = order[j+1];
        const delta = dist(a,c) + dist(b,d) - oldAB - dist(c,d);
        if (delta < bestDelta) { bestDelta = delta; bestJ = j; }
      }
      if (bestJ >= 0) {
        reverseOrderSegment(order, i+1, bestJ);
        for (let k = i+1; k <= bestJ; k++) pos[order[k]] = k;
        changes++;
      }
    }
    if (!changes) break;
  }
  return order;
}

function fastBridgeRepair(points, order, canvasWidth, canvasHeight, maxRepairs = 72) {
  const n = order.length;
  if (n < 6) return order;
  const dist = (a,b) => Math.hypot(points[a].x-points[b].x, points[a].y-points[b].y);
  const lengths = new Array(n-1);
  for (let i = 0; i < n-1; i++) lengths[i] = dist(order[i], order[i+1]);
  const sorted = lengths.slice().sort((a,b)=>a-b);
  const median = sorted[Math.floor(sorted.length*0.5)] || 1;
  const threshold = Math.max(3.0, median * 2.45);
  const ranked = lengths.map((len,i)=>({len,i})).filter(e=>e.len>threshold).sort((a,b)=>b.len-a.len);
  if (!ranked.length) return order;

  const bucketInfo = buildPointBuckets(points, canvasWidth, canvasHeight, 1.65);
  const pos = new Int32Array(n);
  for (let i = 0; i < n; i++) pos[order[i]] = i;
  let repairs = 0;
  for (let r = 0; r < ranked.length && repairs < maxRepairs; r++) {
    const i = ranked[r].i;
    if (i < 0 || i >= n-1) continue;
    const a = order[i], b = order[i+1];
    const oldAB = dist(a,b);
    if (oldAB <= threshold) continue;
    const candidates = collectNearbyVertices(a, points, bucketInfo, 36);
    let bestJ = -1, bestScore = 0;
    for (let q = 0; q < candidates.length; q++) {
      const j = pos[candidates[q]];
      if (j <= i + 1 || j >= n - 1) continue;
      const c = order[j], d = order[j+1];
      const oldCD = dist(c,d);
      const newAC = dist(a,c), newBD = dist(b,d);
      const oldPenalty = Math.max(0, oldAB-threshold) + Math.max(0, oldCD-threshold);
      const newPenalty = Math.max(0, newAC-threshold) + Math.max(0, newBD-threshold);
      const score = (oldAB + oldCD - newAC - newBD) + 5.0*(oldPenalty-newPenalty);
      if (score > bestScore) { bestScore = score; bestJ = j; }
    }
    if (bestJ >= 0) {
      reverseOrderSegment(order, i+1, bestJ);
      for (let k = i+1; k <= bestJ; k++) pos[order[k]] = k;
      repairs++;
    }
  }
  return order;
}
function hilbertRotate2D(n, x, y, rx, ry) {
  if (ry === 0) {
    if (rx === 1) {
      x = n - 1 - x;
      y = n - 1 - y;
    }
    const t = x; x = y; y = t;
  }
  return [x, y];
}

function hilbertIndex2D(x, y, bits = 12) {
  const side = 1 << bits;
  let xx = clamp(x | 0, 0, side - 1);
  let yy = clamp(y | 0, 0, side - 1);
  let d = 0;
  for (let s = side >> 1; s > 0; s >>= 1) {
    const rx = (xx & s) ? 1 : 0;
    const ry = (yy & s) ? 1 : 0;
    d += s * s * ((3 * rx) ^ ry);
    const r = hilbertRotate2D(s, xx, yy, rx, ry);
    xx = r[0]; yy = r[1];
  }
  return d;
}

function buildHilbertLocalOrder(points, canvasWidth, canvasHeight) {
  const bits = 12;
  const side = (1 << bits) - 1;
  const sx = side / Math.max(1, canvasWidth);
  const sy = side / Math.max(1, canvasHeight);
  const keyed = new Array(points.length);
  for (let i = 0; i < points.length; i++) {
    const qx = clamp(Math.floor(points[i].x * sx), 0, side);
    const qy = clamp(Math.floor(points[i].y * sy), 0, side);
    keyed[i] = { i, h: hilbertIndex2D(qx, qy, bits) };
  }
  keyed.sort((a, b) => a.h - b.h || a.i - b.i);
  const order = new Array(points.length);
  for (let i = 0; i < keyed.length; i++) order[i] = keyed[i].i;
  return order;
}

// ─────────────────────────────────────────────────────────────────────────────
// RC40 CLEAN TSP ROUTER
//
// The final renderer is never nearest-neighbour.  We use a multi-fragment or
// space-filling seed only as a starting tour, then candidate-based chained
// 2-opt/Or-opt, crossing cleanup and bridge repair.  All four product styles
// use this same route core; only the city field / distance metric differs.
// ─────────────────────────────────────────────────────────────────────────────

function buildTspMetricSpaceV40(points, canvasWidth, canvasHeight, textured = false) {
  if (!textured) return { points, width: canvasWidth, height: canvasHeight };

  // Directional texture: optimize in an anisotropic, rotated Euclidean space.
  // The displayed coordinates remain untouched; only route cost changes.
  const directionCtl = clamp(currentTspTexturedDirection, 0, 100) / 100;
  const textureCtl = clamp(currentTspTexturedScale, 0, 100) / 100;
  // RC92: keep Directional distinct without letting metric anisotropy overwhelm
  // the portrait. The RC91 default was already 1.75x across-flow at control 50.
  const angleDeg = 8 + 26 * directionCtl + 8 * (textureCtl - 0.5);
  const angle = angleDeg * Math.PI / 180;
  const ca = Math.cos(angle), sa = Math.sin(angle);
  const acrossScale = 1.0 + 0.65 * directionCtl;
  const transformed = new Array(points.length);
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const cx = canvasWidth * 0.5, cy = canvasHeight * 0.5;
  for (let i = 0; i < points.length; i++) {
    const dx = points[i].x - cx;
    const dy = points[i].y - cy;
    const u = ca * dx + sa * dy;
    const v = (-sa * dx + ca * dy) * acrossScale;
    transformed[i] = { x: u, y: v, weight: points[i].weight };
    if (u < minX) minX = u; if (u > maxX) maxX = u;
    if (v < minY) minY = v; if (v > maxY) maxY = v;
  }
  const pad = 2;
  for (let i = 0; i < transformed.length; i++) {
    transformed[i].x = transformed[i].x - minX + pad;
    transformed[i].y = transformed[i].y - minY + pad;
  }
  return {
    points: transformed,
    width: Math.max(4, maxX - minX + pad * 2),
    height: Math.max(4, maxY - minY + pad * 2)
  };
}

function buildHighQualityTspOrderV40(points, canvasWidth, canvasHeight) {
  const n = points.length;
  if (n < 2) return points.map((_, i) => i);

  // Multi-fragment gives a substantially better geometric seed than nearest
  // neighbour without the latter's end-trap.  At very large slider values we
  // switch to a Hilbert seed to keep memory bounded.
  const large = n >= 9000;
  let order = n <= 18000
    ? buildMultiFragmentPath(points, canvasWidth, canvasHeight)
    : buildHilbertLocalOrder(points, canvasWidth, canvasHeight);

  // RC90 responsive route budget. Preserve the high-quality multi-fragment seed
  // and local bridge/crossing cleanup, but avoid repeated global cycle searches
  // that blocked Chrome for many seconds at the 11,508-city default.
  order = fastLocal2Opt(points, order, canvasWidth, canvasHeight, large ? 1 : 2);
  order = fastBridgeRepair(points, order, canvasWidth, canvasHeight, large ? 64 : 120);
  if (!large) improveCycle2Opt(points, order, canvasWidth, canvasHeight, null, 1);
  fastCycleBridgeRepairV40(points, order, canvasWidth, canvasHeight, large ? 72 : 180);
  uncrossLongestCycleEdges(points, order, large ? 40 : 80);
  if (!large) {
    fastCycleBridgeRepairV40(points, order, canvasWidth, canvasHeight, 80);
    repairTopLongestCycleEdges(points, order, 48);
    repairCycleLongBridges(points, order);
  }
  return order;
}


function fastCycleBridgeRepairV40(points, order, canvasWidth, canvasHeight, maxRepairs = 120) {
  const n = order.length;
  if (n < 6) return order;
  const dist = (a, b) => Math.hypot(points[a].x - points[b].x, points[a].y - points[b].y);
  const initial = new Array(n);
  for (let i = 0; i < n; i++) initial[i] = dist(order[i], order[(i + 1) % n]);
  const sorted = initial.slice().sort((a, b) => a - b);
  const median = sorted[Math.floor(n * 0.5)] || 1;
  const p95 = sorted[Math.floor(n * 0.95)] || median;
  const threshold = Math.max(3.5, Math.min(median * 2.75, p95 * 1.55));
  const bucketInfo = buildPointBuckets(points, canvasWidth, canvasHeight, 1.75);
  const pos = new Int32Array(n);
  for (let i = 0; i < n; i++) pos[order[i]] = i;

  const penalty = (len) => {
    if (len <= threshold) return 0;
    const e = (len - threshold) / threshold;
    return threshold * (e + 2.4 * e * e);
  };

  for (let repair = 0; repair < maxRepairs; repair++) {
    let i = -1, longest = threshold;
    for (let k = 0; k < n; k++) {
      const len = dist(order[k], order[(k + 1) % n]);
      if (len > longest) { longest = len; i = k; }
    }
    if (i < 0) break;

    // Rotate the cycle if the offending edge is the wrap edge so the ordinary
    // contiguous 2-opt reversal below remains valid.
    if (i === n - 1) {
      const first = order.shift();
      order.push(first);
      for (let k = 0; k < n; k++) pos[order[k]] = k;
      i = n - 2;
      longest = dist(order[i], order[i + 1]);
    }

    const a = order[i], b = order[i + 1];
    const candidates = collectNearbyVertices(a, points, bucketInfo, 56)
      .concat(collectNearbyVertices(b, points, bucketInfo, 56));
    let bestU = -1, bestV = -1, bestScore = -1e-6;
    for (let q = 0; q < candidates.length; q++) {
      const j = pos[candidates[q]];
      if (j < 0 || j === i) continue;
      const u = Math.min(i, j);
      const v = Math.max(i, j);
      if (v === u + 1 || (u === 0 && v === n - 1)) continue;
      const aa = order[u], bb = order[(u + 1) % n];
      const cc = order[v], dd = order[(v + 1) % n];
      const old1 = dist(aa, bb), old2 = dist(cc, dd);
      const new1 = dist(aa, cc), new2 = dist(bb, dd);
      const lengthDelta = new1 + new2 - old1 - old2;
      const penaltyDelta = penalty(new1) + penalty(new2) - penalty(old1) - penalty(old2);
      const score = lengthDelta + 7.5 * penaltyDelta;
      if (score < bestScore) { bestScore = score; bestU = u; bestV = v; }
    }
    if (bestU < 0) break;
    reverseOrderSegment(order, bestU + 1, bestV);
    for (let k = bestU + 1; k <= bestV; k++) pos[order[k]] = k;
  }
  return order;
}

function buildTspPath(points, canvasWidth, canvasHeight) {
  if (points.length < 2) return points.slice();
  const metric = buildTspMetricSpaceV40(
    points, canvasWidth, canvasHeight,
    currentSingleLineVariant === 'textured'
  );
  let order = buildHighQualityTspOrderV40(metric.points, metric.width, metric.height);
  // RC90/RC91: the optimizer works cyclically for quality, then we cut the
  // worst cycle edge so the painted result is one open continuous stroke.
  order = cutWorstCycleEdge(metric.points, order);
  // RC92 freezes accepted Voronoi and Dithered routing exactly. Classic and
  // Textured receive one bounded actual-coordinate bridge pass because those
  // were the two human-qualified failures in RC91.
  if (currentSingleLineVariant === 'classic' || currentSingleLineVariant === 'textured') {
    order = repairLongBridges(points, order);
  }
  const path = new Array(order.length);
  for (let i = 0; i < order.length; i++) path[i] = points[order[i]];
  return path;
}

function geometryKey(kind, count) {
  // Handle missing calibration parameters gracefully
  const stippleRelaxation = typeof currentStippleClassicRelaxation !== 'undefined' ? currentStippleClassicRelaxation : 50;
  const stippleBlueSpacing = typeof currentStippleBlueSpacing !== 'undefined' ? currentStippleBlueSpacing : 50;
  const stippleBlueBg = typeof currentStippleBlueBg !== 'undefined' ? currentStippleBlueBg : 50;
  const stippleDitherTone = typeof currentStippleDitherTone !== 'undefined' ? currentStippleDitherTone : 50;
  const stippleDitherPattern = typeof currentStippleDitherPattern !== 'undefined' ? currentStippleDitherPattern : 50;
  const stippleStructureEmphasis = typeof currentStippleStructureEmphasis !== 'undefined' ? currentStippleStructureEmphasis : 50;

  const tspClassicToneSupport = typeof currentTspClassicToneSupport !== 'undefined' ? currentTspClassicToneSupport : 30;
  const tspClassicFeatureDetail = typeof currentTspClassicFeatureDetail !== 'undefined' ? currentTspClassicFeatureDetail : 50;
  const tspVoronoiTone = typeof currentTspVoronoiTone !== 'undefined' ? currentTspVoronoiTone : 50;
  const tspVoronoiSmoothness = typeof currentTspVoronoiSmoothness !== 'undefined' ? currentTspVoronoiSmoothness : 50;
  const tspDitherTone = typeof currentTspDitherTone !== 'undefined' ? currentTspDitherTone : 50;
  const tspDitherPattern = typeof currentTspDitherPattern !== 'undefined' ? currentTspDitherPattern : 50;
  const tspTexturedDirection = typeof currentTspTexturedDirection !== 'undefined' ? currentTspTexturedDirection : 50;
  const tspTexturedScale = typeof currentTspTexturedScale !== 'undefined' ? currentTspTexturedScale : 50;

  const stippleCtl = currentStippleVariant === 'classic' ? `${stippleRelaxation}`
    : currentStippleVariant === 'voronoi' ? `${stippleBlueSpacing}|${stippleBlueBg}`
    : currentStippleVariant === 'dithered' ? `${stippleDitherTone}|${stippleDitherPattern}`
    : `${stippleStructureEmphasis}`;
  const tspCtl = currentSingleLineVariant === 'classic' ? `${tspClassicToneSupport}|${tspClassicFeatureDetail}`
    : currentSingleLineVariant === 'voronoi' ? `${tspVoronoiTone}|${tspVoronoiSmoothness}`
    : currentSingleLineVariant === 'dithered' ? `${tspDitherTone}|${tspDitherPattern}`
    : `${tspTexturedDirection}|${tspTexturedScale}`;
  return `${kind}|${imgWidth}|${imgHeight}|${count}|${currentContrast.toFixed(3)}|${currentInverseImage ? 1 : 0}|${currentStippleVariant}|${stippleCtl}|${currentSingleLineVariant}|${tspCtl}|${currentStippleBlueBg}|${currentStippleDitherPattern}|${tspVoronoiSmoothness}`;
}

function buildBlueNoiseStipplePointsV53(canvasWidth, canvasHeight, targetPointCount) {
  // RC52 — a genuinely distinct stipple family: variable-radius Poisson / blue-noise.
  // It follows RAW image tone (rho = 1 - luminance) and does not use Classic's
  // portrait/edge density field, feature anchors, or Lloyd/CVT relaxation.
  const toneMap = buildToneMap(canvasWidth, canvasHeight, 300);
  const n = toneMap.lum.length;
  const workingLum = new Float32Array(n);
  const rawDark = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let L = clamp(toneMap.lum[i], 0, 1);
    // Contrast remains a user control; at the midpoint (1.0), this is raw tone.
    L = Math.pow(L, 1 / Math.max(0.1, currentContrast));
    if (currentInverseImage) L = 1 - L;
    workingLum[i] = L;
    rawDark[i] = clamp(1 - L, 0, 1);
  }

  // RC53: keep the Poisson variant portrait-agnostic, but do not let a large
  // flat black studio backdrop consume the whole point budget.  Detect only a
  // border-connected, low-texture dark field; textured dark hair/clothing is
  // preserved because it fails the flatness/edge test.  Bright paper already
  // self-suppresses through rho = 1 - luminance.
  const local1 = boxBlurFloatGrid(workingLum, toneMap.cols, toneMap.rows, 1);
  const local3 = boxBlurFloatGrid(workingLum, toneMap.cols, toneMap.rows, 3);
  const edge = normalizeFloatGridByPercentile(
    sobelMagnitudeFloatGrid(workingLum, toneMap.cols, toneMap.rows), 0.985
  );
  const localContrast = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    localContrast[i] = Math.abs(local1[i] - workingLum[i]) +
      0.45 * Math.abs(local3[i] - workingLum[i]);
  }
  const bg = estimateSingleLineBorderBackground(workingLum, toneMap.cols, toneMap.rows);
  // RC92 Blue Noise default correction: the RC91 point field was so spacing-led
  // that facial structure collapsed into an almost regular halftone. Preserve
  // Poisson exclusion, but let compact source structure modestly influence the
  // candidate density before spacing is enforced.
  for (let i = 0; i < n; i++) {
    const darkRidge = Math.max(0, local1[i] - workingLum[i]);
    const compact = clamp(0.50 * edge[i] + 2.2 * darkRidge + 0.70 * localContrast[i], 0, 1);
    const d = rawDark[i];
    rawDark[i] = clamp(Math.pow(d, 1.08) + 0.16 * compact * (0.22 + 0.78 * Math.sqrt(Math.max(d, 0.01))), 0, 1);
  }

  const blueBg = typeof currentStippleBlueBg !== 'undefined' ? currentStippleBlueBg : 70;
  if (bg.bgLum < 0.34) {
    const bgMask = buildConnectedFlatBackgroundMask(
      workingLum, toneMap.cols, toneMap.rows, edge, localContrast,
      bg.bgLum, Math.max(0.055, bg.tolerance)
    );
    for (let i = 0; i < n; i++) {
      const connected = clamp(bgMask[i], 0, 1);
      const flatDark = workingLum[i] < 0.24 && edge[i] < 0.16 && localContrast[i] < 0.035;
      if (blueBg === 50) {
        // Exact RC54 neutral behavior.
        if (flatDark || connected > 0.42) rawDark[i] = 0;
        else rawDark[i] *= (1 - 0.985 * connected);
      } else {
        const bgScale = 0.5 + clamp(blueBg, 0, 100) / 100;
        const suppress = clamp(0.985 * bgScale, 0, 0.9995);
        const hardThreshold = clamp(0.62 - 0.20 * bgScale, 0.22, 0.62);
        if ((flatDark && blueBg >= 50) || connected > hardThreshold) rawDark[i] *= (1 - suppress);
        else rawDark[i] *= (1 - suppress * connected);
      }
    }
  }
  const cdfInfo = buildCdf(rawDark);
  if (!(cdfInfo.total > 0)) return [];

  const rng = createSeededRng(hashString(`stippleV53-blue|${canvasWidth}|${canvasHeight}|${targetPointCount}|${currentContrast}|${currentInverseImage}`));
  const avgSpacing = Math.sqrt((canvasWidth * canvasHeight) / Math.max(1, targetPointCount));
  const minCell = Math.max(1.25, avgSpacing * 0.48);
  const gridCols = Math.max(1, Math.ceil(canvasWidth / minCell));
  const gridRows = Math.max(1, Math.ceil(canvasHeight / minCell));
  const grid = Array.from({length:gridCols*gridRows}, () => []);
  const points = [];

  function rawDarkAtPoint(x, y) {
    const gx = clamp(Math.floor((x / canvasWidth) * toneMap.cols), 0, toneMap.cols - 1);
    const gy = clamp(Math.floor((y / canvasHeight) * toneMap.rows), 0, toneMap.rows - 1);
    return rawDark[gy * toneMap.cols + gx];
  }
  function localRadius(d, scale) {
    // Dark areas support closer dots; light areas spread them farther apart.
    // 50 is exactly the RC54 exclusion radius.
    const spacingScale = 0.5 + clamp(currentStippleBlueSpacing, 0, 100) / 100;
    return avgSpacing * scale * spacingScale * (0.66 + 1.38 * Math.pow(1 - d, 1.15));
  }
  function canAccept(x, y, d, scale) {
    const r = localRadius(d, scale);
    const cx = clamp(Math.floor(x / minCell), 0, gridCols - 1);
    const cy = clamp(Math.floor(y / minCell), 0, gridRows - 1);
    const span = Math.max(1, Math.ceil((r * 1.25) / minCell));
    for (let yy = Math.max(0,cy-span); yy <= Math.min(gridRows-1,cy+span); yy++) {
      for (let xx = Math.max(0,cx-span); xx <= Math.min(gridCols-1,cx+span); xx++) {
        const bucket = grid[yy*gridCols+xx];
        for (let k=0;k<bucket.length;k++) {
          const j = bucket[k];
          const q = points[j];
          const rq = q.radius;
          const rr = Math.max(r, rq) * 0.86;
          const dx=x-q.x, dy=y-q.y;
          if (dx*dx + dy*dy < rr*rr) return false;
        }
      }
    }
    return true;
  }
  function accept(x,y,d,scale) {
    const radius = localRadius(d, scale);
    const idx = points.length;
    points.push({x,y,weight:d,radius});
    const cx = clamp(Math.floor(x / minCell), 0, gridCols - 1);
    const cy = clamp(Math.floor(y / minCell), 0, gridRows - 1);
    grid[cy*gridCols+cx].push(idx);
  }

  // Successive passes shrink the exclusion radius only if needed. This keeps
  // the distribution blue-noise-like while still honoring the requested count.
  let scale = 1.18;
  for (let pass=0; pass<8 && points.length<targetPointCount; pass++) {
    const attempts = Math.max(targetPointCount * 5, (targetPointCount - points.length) * 18);
    for (let a=0; a<attempts && points.length<targetPointCount; a++) {
      const q = sampleDensityPoint(toneMap, rawDark, canvasWidth, canvasHeight, rng, cdfInfo);
      const d = rawDarkAtPoint(q.x,q.y);
      if (d <= 0.002) continue;
      if (canAccept(q.x,q.y,d,scale)) accept(q.x,q.y,d,scale);
    }
    scale *= 0.88;
  }

  // RC92: RC91 could exhaust the final 0.40-radius guard and then the wrapper
  // "fixed" the count by duplicating already-accepted points almost exactly.
  // Those overlaps were invisible and made the nominal 16k Blue Noise default
  // look much sparser and more regular than it really was. Progressively relax
  // the exclusion radius here so the Poisson generator itself owns the budget.
  for (const finalScale of [0.36, 0.30, 0.24, 0.18, 0.13]) {
    if (points.length >= targetPointCount) break;
    const attempts = Math.max(targetPointCount * 8, (targetPointCount - points.length) * 28);
    for (let a = 0; a < attempts && points.length < targetPointCount; a++) {
      const q = sampleDensityPoint(toneMap, rawDark, canvasWidth, canvasHeight, rng, cdfInfo);
      const d = rawDarkAtPoint(q.x, q.y);
      if (d <= 0.001) continue;
      if (canAccept(q.x, q.y, d, finalScale)) accept(q.x, q.y, d, finalScale);
    }
  }

  // Last-resort density sampling is preferable to invisible near-duplicate
  // geometry. It is reached only after all bounded Poisson relaxation passes.
  while (points.length < targetPointCount) {
    const q = sampleDensityPoint(toneMap, rawDark, canvasWidth, canvasHeight, rng, cdfInfo);
    const d = rawDarkAtPoint(q.x, q.y);
    if (d <= 0.001) continue;
    accept(q.x, q.y, d, 0.08);
  }
  for (let i=0;i<points.length;i++) delete points[i].radius;
  return points;
}

function buildDitheredStipplePointsV52(canvasWidth, canvasHeight, targetPointCount) {
  // RC52 — true ordered halftone on RAW tone. No perceptual density field,
  // portrait heuristics, anchor injection, CDF sampling, or relaxation.
  const toneMap = buildToneMap(canvasWidth, canvasHeight, 320);
  const BAYER8 = [
     0,32, 8,40, 2,34,10,42,
    48,16,56,24,50,18,58,26,
    12,44, 4,36,14,46, 6,38,
    60,28,52,20,62,30,54,22,
     3,35,11,43, 1,33, 9,41,
    51,19,59,27,49,17,57,25,
    15,47, 7,39,13,45, 5,37,
    63,31,55,23,61,29,53,21
  ];
  const cols=toneMap.cols, rows=toneMap.rows;
  const cellW=canvasWidth/cols, cellH=canvasHeight/rows;
  const ranked = new Array(cols*rows);
  let pos=0;
  for (let y=0;y<rows;y++) {
    for (let x=0;x<cols;x++) {
      const idx=y*cols+x;
      let L=clamp(toneMap.lum[idx],0,1);
      L=Math.pow(L,1/Math.max(0.1,currentContrast));
      if(currentInverseImage) L=1-L;
      const darkness=1-L;
      const tonePower = 0.5 + clamp(currentStippleDitherTone, 0, 100) / 100;
      const rankedDarkness = Math.pow(Math.max(0, darkness), tonePower);
      const threshold=(BAYER8[(y&7)*8+(x&7)]+0.5)/64;
      const patternScale = 0.5 + clamp(typeof currentStippleDitherPattern !== 'undefined' ? currentStippleDitherPattern : 50, 0, 100) / 100;
      // 50/50 is byte-behavior-equivalent to RC54 scoring.
      ranked[pos++]={x,y,darkness,score:rankedDarkness-threshold*patternScale};
    }
  }
  ranked.sort((a,b)=>b.score-a.score || b.darkness-a.darkness || a.y-b.y || a.x-b.x);
  const count=Math.min(targetPointCount,ranked.length);
  const out=new Array(count);
  for(let i=0;i<count;i++){
    const q=ranked[i];
    out[i]={x:(q.x+0.5)*cellW,y:(q.y+0.5)*cellH,weight:q.darkness};
  }
  return out;
}

function getStippleGeometry() {
  const key = geometryKey(`stippleV92-${currentStippleVariant}`, currentStippleDensity);
  if (stippleGeometryCache.key !== key || !stippleGeometryCache.points) {
    let points;
    if (currentStippleVariant === 'voronoi') {
      points = buildBlueNoiseStipplePointsV53(imgWidth, imgHeight, currentStippleDensity);
    } else if (currentStippleVariant === 'dithered') {
      points = buildDitheredStipplePointsV52(imgWidth, imgHeight, currentStippleDensity);
    } else if (currentStippleVariant === 'structure') {
      // Fourth product preset: expose the already-frozen RC43/RC54
      // high-contrast structural density profile. No new image model.
      points = buildStipplePoints(imgWidth, imgHeight, currentStippleDensity, 'stippleV79-structure', 'stippleHighContrast');
      points = injectFeatureAnchors(points, imgWidth, imgHeight, currentStippleDensity, 'stippleHighContrast');
      points = injectPortraitAnchors(points, imgWidth, imgHeight, currentStippleDensity, 'stippleHighContrast');
    } else {
      points = buildStipplePoints(imgWidth, imgHeight, currentStippleDensity, 'stippleV51-classic', 'stipple');
      points = injectFeatureAnchors(points, imgWidth, imgHeight, currentStippleDensity, 'stipple');
      points = injectPortraitAnchors(points, imgWidth, imgHeight, currentStippleDensity, 'stipple');
    }

    // Exact point-count invariant retained from RC54.
    if (points.length > currentStippleDensity) points.length = currentStippleDensity;
    if (points.length < currentStippleDensity && points.length > 0) {
      const rng = createSeededRng(hashString(`stippleV52-exact|${currentStippleVariant}|${imgWidth}|${imgHeight}|${currentStippleDensity}`));
      while (points.length < currentStippleDensity) {
        const q = points[Math.floor(rng() * points.length)];
        points.push({
          x: clamp(q.x + (rng() - 0.5) * 0.001, 0, imgWidth - 0.001),
          y: clamp(q.y + (rng() - 0.5) * 0.001, 0, imgHeight - 0.001),
          weight: q.weight
        });
      }
    }
    stippleGeometryCache = { key, points };
  }
  return stippleGeometryCache.points;
}

function getSingleLineGeometry() {
  const key = geometryKey(`singleLine92-${currentSingleLineVariant}`, currentSingleLineDensity);
  if (singleLineGeometryCache.key !== key || !singleLineGeometryCache.path) {
    const cities = buildSingleLineCities(imgWidth, imgHeight, currentSingleLineDensity);
    singleLineGeometryCache = {
      key,
      path: buildTspPath(cities, imgWidth, imgHeight)
    };
  }
  return singleLineGeometryCache.path;
}

function getVectorCanvasSize() {
  // Export/backing resolution follows the Width control, but geometry is kept
  // in fixed source coordinates so changing Width never changes the artwork.
  const scale = Math.max(0.1, currentWidth / 100);
  return {
    width: Math.max(1, Math.round(imgWidth * scale)),
    height: Math.max(1, Math.round(imgHeight * scale)),
    scaleX: scale,
    scaleY: scale
  };
}

function getVectorPreviewWidth() {
  // Match the same visual-width system used by ASCII / Color Block / Custom.
  const wrap = document.getElementById('render-wrap');
  return Math.max(1, Math.floor(wrap.clientWidth * (currentWidth / 100)));
}

function applyVectorPreviewSize(canvas) {
  const displayWidth = getVectorPreviewWidth();
  const displayHeight = Math.max(1, Math.round(displayWidth * (imgHeight / imgWidth)));
  canvas.style.width = displayWidth + 'px';
  canvas.style.height = displayHeight + 'px';
  canvas.style.maxWidth = 'none';
  canvas.style.display = 'block';
}

function buildSingleLineCanvas() {
  const size = getVectorCanvasSize();
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext('2d');

  const bg = experimentalBgColor(currentSingleLineBgColor || (currentBgWhite ? '#ffffff' : '#000000'));
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const path = getSingleLineGeometry();
  if (path.length < 2) return canvas;

  ctx.beginPath();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = experimentalFgColor(currentSingleLineColor);
  // Line Width is appearance only. It never participates in city placement,
  // the salesman route, or geometry-cache keys.
  ctx.lineWidth = currentSingleLineWidth * size.scaleX;
  ctx.moveTo(path[0].x * size.scaleX, path[0].y * size.scaleY);
  for (let i = 1; i < path.length; i++) {
    ctx.lineTo(path[i].x * size.scaleX, path[i].y * size.scaleY);
  }
  // RC90: Single-Line is an open Hamiltonian path. Do not draw an artificial
  // final-to-first closing segment across the image.
  ctx.stroke();
  return canvas;
}

function buildStippleCanvas() {
  const size = getVectorCanvasSize();
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext('2d');

  const bg = experimentalBgColor(currentStippleBgColor || (currentBgWhite ? '#ffffff' : '#000000'));
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const points = getStippleGeometry();
  ctx.fillStyle = experimentalFgColor(currentStippleColor);
  // Dot Size is appearance only. Darkness is represented by number/spacing
  // of dots, never by enlarging dark-region dots.
  const dotRadius = currentStippleDotSize * size.scaleX;
  for (let i = 0; i < points.length; i++) {
    ctx.beginPath();
    ctx.arc(points[i].x * size.scaleX, points[i].y * size.scaleY, dotRadius, 0, Math.PI * 2);
    ctx.fill();
  }
  return canvas;
}

function renderStipple(cols, rows) {
  const canvas = buildStippleCanvas();
  applyVectorPreviewSize(canvas);
  pre.innerHTML = '';
  pre.style.display = 'block';
  pre.style.background = currentBgWhite ? '#ffffff' : '#000000';
  pre.style.padding = '0';
  pre.style.margin = '0';
  pre.style.width = 'auto';
  pre.style.height = 'auto';
  pre.style.overflow = 'visible';
  applyZoom();
  pre.appendChild(canvas);
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

// ── Mode 4: Single-Line — one continuous path tracing the image ──
function renderSingleLine(cols, rows) {
  const canvas = buildSingleLineCanvas();
  applyVectorPreviewSize(canvas);
  pre.innerHTML = '';
  pre.style.display = 'block';
  pre.style.background = currentBgWhite ? '#ffffff' : '#000000';
  pre.style.padding = '0';
  pre.style.margin = '0';
  pre.style.width = 'auto';
  pre.style.height = 'auto';
  pre.style.overflow = 'visible';
  applyZoom();
  pre.appendChild(canvas);
}

// ── Mode 4: Glitch — red/cyan horizontal bars of varying size ──
function renderGlitch(cols, rows) {
  const parts = [];

  // Use fixed number of blocks per row at full width
  const glitchCols = 60; // ~60 blocks per row to match reference
  const glitchRows = rows; // Use original row count to preserve vertical dimensions

  // Calculate dimensions to preserve original size
  const totalWidth = cols * currentFontSize;
  const rowHeight = currentFontSize; // Each row is exactly one font-size tall
  // Account for spacer rows in total height
  const spacerHeight = glitchRows * currentSpacerRows * rowHeight;
  const totalHeight = (rows * rowHeight) + spacerHeight;
  const blockWidth = totalWidth / glitchCols;

  // Set container dimensions for glitch mode only
  pre.style.width = totalWidth + 'px';
  pre.style.height = totalHeight + 'px';
  pre.style.display = 'flex';
  pre.style.flexDirection = 'column';
  pre.style.margin = '0';
  pre.style.padding = '0';
  pre.style.overflow = 'hidden';
  pre.style.transform = `scale(${currentZoom / 100})`;
  pre.style.transformOrigin = 'top left';

  for (let row = 0; row < glitchRows; row++) {
    // Add spacer rows before each content row (except first)
    if (row > 0 && currentSpacerRows > 0) {
      for (let s = 0; s < currentSpacerRows; s++) {
        parts.push(`<div style="width:100%;height:${rowHeight}px;background:#000000;margin:0;padding:0;flex-shrink:0;"></div>`);
      }
    }

    // Build row with flexbox for touching blocks, consistent height
    let rowHtml = `<div style="display:flex;width:100%;height:${rowHeight}px;margin:0;padding:0;flex-shrink:0;align-items:center;">`;

    for (let col = 0; col < glitchCols; col++) {
      // Map glitch coordinates to original image coordinates
      const srcCol = Math.floor(col * cols / glitchCols);
      const srcRow = Math.floor(row * rows / glitchRows);

      const { r, g, b } = samplePixel(srcCol, srcRow, cols, rows);

      // NO negative conversion - use original colors
      const brightness = (r + g + b) / 3;

      // Apply contrast transformation
      let L = brightness / 255;
      L = Math.pow(L, 1 / currentContrast);
      if (currentInvert) L = 1 - L;

      // Apply power function for more extreme contrast
      L = Math.pow(L, 2); // Push values toward extremes

      // Invert brightness mapping - bright should be full block, dark should be sliver
      L = 1 - L;

      // Map brightness to block height - dark = sliver, bright = full block
      const blockHeight = rowHeight * (0.05 + (L * 0.95));

      // Block-based color alternation: red, cyan, red, cyan...
      const isRed = col % 2 === 0;
      const color = isRed ? '#ff0000' : '#00ffff';

      // Use div with flexbox for touching blocks, variable height centered vertically
      rowHtml += `<div style="background:${color};width:${blockWidth}px;height:${blockHeight}px;margin:0;padding:0;flex-shrink:0;"></div>`;
    }

    rowHtml += '</div>';
    parts.push(rowHtml);
  }

  pre.innerHTML = parts.join('');
}

// ── Helper: Calculate block brightness value ──
function calculateBlockBrightness(r, g, b) {
  let L = (r + g + b) / 3 / 255;
  L = Math.pow(L, 1 / currentContrast);
  if (currentInvert) L = 1 - L;
  L = Math.pow(L, 2);
  return 1 - L; // Invert: bright = full block, dark = sliver
}

// ── Mode 5: Custom — fully customizable slit vision ──
function renderCustom(cols, rows) {
  const parts = [];

  // Use custom density settings
  const customCols = currentColDensity;
  const customRows = Math.floor(rows * (currentRowDensity / 50));

  // Calculate dimensions to preserve original size
  const totalWidth = cols * currentFontSize;
  const rowHeight = currentFontSize;
  const gapHeight = customRows * currentSpacerRows * rowHeight;
  const totalHeight = (customRows * rowHeight) + gapHeight;
  const blockWidth = totalWidth / customCols;

  // Pre-calculate constants
  const bgColor = currentBgColorCustom;
  const gapWidth = currentHGap > 0 ? currentHGap : 0;
  const blockColors = currentBlockColors;
  const numColors = blockColors.length;
  const isHorizontal = currentOrientation === 'horizontal';

  // Set container dimensions for custom mode
  pre.style.width = totalWidth + 'px';
  pre.style.height = totalHeight + 'px';
  pre.style.display = 'flex';
  pre.style.flexDirection = 'column';
  pre.style.margin = '0';
  pre.style.padding = '0';
  pre.style.overflow = 'hidden';
  pre.style.transform = `scale(${currentZoom / 100})`;
  pre.style.transformOrigin = 'top left';
  pre.style.background = bgColor;

  // Pre-build spacer HTML if needed
  const spacerHtml = currentSpacerRows > 0
    ? `<div style="width:100%;height:${rowHeight}px;background:${bgColor};margin:0;padding:0;flex-shrink:0;"></div>`
    : '';

  let colorIndex = 0;

  for (let row = 0; row < customRows; row++) {
    // Add vertical gap rows
    if (row > 0 && spacerHtml) {
      for (let s = 0; s < currentSpacerRows; s++) {
        parts.push(spacerHtml);
      }
    }

    // Build row blocks
    const rowBlocks = [];

    for (let col = 0; col < customCols; col++) {
      const srcCol = Math.floor(col * cols / customCols);
      const srcRow = Math.floor(row * rows / customRows);
      const { r, g, b } = samplePixel(srcCol, srcRow, cols, rows);

      const L = calculateBlockBrightness(r, g, b);
      const blockColor = blockColors[colorIndex % numColors];
      colorIndex++;

      if (isHorizontal) {
        const blockHeight = rowHeight * (0.05 + (L * 0.95));
        const actualBlockWidth = blockWidth - gapWidth;
        rowBlocks.push(`<div style="background:${blockColor};width:${actualBlockWidth}px;height:${blockHeight}px;margin:0 ${gapWidth/2}px;padding:0;flex-shrink:0;"></div>`);
      } else {
        const blockWidthVar = blockWidth * (0.05 + (L * 0.95));
        const actualBlockWidth = blockWidthVar - gapWidth;
        const marginSide = (blockWidth - actualBlockWidth) / 2;
        rowBlocks.push(`<div style="background:${blockColor};width:${actualBlockWidth}px;height:${rowHeight}px;margin:0 ${marginSide}px;padding:0;flex-shrink:0;"></div>`);
      }
    }

    parts.push(`<div style="display:flex;width:100%;height:${rowHeight}px;margin:0;padding:0;flex-shrink:0;align-items:center;">${rowBlocks.join('')}</div>`);
  }

  pre.innerHTML = parts.join('');
}

// ── Mode 4: Halftone — traditional halftone dot pattern ──
function renderHalftone(cols, rows) {
  const parts = [];

  // Use halftone size setting (value 3-20 corresponds to dot size)
  const dotSize = currentHalftoneSize;
  const halftoneCols = Math.floor(cols / (dotSize / 12)); // Scale columns based on dot size
  const halftoneRows = rows; // Use original row count like other working modes

  // Calculate dimensions to match original image aspect ratio
  const totalWidth = cols * currentFontSize;
  const originalAspectRatio = imgWidth / imgHeight;
  const totalHeight = totalWidth / originalAspectRatio; // Force correct aspect ratio
  const rowHeight = totalHeight / halftoneRows;
  const blockWidth = totalWidth / halftoneCols;

  // Set container dimensions for halftone mode
  pre.style.width = totalWidth + 'px';
  pre.style.height = totalHeight + 'px';
  pre.style.display = 'flex';
  pre.style.flexDirection = 'column';
  pre.style.margin = '0';
  pre.style.padding = '0';
  pre.style.overflow = 'hidden';
  pre.style.transform = `scale(${currentZoom / 100})`;
  pre.style.transformOrigin = 'top left';
  pre.style.background = currentHalftoneBgColor;
  pre.style.alignItems = 'stretch'; // Ensure rows stretch to full height
  pre.style.maxWidth = 'none'; // Prevent CSS max-width from interfering

  // Background color
  const bgColor = currentHalftoneBgColor;

  // Get current halftone color (cycle through selected colors)
  let colorIndex = 0;
  const halftoneColors = currentHalftoneColors;
  const numColors = halftoneColors.length;

  for (let row = 0; row < halftoneRows; row++) {
    // Build row with flexbox for touching dots
    let rowHtml = `<div style="display:flex;width:100%;height:${rowHeight}px;margin:0;padding:0;flex-shrink:0;align-items:center;box-sizing:border-box;">`;

    for (let col = 0; col < halftoneCols; col++) {
      // Map halftone coordinates to original image coordinates
      const srcCol = Math.floor(col * cols / halftoneCols);
      const srcRow = Math.floor(row * rows / halftoneRows);

      const { r, g, b } = samplePixel(srcCol, srcRow, cols, rows);

      // Apply color improvement based on setting
      let processedR = r, processedG = g, processedB = b;

      if (currentColorImprovement > 0) {
        switch(parseInt(currentColorImprovement)) {
          case 1: // Strong
            processedR = Math.min(255, r * 1.5);
            processedG = Math.min(255, g * 1.5);
            processedB = Math.min(255, b * 1.5);
            break;
          case 2: // Privilege bright
            if (r + g + b > 382) {
              processedR = Math.min(255, r * 1.3);
              processedG = Math.min(255, g * 1.3);
              processedB = Math.min(255, b * 1.3);
            }
            break;
          case 3: // Privilege dark
            if (r + g + b < 382) {
              processedR = Math.min(255, r * 1.3);
              processedG = Math.min(255, g * 1.3);
              processedB = Math.min(255, b * 1.3);
            }
            break;
          case 4: // Smart
            const avg = (r + g + b) / 3;
            if (avg > 128) {
              processedR = Math.min(255, r * 1.2);
              processedG = Math.min(255, g * 1.2);
              processedB = Math.min(255, b * 1.2);
            }
            break;
          case 5: // Smart channels
            if (r > g && r > b) processedR = Math.min(255, r * 1.2);
            else if (g > r && g > b) processedG = Math.min(255, g * 1.2);
            else if (b > r && b > g) processedB = Math.min(255, b * 1.2);
            break;
          case 6: // Hot colors
            if (r > g && r > b) {
              processedR = Math.min(255, r * 1.5);
              processedG = Math.max(0, g * 0.8);
              processedB = Math.max(0, b * 0.8);
            }
            break;
          case 7: // Smart hot
            if (r > g && r > b && r > 150) {
              processedR = Math.min(255, r * 1.4);
              processedG = Math.max(0, g * 0.7);
              processedB = Math.max(0, b * 0.7);
            }
            break;
          case 8: // Pastel
            processedR = Math.min(255, r + (255 - r) * 0.3);
            processedG = Math.min(255, g + (255 - g) * 0.3);
            processedB = Math.min(255, b + (255 - b) * 0.3);
            break;
        }
      }

      // Apply improvement level
      const levelFactor = 1 + (currentImprovementLevel - 1) * 0.1;
      if (currentColorImprovement > 0 && currentColorImprovement !== 8) {
        processedR = Math.min(255, processedR * levelFactor);
        processedG = Math.min(255, processedG * levelFactor);
        processedB = Math.min(255, processedB * levelFactor);
      }

      // Apply overall style
      if (currentOverallStyle === 'bright') {
        processedR = Math.min(255, processedR + (255 - processedR) * 0.2);
        processedG = Math.min(255, processedG + (255 - processedG) * 0.2);
        processedB = Math.min(255, processedB + (255 - processedB) * 0.2);
      }

      // Calculate brightness for dot size
      const brightness = (processedR + processedG + processedB) / 3;
      let L = brightness / 255;
      L = Math.pow(L, 1 / currentContrast);
      if (currentInvert) L = 1 - L;

      // Dot size based on brightness (larger = brighter)
      const dotDiameter = blockWidth * (0.1 + (L * 0.9));

      // Get halftone color
      let dotColor;
      if (currentUseImageColors) {
        // Use actual image color
        dotColor = `rgb(${Math.round(processedR)},${Math.round(processedG)},${Math.round(processedB)})`;
      } else {
        // Use preset colors
        dotColor = halftoneColors[colorIndex % numColors];
        colorIndex++;
      }

      // Create circular dot centered in fixed-width cell
      const cellWidth = blockWidth;
      const marginSide = (cellWidth - dotDiameter) / 2;
      rowHtml += `<div style="background:${dotColor};width:${dotDiameter}px;height:${dotDiameter}px;border-radius:50%;margin:0 ${marginSide}px;padding:0;flex-shrink:0;"></div>`;
    }

    rowHtml += '</div>';
    parts.push(rowHtml);
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
  // Disable BG button in halftone mode
  btnBg.disabled = currentMode === 'halftone';
}

// ── Persist settings ──
function saveSettings() {
  if (!chromeStorage || !chromeStorage.local) return;
  chromeStorage.local.set({
    textify_settings: {
      fontSize:  currentFontSize,
      width:     currentWidth,
      contrast:  currentContrast,
      invert:    currentInvert,
    inverseImage: currentInverseImage,
    bgWhite:   currentBgWhite,
    spacerRows: currentSpacerRows,
    invertBrightness: currentInvertBrightness,
    zoom:      currentZoom,
    mode:      currentMode,
    // Custom mode settings
    blockColors: currentBlockColors,
    bgColor: currentBgColorCustom,
    rowDensity: currentRowDensity,
    colDensity: currentColDensity,
    hGap: currentHGap,
    orientation: currentOrientation,
    // Halftone mode settings
    colorImprovement: currentColorImprovement,
    improvementLevel: currentImprovementLevel,
    overallStyle: currentOverallStyle,
    halftoneSize: currentHalftoneSize,
    halftoneColors: currentHalftoneColors,
    halftoneBgColor: currentHalftoneBgColor,
    transparentPng: currentTransparentPng,
    useImageColors: currentUseImageColors,
    stippleDensity: currentStippleDensity,
    stippleVariant: currentStippleVariant,
    stippleColor: currentStippleColor,
    stippleBgColor: currentStippleBgColor,
    stippleDotSize: currentStippleDotSize,
    singleLineDensity: currentSingleLineDensity,
    singleLineVariant: currentSingleLineVariant,
    singleLineEngineRevision: 43,
    presetCalibrationRevision: PRESET_CALIBRATION_REVISION,
    stippleClassicRelaxation: currentStippleClassicRelaxation,
    stippleBlueSpacing: currentStippleBlueSpacing,
    stippleDitherTone: currentStippleDitherTone,
    stippleStructureEmphasis: currentStippleStructureEmphasis,
    stippleBlueBg: currentStippleBlueBg,
    stippleDitherPattern: currentStippleDitherPattern,
    tspClassicToneSupport: currentTspClassicToneSupport,
    tspClassicFeatureDetail: currentTspClassicFeatureDetail,
    tspVoronoiTone: currentTspVoronoiTone,
    tspVoronoiSmoothness: currentTspVoronoiSmoothness,
    tspDitherTone: currentTspDitherTone,
    tspDitherPattern: currentTspDitherPattern,
    tspTexturedDirection: currentTspTexturedDirection,
    tspTexturedScale: currentTspTexturedScale,
    singleLineColor: currentSingleLineColor,
    singleLineBgColor: currentSingleLineBgColor,
    singleLineWidth: currentSingleLineWidth,
    // Legacy aliases retained only where they do not overwrite live settings.
    stippleClassicFeature: 50,
    stippleStructureTone: 50
  }
  });
}

function loadSettings() {
  return new Promise(resolve => {
  if (!chromeStorage || !chromeStorage.local) {
    resolve();
    return;
  }

  chromeStorage.local.get('textify_settings', result => {
    if (result.textify_settings) {
      const s = result.textify_settings;
      currentFontSize = s.fontSize  ?? DEFAULTS.fontSize;
      currentWidth    = s.width     ?? DEFAULTS.width;
      currentContrast = clamp(s.contrast ?? DEFAULTS.contrast, 0.2, 4.0);
      currentInvert   = s.invert    ?? DEFAULTS.invert;
      currentInverseImage = s.inverseImage ?? DEFAULTS.inverseImage;
      currentBgWhite  = s.bgWhite   ?? DEFAULTS.bgWhite;
      currentSpacerRows = s.spacerRows ?? DEFAULTS.spacerRows;
      currentInvertBrightness = s.invertBrightness ?? DEFAULTS.invertBrightness;
      currentZoom     = s.zoom      ?? DEFAULTS.zoom;
      currentBlockColors = s.blockColors ?? [...DEFAULTS.blockColors];
      currentBgColorCustom = s.bgColor ?? DEFAULTS.bgColor;
      currentRowDensity = s.rowDensity ?? DEFAULTS.rowDensity;
      currentColDensity = s.colDensity ?? DEFAULTS.colDensity;
      currentHGap = s.hGap ?? DEFAULTS.hGap;
      currentOrientation = s.orientation ?? DEFAULTS.orientation;
      currentColorImprovement = s.colorImprovement ?? DEFAULTS.colorImprovement;
      currentImprovementLevel = s.improvementLevel ?? DEFAULTS.improvementLevel;
      currentOverallStyle = s.overallStyle ?? DEFAULTS.overallStyle;
      currentHalftoneSize = s.halftoneSize ?? DEFAULTS.halftoneSize;
      currentHalftoneColors = s.halftoneColors ?? [...DEFAULTS.halftoneColors];
      currentHalftoneBgColor = s.halftoneBgColor ?? DEFAULTS.halftoneBgColor;
      currentTransparentPng = s.transparentPng ?? DEFAULTS.transparentPng;
      currentUseImageColors = s.useImageColors ?? DEFAULTS.useImageColors;
      currentStippleDensity = s.stippleDensity ?? DEFAULTS.stippleDensity;
      currentStippleVariant = s.stippleVariant ?? DEFAULTS.stippleVariant;
      if (currentStippleVariant === 'even' || currentStippleVariant === 'high-contrast') currentStippleVariant = DEFAULTS.stippleVariant;
      if (!['classic','voronoi','dithered','structure'].includes(currentStippleVariant)) currentStippleVariant = DEFAULTS.stippleVariant;
      currentStippleColor = s.stippleColor ?? DEFAULTS.stippleColor;
      currentStippleBgColor = s.stippleBgColor ?? DEFAULTS.stippleBgColor;
      currentStippleDotSize = s.stippleDotSize ?? DEFAULTS.stippleDotSize;
      currentStippleClassicRelaxation = s.stippleClassicRelaxation ?? CALIBRATION_DEFAULTS.stippleClassicRelaxation;
      currentStippleBlueSpacing = s.stippleBlueSpacing ?? CALIBRATION_DEFAULTS.stippleBlueSpacing;
      currentStippleBlueBg = s.stippleBlueBg ?? CALIBRATION_DEFAULTS.stippleBlueBg;
      currentStippleDitherTone = s.stippleDitherTone ?? CALIBRATION_DEFAULTS.stippleDitherTone;
      currentStippleDitherPattern = s.stippleDitherPattern ?? CALIBRATION_DEFAULTS.stippleDitherPattern;
      currentStippleStructureEmphasis = s.stippleStructureEmphasis ?? CALIBRATION_DEFAULTS.stippleStructureEmphasis;
      const tspNeedsMigration = (s.singleLineEngineRevision ?? 0) < 43;
      currentSingleLineDensity = tspNeedsMigration ? DEFAULTS.singleLineDensity : (s.singleLineDensity ?? DEFAULTS.singleLineDensity);
      if (tspNeedsMigration) {
        currentSingleLineVariant = DEFAULTS.singleLineVariant;
      } else {
        const savedTspVariant = s.singleLineVariant ?? DEFAULTS.singleLineVariant;
        currentSingleLineVariant = savedTspVariant === 'stippled' ? 'voronoi'
          : (savedTspVariant === 'strict-classic' ? 'classic' : savedTspVariant);
      }
      currentSingleLineColor = s.singleLineColor ?? DEFAULTS.singleLineColor;
      currentSingleLineBgColor = s.singleLineBgColor ?? DEFAULTS.singleLineBgColor;
      currentSingleLineWidth = s.singleLineWidth ?? DEFAULTS.singleLineWidth;
      currentTspClassicToneSupport = s.tspClassicToneSupport ?? CALIBRATION_DEFAULTS.tspClassicToneSupport;
      currentTspClassicFeatureDetail = s.tspClassicFeatureDetail ?? CALIBRATION_DEFAULTS.tspClassicFeatureDetail;
      currentTspVoronoiTone = s.tspVoronoiTone ?? CALIBRATION_DEFAULTS.tspVoronoiTone;
      currentTspVoronoiSmoothness = s.tspVoronoiSmoothness ?? CALIBRATION_DEFAULTS.tspVoronoiSmoothness;
      currentTspDitherTone = s.tspDitherTone ?? CALIBRATION_DEFAULTS.tspDitherTone;
      currentTspDitherPattern = s.tspDitherPattern ?? CALIBRATION_DEFAULTS.tspDitherPattern;
      currentTspTexturedDirection = s.tspTexturedDirection ?? CALIBRATION_DEFAULTS.tspTexturedDirection;
      currentTspTexturedScale = s.tspTexturedScale ?? CALIBRATION_DEFAULTS.tspTexturedScale;
      currentStippleClassicRelaxation = clamp(s.stippleClassicRelaxation ?? CALIBRATION_DEFAULTS.stippleClassicRelaxation, 0, 100);
      currentStippleBlueSpacing = clamp(s.stippleBlueSpacing ?? CALIBRATION_DEFAULTS.stippleBlueSpacing, 0, 100);
      currentStippleDitherTone = clamp(s.stippleDitherTone ?? CALIBRATION_DEFAULTS.stippleDitherTone, 0, 100);
      currentStippleStructureEmphasis = clamp(s.stippleStructureEmphasis ?? CALIBRATION_DEFAULTS.stippleStructureEmphasis, 0, 100);
      currentTspClassicToneSupport = clamp(s.tspClassicToneSupport ?? CALIBRATION_DEFAULTS.tspClassicToneSupport, 0, 160);
      currentTspClassicFeatureDetail = clamp(s.tspClassicFeatureDetail ?? CALIBRATION_DEFAULTS.tspClassicFeatureDetail, 0, 160);
      currentTspVoronoiTone = clamp(s.tspVoronoiTone ?? CALIBRATION_DEFAULTS.tspVoronoiTone, 0, 160);
      currentTspVoronoiSmoothness = clamp(s.tspVoronoiSmoothness ?? CALIBRATION_DEFAULTS.tspVoronoiSmoothness, 0, 160);
      currentTspDitherTone = clamp(s.tspDitherTone ?? CALIBRATION_DEFAULTS.tspDitherTone, 0, 100);
      currentTspDitherPattern = clamp(s.tspDitherPattern ?? CALIBRATION_DEFAULTS.tspDitherPattern, 0, 100);
      currentTspTexturedDirection = clamp(s.tspTexturedDirection ?? CALIBRATION_DEFAULTS.tspTexturedDirection, 0, 100);
      currentTspTexturedScale = clamp(s.tspTexturedScale ?? CALIBRATION_DEFAULTS.tspTexturedScale, 0, 100);
      currentTspVoronoiTone = clamp(s.tspVoronoiTone ?? CALIBRATION_DEFAULTS.tspVoronoiTone, 0, 160);
      currentTspDitherTone = clamp(s.tspDitherTone ?? CALIBRATION_DEFAULTS.tspDitherTone, 0, 100);
      currentTspTexturedDirection = clamp(s.tspTexturedDirection ?? CALIBRATION_DEFAULTS.tspTexturedDirection, 0, 100);

      const savedMode = s.mode ?? 'bw';
      const presetNeedsMigration = (s.presetCalibrationRevision ?? 0) < PRESET_CALIBRATION_REVISION;
      if (presetNeedsMigration) {
        // Migrate both experimental preset bundles without letting the inactive
        // mode overwrite the active mode's shared Contrast setting.
        applyStipplePresetDefaults(currentStippleVariant, { preserveColors: true, preserveBackground: true, preserveContrast: true, preserveView: true });
        applySingleLinePresetDefaults(currentSingleLineVariant, { preserveColors: true, preserveBackground: true, preserveContrast: true, preserveView: true });
        // Also reset the preset-specific calibration sliders so old saved values
        // do not silently preserve weak baseline settings from earlier RCs.
        currentStippleClassicRelaxation = CALIBRATION_DEFAULTS.stippleClassicRelaxation;
        currentStippleBlueSpacing = CALIBRATION_DEFAULTS.stippleBlueSpacing;
        currentStippleBlueBg = CALIBRATION_DEFAULTS.stippleBlueBg;
        currentStippleDitherTone = CALIBRATION_DEFAULTS.stippleDitherTone;
        currentStippleStructureEmphasis = CALIBRATION_DEFAULTS.stippleStructureEmphasis;
        currentTspClassicToneSupport = CALIBRATION_DEFAULTS.tspClassicToneSupport;
        currentTspClassicFeatureDetail = CALIBRATION_DEFAULTS.tspClassicFeatureDetail;
        currentTspVoronoiTone = CALIBRATION_DEFAULTS.tspVoronoiTone;
        currentTspVoronoiSmoothness = CALIBRATION_DEFAULTS.tspVoronoiSmoothness;
        currentTspDitherTone = CALIBRATION_DEFAULTS.tspDitherTone;
        currentTspDitherPattern = CALIBRATION_DEFAULTS.tspDitherPattern;
        currentTspTexturedDirection = CALIBRATION_DEFAULTS.tspTexturedDirection;
        currentTspTexturedScale = CALIBRATION_DEFAULTS.tspTexturedScale;
        if (savedMode === 'stipple') {
          const p = getStipplePresetDefaults(currentStippleVariant);
          currentContrast = p.contrast; currentWidth = p.width ?? DEFAULTS.width; currentZoom = p.zoom ?? DEFAULTS.zoom;
        }
        if (savedMode === 'single-line') {
          const p = getSingleLinePresetDefaults(currentSingleLineVariant);
          currentContrast = p.contrast; currentWidth = p.width ?? DEFAULTS.width; currentZoom = p.zoom ?? DEFAULTS.zoom;
        }
      }

      currentMode = savedMode;
    }
    resolve();
  });
  });
}

function setSliderRange(slider, spec) {
  if (!slider || !spec) return;
  slider.min = String(spec[0]);
  slider.max = String(spec[1]);
  slider.step = String(spec[2]);
}

function applyContextualControlRanges() {
  // Universal Contrast receives extra room because the qualified Voronoi value
  // reached the old 3.0 ceiling. Existing values remain valid and unchanged.
  contrastSlider.min = '0.2';
  contrastSlider.max = '4.0';
  contrastSlider.step = '0.1';

  const sr = STIPPLE_CONTROL_RANGES[currentStippleVariant] || STIPPLE_CONTROL_RANGES.classic;
  setSliderRange(stippleDensitySlider, sr.density);
  setSliderRange(stippleSizeSlider, sr.dotSize);
  const stippleStyleSlider = currentStippleVariant === 'classic' ? stippleClassicRelaxationSlider
    : currentStippleVariant === 'voronoi' ? stippleBlueSpacingSlider
    : currentStippleVariant === 'dithered' ? stippleDitherToneSlider
    : stippleStructureEmphasisSlider;
  setSliderRange(stippleStyleSlider, sr.style);

  const tr = SINGLE_LINE_CONTROL_RANGES[currentSingleLineVariant] || SINGLE_LINE_CONTROL_RANGES.classic;
  setSliderRange(singleLineDensitySlider, tr.density);
  setSliderRange(singleLineWidthSlider, tr.lineWidth);
  const first = currentSingleLineVariant === 'classic' ? tspClassicToneSupportSlider
    : currentSingleLineVariant === 'voronoi' ? tspVoronoiToneSlider
    : currentSingleLineVariant === 'dithered' ? tspDitherToneSlider
    : tspTexturedDirectionSlider;
  const second = currentSingleLineVariant === 'classic' ? tspClassicFeatureDetailSlider
    : currentSingleLineVariant === 'voronoi' ? tspVoronoiSmoothnessSlider
    : currentSingleLineVariant === 'dithered' ? tspDitherPatternSlider
    : tspTexturedScaleSlider;
  setSliderRange(first, tr.first);
  setSliderRange(second, tr.second);
}

function syncBooleanButtons() {
  if (btnNegative) {
    btnNegative.classList.toggle('active', currentInverseImage);
    btnNegative.setAttribute('aria-pressed', currentInverseImage ? 'true' : 'false');
    btnNegative.title = currentInverseImage ? 'Negative image is on' : 'Reverse image tones';
  }
  if (btnTransparent) {
    btnTransparent.classList.toggle('active', currentTransparentPng);
    btnTransparent.setAttribute('aria-pressed', currentTransparentPng ? 'true' : 'false');
    btnTransparent.title = currentTransparentPng ? 'Transparent PNG is on' : 'Make saved PNG background transparent';
  }
}

function syncUI() {
  applyContextualControlRanges();
  fontSlider.value     = currentFontSize;
  widthSlider.value    = currentWidth;
  contrastSlider.value = currentContrast;
  inverseImageCheckbox.checked = currentInverseImage;
  spacerSlider.value   = currentSpacerRows;
  zoomSlider.value     = currentZoom;

  fontVal.textContent     = currentFontSize + 'px';
  widthVal.textContent    = currentWidth + '%';
  contrastVal.textContent = currentContrast.toFixed(1);
  spacerVal.textContent   = currentSpacerRows;
  zoomVal.textContent     = currentZoom + '%';

  // Custom mode controls
  blockColorChecks.forEach(check => {
    check.checked = currentBlockColors.includes(check.value);
  });
  bgColorRadios.forEach(radio => {
    radio.checked = radio.value === currentBgColorCustom;
  });
  rowDensitySlider.value = currentRowDensity;
  rowDensityVal.textContent = currentRowDensity;
  colDensitySlider.value = currentColDensity;
  colDensityVal.textContent = currentColDensity;
  hGapSlider.value = currentHGap;
  hGapVal.textContent = currentHGap;

  // Set orientation radio
  orientationRadios.forEach(radio => {
    radio.checked = radio.value === currentOrientation;
  });

  // Halftone mode controls
  colorImprovementSelect.value = currentColorImprovement;
  improvementLevelSelect.value = currentImprovementLevel;
  overallStyleSelect.value = currentOverallStyle;
  halftoneSizeSelect.value = currentHalftoneSize;
  halftoneColorChecks.forEach(check => {
    check.checked = currentHalftoneColors.includes(check.value);
  });
  halftoneBgColorRadios.forEach(radio => {
    radio.checked = radio.value === currentHalftoneBgColor;
  });
  transparentPngCheckbox.checked = currentTransparentPng;
  halftoneColorPicker.value = currentHalftoneColors[0] || '#000000';
  halftoneBgColorPicker.value = currentHalftoneBgColor;
  useImageColorsCheckbox.checked = currentUseImageColors;
  syncBooleanButtons();
  stippleDensitySlider.value = currentStippleDensity;
  stippleDensityVal.textContent = currentStippleDensity;
  if (stippleVariantSelect) stippleVariantSelect.value = currentStippleVariant;
  stippleSizeSlider.value = currentStippleDotSize;
  stippleSizeVal.textContent = currentStippleDotSize.toFixed(1);
  stippleColorPicker.value = currentStippleColor;
  stippleColorVal.textContent = currentStippleColor;
  stippleBgColorPicker.value = currentStippleBgColor;
  stippleBgColorVal.textContent = currentStippleBgColor;
  singleLineDensitySlider.value = currentSingleLineDensity;
  singleLineDensityVal.textContent = currentSingleLineDensity;
  if (singleLineVariantSelect) singleLineVariantSelect.value = currentSingleLineVariant;
  singleLineWidthSlider.value = currentSingleLineWidth;
  singleLineWidthVal.textContent = currentSingleLineWidth.toFixed(2);
  singleLineColorPicker.value = currentSingleLineColor;
  singleLineColorVal.textContent = currentSingleLineColor;
  singleLineBgColorPicker.value = currentSingleLineBgColor;
  singleLineBgColorVal.textContent = currentSingleLineBgColor;
  const syncCalibrationRange = (slider, valueEl, value) => {
    if (slider) slider.value = value;
    if (valueEl) valueEl.textContent = value;
  };
  if (stippleClassicRelaxationSlider && stippleClassicRelaxationVal) syncCalibrationRange(stippleClassicRelaxationSlider, stippleClassicRelaxationVal, currentStippleClassicRelaxation);
  if (stippleBlueSpacingSlider && stippleBlueSpacingVal) syncCalibrationRange(stippleBlueSpacingSlider, stippleBlueSpacingVal, currentStippleBlueSpacing);
  if (stippleDitherToneSlider && stippleDitherToneVal) syncCalibrationRange(stippleDitherToneSlider, stippleDitherToneVal, currentStippleDitherTone);
  if (stippleStructureEmphasisSlider && stippleStructureEmphasisVal) syncCalibrationRange(stippleStructureEmphasisSlider, stippleStructureEmphasisVal, currentStippleStructureEmphasis);
  if (tspClassicToneSupportSlider && tspClassicToneSupportVal) syncCalibrationRange(tspClassicToneSupportSlider, tspClassicToneSupportVal, currentTspClassicToneSupport);
  if (tspClassicFeatureDetailSlider && tspClassicFeatureDetailVal) syncCalibrationRange(tspClassicFeatureDetailSlider, tspClassicFeatureDetailVal, currentTspClassicFeatureDetail);
  if (tspVoronoiToneSlider && tspVoronoiToneVal) syncCalibrationRange(tspVoronoiToneSlider, tspVoronoiToneVal, currentTspVoronoiTone);
  if (tspVoronoiSmoothnessSlider && tspVoronoiSmoothnessVal) syncCalibrationRange(tspVoronoiSmoothnessSlider, tspVoronoiSmoothnessVal, currentTspVoronoiSmoothness);
  if (tspDitherToneSlider && tspDitherToneVal) syncCalibrationRange(tspDitherToneSlider, tspDitherToneVal, currentTspDitherTone);
  if (tspDitherPatternSlider && tspDitherPatternVal) syncCalibrationRange(tspDitherPatternSlider, tspDitherPatternVal, currentTspDitherPattern);
  if (tspTexturedDirectionSlider && tspTexturedDirectionVal) syncCalibrationRange(tspTexturedDirectionSlider, tspTexturedDirectionVal, currentTspTexturedDirection);
  if (tspTexturedScaleSlider && tspTexturedScaleVal) syncCalibrationRange(tspTexturedScaleSlider, tspTexturedScaleVal, currentTspTexturedScale);
  // Disable color checkboxes when using image colors
  halftoneColorChecks.forEach(check => {
    check.disabled = currentUseImageColors;
  });
  halftoneColorPicker.disabled = currentUseImageColors;

  btnInvert.classList.toggle('active', currentInvert);

  modeBtns.forEach(b => b.classList.toggle('active', b.dataset.mode === currentMode));

  // Set body data-mode for CSS
  document.body.dataset.mode = currentMode;
  document.body.dataset.stippleStyle = currentStippleVariant;
  document.body.dataset.tspStyle = currentSingleLineVariant;

  // Disable BG button in halftone mode
  btnBg.disabled = currentMode === 'halftone';

  applyBg();
  applyZoom();
}

// ── Mode toggle ──
modeBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    if (btn.disabled) return;
    currentMode = btn.dataset.mode;
    modeBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.body.dataset.mode = currentMode;
    applyBg();
    applyZoom();
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

inverseImageCheckbox.addEventListener('change', () => {
  currentInverseImage = inverseImageCheckbox.checked;
  syncBooleanButtons();
  saveSettings();
  render();
});

if (btnNegative) btnNegative.addEventListener('click', () => {
  currentInverseImage = !currentInverseImage;
  inverseImageCheckbox.checked = currentInverseImage;
  syncBooleanButtons();
  saveSettings();
  render();
});

if (btnTransparent) btnTransparent.addEventListener('click', () => {
  currentTransparentPng = !currentTransparentPng;
  transparentPngCheckbox.checked = currentTransparentPng;
  syncBooleanButtons();
  saveSettings();
  if (currentMode === 'halftone') render();
});

// ── Background toggle ──
btnBg.addEventListener('click', () => {
  currentBgWhite = !currentBgWhite;
  applyBg();
  saveSettings();
});

// ── Reset ──
btnReset.addEventListener('click', () => {
  // RESET means a reproducible baseline for every mode. Common image controls
  // are restored too, so stored settings cannot silently contaminate QA.
  currentWidth = DEFAULTS.width;
  currentContrast = DEFAULTS.contrast;
  currentInverseImage = DEFAULTS.inverseImage;
  currentZoom = DEFAULTS.zoom;

  // Reset current mode's specific settings.
  if (currentMode === 'halftone') {
    currentColorImprovement = DEFAULTS.colorImprovement;
    currentImprovementLevel = DEFAULTS.improvementLevel;
    currentOverallStyle = DEFAULTS.overallStyle;
    currentHalftoneSize = DEFAULTS.halftoneSize;
    currentHalftoneColors = [...DEFAULTS.halftoneColors];
    currentHalftoneBgColor = DEFAULTS.halftoneBgColor;
    currentTransparentPng = DEFAULTS.transparentPng;
    currentUseImageColors = DEFAULTS.useImageColors;
    currentZoom = DEFAULTS.zoom;
  } else if (currentMode === 'custom') {
    currentBlockColors = [...DEFAULTS.blockColors];
    currentBgColorCustom = DEFAULTS.bgColor;
    currentRowDensity = DEFAULTS.rowDensity;
    currentColDensity = DEFAULTS.colDensity;
    currentHGap = DEFAULTS.hGap;
    currentOrientation = DEFAULTS.orientation;
    currentZoom = DEFAULTS.zoom;
  } else if (currentMode === 'glitch') {
    currentSpacerRows = DEFAULTS.spacerRows;
    currentZoom = DEFAULTS.zoom;
  } else if (currentMode === 'stipple') {
    applyStipplePresetDefaults(currentStippleVariant, { preserveColors: false, preserveBackground: false, preserveContrast: false });
    if (currentStippleVariant === 'classic') {
      currentStippleClassicRelaxation = CALIBRATION_DEFAULTS.stippleClassicRelaxation;
    } else if (currentStippleVariant === 'voronoi') {
      currentStippleBlueSpacing = CALIBRATION_DEFAULTS.stippleBlueSpacing;
      currentStippleBlueBg = CALIBRATION_DEFAULTS.stippleBlueBg;
    } else if (currentStippleVariant === 'dithered') {
      currentStippleDitherTone = CALIBRATION_DEFAULTS.stippleDitherTone;
    } else {
      currentStippleStructureEmphasis = CALIBRATION_DEFAULTS.stippleStructureEmphasis;
    }
  } else if (currentMode === 'single-line') {
    applySingleLinePresetDefaults(currentSingleLineVariant, { preserveColors: false, preserveBackground: false, preserveContrast: false });
    if (currentSingleLineVariant === 'classic') {
      currentTspClassicToneSupport = CALIBRATION_DEFAULTS.tspClassicToneSupport;
      currentTspClassicFeatureDetail = CALIBRATION_DEFAULTS.tspClassicFeatureDetail;
    } else if (currentSingleLineVariant === 'voronoi') {
      currentTspVoronoiTone = CALIBRATION_DEFAULTS.tspVoronoiTone;
      currentTspVoronoiSmoothness = CALIBRATION_DEFAULTS.tspVoronoiSmoothness;
    } else if (currentSingleLineVariant === 'dithered') {
      currentTspDitherTone = CALIBRATION_DEFAULTS.tspDitherTone;
      currentTspDitherPattern = CALIBRATION_DEFAULTS.tspDitherPattern;
    } else {
      currentTspTexturedDirection = CALIBRATION_DEFAULTS.tspTexturedDirection;
      currentTspTexturedScale = CALIBRATION_DEFAULTS.tspTexturedScale;
    }
  } else {
    currentFontSize = DEFAULTS.fontSize;
    currentWidth = DEFAULTS.width;
    currentContrast = DEFAULTS.contrast;
    currentInvert = DEFAULTS.invert;
    currentBgWhite = DEFAULTS.bgWhite;
  }
  // A reset is a clean reproducible baseline, not a reuse of stale geometry.
  stippleGeometryCache = { key: null, points: null };
  singleLineGeometryCache = { key: null, path: null };
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

spacerSlider.addEventListener('input', () => {
  currentSpacerRows = parseInt(spacerSlider.value, 10);
  spacerVal.textContent = currentSpacerRows;
  scheduleRender();
});

zoomSlider.addEventListener('input', () => {
  currentZoom = parseInt(zoomSlider.value, 10);
  zoomVal.textContent = currentZoom + '%';
  applyZoom();
  // Zoom is preview-only. Persist it, but never invalidate/recompute geometry.
  saveSettings();
});

// Custom mode controls
blockColorChecks.forEach(check => {
  check.addEventListener('change', () => {
    currentBlockColors = Array.from(blockColorChecks)
      .filter(c => c.checked)
      .map(c => c.value);
    if (currentBlockColors.length === 0) {
      currentBlockColors = ['#ff0000']; // Default to red if none selected
      check.checked = true;
    }
    scheduleRender();
  });
});

bgColorRadios.forEach(radio => {
  radio.addEventListener('change', () => {
    if (radio.checked) {
      currentBgColorCustom = radio.value;
      scheduleRender();
    }
  });
});

rowDensitySlider.addEventListener('input', () => {
  currentRowDensity = parseInt(rowDensitySlider.value, 10);
  rowDensityVal.textContent = currentRowDensity;
  scheduleRender();
});

colDensitySlider.addEventListener('input', () => {
  currentColDensity = parseInt(colDensitySlider.value, 10);
  colDensityVal.textContent = currentColDensity;
  scheduleRender();
});

hGapSlider.addEventListener('input', () => {
  currentHGap = parseInt(hGapSlider.value, 10);
  hGapVal.textContent = currentHGap;
  scheduleRender();
});

orientationRadios.forEach(radio => {
  radio.addEventListener('change', () => {
    if (radio.checked) {
      currentOrientation = radio.value;
      scheduleRender();
    }
  });
});

// Preset buttons
presetBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const preset = btn.dataset.preset;
    if (preset === 'row-coarse') {
      currentRowDensity = 20;
      rowDensitySlider.value = 20;
      rowDensityVal.textContent = 20;
    } else if (preset === 'row-medium') {
      currentRowDensity = 50;
      rowDensitySlider.value = 50;
      rowDensityVal.textContent = 50;
    } else if (preset === 'row-fine') {
      currentRowDensity = 80;
      rowDensitySlider.value = 80;
      rowDensityVal.textContent = 80;
    } else if (preset === 'col-coarse') {
      currentColDensity = 30;
      colDensitySlider.value = 30;
      colDensityVal.textContent = 30;
    } else if (preset === 'col-medium') {
      currentColDensity = 60;
      colDensitySlider.value = 60;
      colDensityVal.textContent = 60;
    } else if (preset === 'col-fine') {
      currentColDensity = 90;
      colDensitySlider.value = 90;
      colDensityVal.textContent = 90;
    }
    scheduleRender();
  });
});

// Halftone mode controls
colorImprovementSelect.addEventListener('change', () => {
  currentColorImprovement = parseInt(colorImprovementSelect.value, 10);
  scheduleRender();
});

improvementLevelSelect.addEventListener('change', () => {
  currentImprovementLevel = parseInt(improvementLevelSelect.value, 10);
  scheduleRender();
});

overallStyleSelect.addEventListener('change', () => {
  currentOverallStyle = overallStyleSelect.value;
  scheduleRender();
});

halftoneSizeSelect.addEventListener('change', () => {
  currentHalftoneSize = parseInt(halftoneSizeSelect.value, 10);
  scheduleRender();
});

halftoneColorChecks.forEach(check => {
  check.addEventListener('change', () => {
    currentHalftoneColors = Array.from(halftoneColorChecks)
      .filter(c => c.checked)
      .map(c => c.value);
    if (currentHalftoneColors.length === 0) {
      currentHalftoneColors = ['#000000']; // Default to black if none selected
      check.checked = true;
    }
    scheduleRender();
  });
});

halftoneBgColorRadios.forEach(radio => {
  radio.addEventListener('change', () => {
    if (radio.checked) {
      currentHalftoneBgColor = radio.value;
      scheduleRender();
    }
  });
});

transparentPngCheckbox.addEventListener('change', () => {
  currentTransparentPng = transparentPngCheckbox.checked;
});

// Halftone color picker - adds custom color to selected colors
halftoneColorPicker.addEventListener('input', () => {
  const customColor = halftoneColorPicker.value;
  if (!currentHalftoneColors.includes(customColor)) {
    currentHalftoneColors.push(customColor);
  }
  scheduleRender();
});

// Halftone background color picker
halftoneBgColorPicker.addEventListener('input', () => {
  currentHalftoneBgColor = halftoneBgColorPicker.value;
  // Uncheck all radio buttons when using custom color
  halftoneBgColorRadios.forEach(radio => radio.checked = false);
  scheduleRender();
});

// Use image colors checkbox
useImageColorsCheckbox.addEventListener('change', () => {
  currentUseImageColors = useImageColorsCheckbox.checked;
  // Disable color checkboxes when using image colors
  halftoneColorChecks.forEach(check => {
    check.disabled = currentUseImageColors;
  });
  halftoneColorPicker.disabled = currentUseImageColors;
  scheduleRender();
});

stippleDensitySlider.addEventListener('input', () => {
  // Clear geometry cache when density changes
  stippleGeometryCache = { key: null, points: null };
  currentStippleDensity = parseInt(stippleDensitySlider.value, 10);
  stippleDensityVal.textContent = currentStippleDensity;
  scheduleRender();
});

if (stippleVariantSelect) stippleVariantSelect.addEventListener('change', () => {
  // Clear geometry cache when variant changes
  stippleGeometryCache = { key: null, points: null };
  applyStipplePresetDefaults(stippleVariantSelect.value, { preserveColors: true, preserveBackground: true, preserveContrast: false });
  syncUI();
  saveSettings();
  render();
});

stippleSizeSlider.addEventListener('input', () => {
  currentStippleDotSize = parseFloat(stippleSizeSlider.value);
  stippleSizeVal.textContent = currentStippleDotSize.toFixed(1);
  scheduleRender();
});

stippleColorPicker.addEventListener('input', () => {
  currentStippleColor = stippleColorPicker.value;
  stippleColorVal.textContent = currentStippleColor;
  scheduleRender();
});

stippleBgColorPicker.addEventListener('input', () => {
  currentStippleBgColor = stippleBgColorPicker.value;
  stippleBgColorVal.textContent = currentStippleBgColor;
  scheduleRender();
});

singleLineDensitySlider.addEventListener('input', () => {
  // Clear geometry cache when density changes
  singleLineGeometryCache = { key: null, path: null };
  currentSingleLineDensity = parseInt(singleLineDensitySlider.value, 10);
  singleLineDensityVal.textContent = currentSingleLineDensity;
  scheduleRender();
});

if (singleLineVariantSelect) singleLineVariantSelect.addEventListener('change', () => {
  // Clear geometry cache when variant changes
  singleLineGeometryCache = { key: null, path: null };
  applySingleLinePresetDefaults(singleLineVariantSelect.value, { preserveColors: true, preserveBackground: true, preserveContrast: false });
  syncUI();
  saveSettings();
  render();
});

singleLineWidthSlider.addEventListener('input', () => {
  currentSingleLineWidth = parseFloat(singleLineWidthSlider.value);
  singleLineWidthVal.textContent = currentSingleLineWidth.toFixed(2);
  scheduleRender();
});

singleLineColorPicker.addEventListener('input', () => {
  currentSingleLineColor = singleLineColorPicker.value;
  singleLineColorVal.textContent = currentSingleLineColor;
  scheduleRender();
});

singleLineBgColorPicker.addEventListener('input', () => {
  currentSingleLineBgColor = singleLineBgColorPicker.value;
  singleLineBgColorVal.textContent = currentSingleLineBgColor;
  scheduleRender();
});

function applyZoom() {
  pre.style.transform = `scale(${currentZoom / 100})`;
  pre.style.transformOrigin = 'top left';
}

function bindCalibrationRange(slider, valueEl, setter) {
  if (!slider) return;
  slider.addEventListener('input', () => {
    const value = parseInt(slider.value, 10);
    setter(value);
    if (valueEl) valueEl.textContent = value;
    scheduleRender();
  });
}

if (stippleClassicRelaxationSlider && stippleClassicRelaxationVal) bindCalibrationRange(stippleClassicRelaxationSlider, stippleClassicRelaxationVal, v => currentStippleClassicRelaxation = v);
if (stippleBlueSpacingSlider && stippleBlueSpacingVal) bindCalibrationRange(stippleBlueSpacingSlider, stippleBlueSpacingVal, v => currentStippleBlueSpacing = v);
if (stippleDitherToneSlider && stippleDitherToneVal) bindCalibrationRange(stippleDitherToneSlider, stippleDitherToneVal, v => currentStippleDitherTone = v);
if (stippleStructureEmphasisSlider && stippleStructureEmphasisVal) bindCalibrationRange(stippleStructureEmphasisSlider, stippleStructureEmphasisVal, v => currentStippleStructureEmphasis = v);
if (tspClassicToneSupportSlider && tspClassicToneSupportVal) bindCalibrationRange(tspClassicToneSupportSlider, tspClassicToneSupportVal, v => currentTspClassicToneSupport = v);
if (tspClassicFeatureDetailSlider && tspClassicFeatureDetailVal) bindCalibrationRange(tspClassicFeatureDetailSlider, tspClassicFeatureDetailVal, v => currentTspClassicFeatureDetail = v);
if (tspVoronoiToneSlider && tspVoronoiToneVal) bindCalibrationRange(tspVoronoiToneSlider, tspVoronoiToneVal, v => currentTspVoronoiTone = v);
if (tspVoronoiSmoothnessSlider && tspVoronoiSmoothnessVal) bindCalibrationRange(tspVoronoiSmoothnessSlider, tspVoronoiSmoothnessVal, v => currentTspVoronoiSmoothness = v);
if (tspDitherToneSlider && tspDitherToneVal) bindCalibrationRange(tspDitherToneSlider, tspDitherToneVal, v => currentTspDitherTone = v);
if (tspDitherPatternSlider && tspDitherPatternVal) bindCalibrationRange(tspDitherPatternSlider, tspDitherPatternVal, v => currentTspDitherPattern = v);
if (tspTexturedDirectionSlider && tspTexturedDirectionVal) bindCalibrationRange(tspTexturedDirectionSlider, tspTexturedDirectionVal, v => currentTspTexturedDirection = v);
if (tspTexturedScaleSlider && tspTexturedScaleVal) bindCalibrationRange(tspTexturedScaleSlider, tspTexturedScaleVal, v => currentTspTexturedScale = v);

function scheduleRender() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => { saveSettings(); render(); }, 800); // Increased debounce to prevent crashes
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

  let css, content;
  if (currentMode === 'glitch') {
    // Glitch mode needs specific CSS for flexbox layout
    css = `
  body { margin: 0; background: #000000; }
  pre {
    font-family: monospace;
    font-size: ${currentFontSize}px;
    line-height: 1em;
    background: #000000;
    color: #ffffff;
    white-space: pre;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }`;
    content = pre.innerHTML;
  } else if (currentMode === 'stipple') {
    const stippleCanvas = buildStippleCanvas();
    const dataUrl = stippleCanvas.toDataURL('image/png');
    css = `
  body { margin: 0; background: ${bg}; }
  img { display: block; max-width: 100%; height: auto; }
  `;
    content = `<img src="${dataUrl}" alt="Textify stipple render" />`;
  } else if (currentMode === 'single-line') {
    const lineCanvas = buildSingleLineCanvas();
    const dataUrl = lineCanvas.toDataURL('image/png');
    css = `
  body { margin: 0; background: ${bg}; }
  img { display: block; max-width: 100%; height: auto; }
  `;
    content = `<img src="${dataUrl}" alt="Textify single-line render" />`;
  } else if (currentMode === 'custom') {
    // Custom mode needs specific CSS for flexbox layout
    css = `
  body { margin: 0; background: ${currentBgColorCustom}; }
  pre {
    font-family: monospace;
    font-size: ${currentFontSize}px;
    line-height: 1em;
    background: ${currentBgColorCustom};
    color: ${currentBlockColors[0]};
    white-space: pre;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }`;
    content = pre.innerHTML;
  } else if (currentMode === 'halftone') {
    // Halftone mode needs specific CSS for flexbox layout
    css = `
  body { margin: 0; background: ${currentHalftoneBgColor}; }
  pre {
    font-family: monospace;
    font-size: ${currentFontSize}px;
    line-height: 1em;
    background: ${currentHalftoneBgColor};
    color: ${currentHalftoneColors[0]};
    white-space: pre;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }`;
    content = pre.innerHTML;
  } else {
    css = `
  body { margin: 0; background: ${bg}; }
  pre { font-family: monospace; font-size: ${currentFontSize}px; line-height: 1em; background: ${bg}; color: ${fg}; white-space: pre; padding: 4px; }`;
    content = pre.innerHTML;
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Textify</title>
<style>${css}
</style>
</head>
<body><pre>${content}</pre>
</body></html>`;
  triggerDownload(new Blob([html], { type: 'text/html' }), 'textify.html');
});

// ── Save: .png ──
btnPng.addEventListener('click', savePNG);

function savePNG() {
  if (!pixelData) return;

  // Save current zoom state
  const savedZoom = currentZoom;

  const { charW, charH } = measureChar();
  const aspectCorrection  = charW / charH;

  const totalWidth     = document.getElementById('render-wrap').clientWidth;
  const effectiveWidth = Math.floor(totalWidth * (currentWidth / 100));
  const cols = Math.max(10, Math.floor(effectiveWidth / charW));
  const rows = Math.max(1,  Math.floor(cols * (imgHeight / imgWidth) * aspectCorrection));

  // Glitch mode uses different dimensions
  let canvas, ctx;
  if (currentMode === 'stipple') {
    canvas = buildStippleCanvas();
    ctx = canvas.getContext('2d');
  } else if (currentMode === 'single-line') {
    canvas = buildSingleLineCanvas();
    ctx = canvas.getContext('2d');
  } else if (currentMode === 'glitch') {
    const glitchCols = 60;
    const glitchRows = rows;
    const totalWidth = cols * currentFontSize;
    const rowHeight = currentFontSize;
    const spacerHeight = glitchRows * currentSpacerRows * rowHeight;
    const totalHeight = (rows * rowHeight) + spacerHeight;
    const blockWidth = totalWidth / glitchCols;

    canvas = document.createElement('canvas');
    canvas.width = totalWidth;
    canvas.height = totalHeight;
    ctx = canvas.getContext('2d');

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let currentY = 0;
    for (let row = 0; row < glitchRows; row++) {
      // Add spacer rows
      if (row > 0 && currentSpacerRows > 0) {
        for (let s = 0; s < currentSpacerRows; s++) {
          currentY += rowHeight;
        }
      }

      for (let col = 0; col < glitchCols; col++) {
        const srcCol = Math.floor(col * cols / glitchCols);
        const srcRow = Math.floor(row * rows / glitchRows);
        const { r, g, b } = samplePixel(srcCol, srcRow, cols, rows);

        const brightness = (r + g + b) / 3;
        let L = brightness / 255;
        L = Math.pow(L, 1 / currentContrast);
        if (currentInvert) L = 1 - L;
        L = Math.pow(L, 2);
        L = 1 - L;
        const blockHeight = rowHeight * (0.05 + (L * 0.95));

        const isRed = col % 2 === 0;
        const color = isRed ? '#ff0000' : '#00ffff';

        ctx.fillStyle = color;
        const blockY = currentY + (rowHeight - blockHeight) / 2;
        ctx.fillRect(col * blockWidth, blockY, blockWidth, blockHeight);
      }

      currentY += rowHeight;
    }
  } else if (currentMode === 'custom') {
    const customCols = currentColDensity;
    const customRows = Math.floor(rows * (currentRowDensity / 50));
    const totalWidth = cols * currentFontSize;
    const rowHeight = currentFontSize;
    const gapHeight = customRows * currentSpacerRows * rowHeight;
    const totalHeight = (customRows * rowHeight) + gapHeight;
    const blockWidth = totalWidth / customCols;

    canvas = document.createElement('canvas');
    canvas.width = totalWidth;
    canvas.height = totalHeight;
    ctx = canvas.getContext('2d');

    ctx.fillStyle = currentBgColorCustom;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Pre-calculate constants
    const gapWidth = currentHGap > 0 ? currentHGap : 0;
    const blockColors = currentBlockColors;
    const numColors = blockColors.length;
    const isHorizontal = currentOrientation === 'horizontal';

    let currentY = 0;
    let colorIndex = 0;
    for (let row = 0; row < customRows; row++) {
      // Add vertical gap rows
      if (row > 0 && currentSpacerRows > 0) {
        currentY += currentSpacerRows * rowHeight;
      }

      for (let col = 0; col < customCols; col++) {
        const srcCol = Math.floor(col * cols / customCols);
        const srcRow = Math.floor(row * rows / customRows);
        const { r, g, b } = samplePixel(srcCol, srcRow, cols, rows);

        const L = calculateBlockBrightness(r, g, b);
        const blockColor = blockColors[colorIndex % numColors];
        colorIndex++;

        if (isHorizontal) {
          const blockHeight = rowHeight * (0.05 + (L * 0.95));
          const actualBlockWidth = blockWidth - gapWidth;

          ctx.fillStyle = blockColor;
          const blockY = currentY + (rowHeight - blockHeight) / 2;
          const blockX = col * blockWidth + gapWidth / 2;
          ctx.fillRect(blockX, blockY, actualBlockWidth, blockHeight);
        } else {
          const blockWidthVar = blockWidth * (0.05 + (L * 0.95));
          const actualBlockWidth = blockWidthVar - gapWidth;
          const marginSide = (blockWidth - actualBlockWidth) / 2;

          ctx.fillStyle = blockColor;
          const blockX = col * blockWidth + marginSide;
          ctx.fillRect(blockX, currentY, actualBlockWidth, rowHeight);
        }
      }

      currentY += rowHeight;
    }
  } else if (currentMode === 'halftone') {
    const dotSize = currentHalftoneSize;
    const halftoneCols = Math.floor(cols / (dotSize / 12));
    const halftoneRows = rows;
    const totalWidth = cols * currentFontSize;
    const originalAspectRatio = imgWidth / imgHeight;
    const totalHeight = totalWidth / originalAspectRatio; // Force correct aspect ratio
    const rowHeight = totalHeight / halftoneRows;
    const blockWidth = totalWidth / halftoneCols;

    canvas = document.createElement('canvas');
    canvas.width = totalWidth;
    canvas.height = totalHeight;
    ctx = canvas.getContext('2d');

    // Set background color or transparent
    if (currentTransparentPng) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    } else {
      ctx.fillStyle = currentHalftoneBgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Pre-calculate constants
    const halftoneColors = currentHalftoneColors;
    const numColors = halftoneColors.length;
    let colorIndex = 0;

    for (let row = 0; row < halftoneRows; row++) {
      for (let col = 0; col < halftoneCols; col++) {
        const srcCol = Math.floor(col * cols / halftoneCols);
        const srcRow = Math.floor(row * rows / halftoneRows);
        const { r, g, b } = samplePixel(srcCol, srcRow, cols, rows);

        // Apply color improvement based on setting
        let processedR = r, processedG = g, processedB = b;

        if (currentColorImprovement > 0) {
          switch(parseInt(currentColorImprovement)) {
            case 1: // Strong
              processedR = Math.min(255, r * 1.5);
              processedG = Math.min(255, g * 1.5);
              processedB = Math.min(255, b * 1.5);
              break;
            case 2: // Privilege bright
              if (r + g + b > 382) {
                processedR = Math.min(255, r * 1.3);
                processedG = Math.min(255, g * 1.3);
                processedB = Math.min(255, b * 1.3);
              }
              break;
            case 3: // Privilege dark
              if (r + g + b < 382) {
                processedR = Math.min(255, r * 1.3);
                processedG = Math.min(255, g * 1.3);
                processedB = Math.min(255, b * 1.3);
              }
              break;
            case 4: // Smart
              const avg = (r + g + b) / 3;
              if (avg > 128) {
                processedR = Math.min(255, r * 1.2);
                processedG = Math.min(255, g * 1.2);
                processedB = Math.min(255, b * 1.2);
              }
              break;
            case 5: // Smart channels
              if (r > g && r > b) processedR = Math.min(255, r * 1.2);
              else if (g > r && g > b) processedG = Math.min(255, g * 1.2);
              else if (b > r && b > g) processedB = Math.min(255, b * 1.2);
              break;
            case 6: // Hot colors
              if (r > g && r > b) {
                processedR = Math.min(255, r * 1.5);
                processedG = Math.max(0, g * 0.8);
                processedB = Math.max(0, b * 0.8);
              }
              break;
            case 7: // Smart hot
              if (r > g && r > b && r > 150) {
                processedR = Math.min(255, r * 1.4);
                processedG = Math.max(0, g * 0.7);
                processedB = Math.max(0, b * 0.7);
              }
              break;
            case 8: // Pastel
              processedR = Math.min(255, r + (255 - r) * 0.3);
              processedG = Math.min(255, g + (255 - g) * 0.3);
              processedB = Math.min(255, b + (255 - b) * 0.3);
              break;
          }
        }

        // Apply improvement level
        const levelFactor = 1 + (currentImprovementLevel - 1) * 0.1;
        if (currentColorImprovement > 0 && currentColorImprovement !== 8) {
          processedR = Math.min(255, processedR * levelFactor);
          processedG = Math.min(255, processedG * levelFactor);
          processedB = Math.min(255, processedB * levelFactor);
        }

        // Apply overall style
        if (currentOverallStyle === 'bright') {
          processedR = Math.min(255, processedR + (255 - processedR) * 0.2);
          processedG = Math.min(255, processedG + (255 - processedG) * 0.2);
          processedB = Math.min(255, processedB + (255 - processedB) * 0.2);
        }

        // Calculate brightness for dot size
        const brightness = (processedR + processedG + processedB) / 3;
        let L = brightness / 255;
        L = Math.pow(L, 1 / currentContrast);
        if (currentInvert) L = 1 - L;

        // Dot size based on brightness (larger = brighter)
        const dotDiameter = blockWidth * (0.1 + (L * 0.9));

        // Get halftone color
        let dotColor;
        if (currentUseImageColors) {
          // Use actual image color
          dotColor = `rgb(${Math.round(processedR)},${Math.round(processedG)},${Math.round(processedB)})`;
        } else {
          // Use preset colors
          dotColor = halftoneColors[colorIndex % numColors];
          colorIndex++;
        }

        // Draw circular dot centered in fixed-width cell
        const cellWidth = blockWidth;
        const marginSide = (cellWidth - dotDiameter) / 2;
        const centerX = col * blockWidth + blockWidth / 2;
        const centerY = row * rowHeight + rowHeight / 2;
        const radius = dotDiameter / 2;

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fillStyle = dotColor;
        ctx.fill();
      }
    }
  } else {
    canvas = document.createElement('canvas');
    canvas.width  = cols * charW;
    canvas.height = rows * charH;
    ctx = canvas.getContext('2d');

    ctx.fillStyle = currentBgWhite ? '#ffffff' : '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = `${currentFontSize}px monospace`;
    ctx.textBaseline = 'top';

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const { r, g, b } = samplePixel(col, row, cols, rows);
        let ch;
        if (currentMode === 'color-block') {
          ch = '█'; // Always use full block, matching visual rendering
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
  }

  canvas.toBlob(blob => {
    if (blob) {
      const filename = currentMode === 'halftone' && currentTransparentPng
        ? 'textify-transparent.png'
        : 'textify.png';
      triggerDownload(blob, filename);
    }
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
if (!chromeStorage || !chromeStorage.local) {
  pre.textContent = 'No image data found.\nGo back to a page, click the Textify icon, then click an image.';
} else {
  chromeStorage.local.get('textify_payload', async (result) => {
    chromeStorage.local.remove('textify_payload');

    if (!result.textify_payload) {
      pre.textContent = 'No image data found.\nGo back to a page, click the Textify icon, then click an image.';
      return;
    }

    const { dataURL, width, height, renderedWidth, renderedHeight } = result.textify_payload;
    imgWidth  = width;
    imgHeight = height;
    sourceRenderedWidth = renderedWidth || width;
    sourceRenderedHeight = renderedHeight || height;

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
}
