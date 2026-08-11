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
  useImageColors: false // Use actual image colors for halftone dots
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
let debounceTimer   = null;

// ── DOM refs ──
const pre            = document.getElementById('ascii-output');
const spinner        = document.getElementById('spinner-overlay');
const modeBtns       = document.querySelectorAll('.mode-btn');
const fontSlider     = document.getElementById('font-size-slider');
const widthSlider    = document.getElementById('width-slider');
const contrastSlider = document.getElementById('contrast-slider');
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
  pre.style.transform = '';
  pre.style.transformOrigin = '';
  pre.style.background = '';
  pre.style.fontSize = currentFontSize + 'px';

  if      (currentMode === 'bw')          renderBW(cols, rows);
  else if (currentMode === 'color-ascii') renderColorASCII(cols, rows);
  else if (currentMode === 'color-block') renderColorBlock(cols, rows);
  else if (currentMode === 'halftone')   renderHalftone(cols, rows);
  else if (currentMode === 'glitch')      renderGlitch(cols, rows);
  else if (currentMode === 'custom')     renderCustom(cols, rows);
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
  chrome.storage.local.set({
    textify_settings: {
      fontSize:  currentFontSize,
      width:     currentWidth,
      contrast:  currentContrast,
      invert:    currentInvert,
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
      useImageColors: currentUseImageColors
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
  // Disable color checkboxes when using image colors
  halftoneColorChecks.forEach(check => {
    check.disabled = currentUseImageColors;
  });
  halftoneColorPicker.disabled = currentUseImageColors;
  
  btnInvert.classList.toggle('active', currentInvert);

  modeBtns.forEach(b => b.classList.toggle('active', b.dataset.mode === currentMode));
  
  // Set body data-mode for CSS
  document.body.dataset.mode = currentMode;

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

// ── Background toggle ──
btnBg.addEventListener('click', () => {
  currentBgWhite = !currentBgWhite;
  applyBg();
  saveSettings();
});

// ── Reset ──
btnReset.addEventListener('click', () => {
  // Reset only current mode's settings
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
  } else {
    currentFontSize = DEFAULTS.fontSize;
    currentWidth = DEFAULTS.width;
    currentContrast = DEFAULTS.contrast;
    currentInvert = DEFAULTS.invert;
    currentBgWhite = DEFAULTS.bgWhite;
  }
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
  scheduleRender();
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

function applyZoom() {
  if (currentMode === 'glitch' || currentMode === 'halftone' || currentMode === 'custom') {
    pre.style.transform = `scale(${currentZoom / 100})`;
    pre.style.transformOrigin = 'top left';
  } else {
    pre.style.transform = '';
  }
}

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

  const { charW, charH } = measureChar();
  const aspectCorrection  = charW / charH;

  const totalWidth     = document.getElementById('render-wrap').clientWidth;
  const effectiveWidth = Math.floor(totalWidth * (currentWidth / 100));
  const cols = Math.max(10, Math.floor(effectiveWidth / charW));
  const rows = Math.max(1,  Math.floor(cols * (imgHeight / imgWidth) * aspectCorrection));

  // Glitch mode uses different dimensions
  let canvas, ctx;
  if (currentMode === 'glitch') {
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
