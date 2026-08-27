// content.js — Textify
// Injected on demand by background.js when the toolbar icon is clicked.
// Responsibilities:
//   1. Find all visible images on the page
//   2. Overlay each with a hover target (.textify-overlay)
//   3. On click: draw image to canvas → encode as JPEG data URL
//      → write { dataURL, width, height } to chrome.storage.local as 'textify_payload'
//      → send 'open_output' to background → background opens output.html

(function () {

  // ── Guard: don't run twice in the same page context ──
  if (window.__textifyLoaded) return;
  window.__textifyLoaded = true;

  // ── Config ──
  const MIN_SIZE = 100;         // px — both dimensions must meet this minimum
  const MAX_DIM  = 1000;        // px — longest side cap before PNG encoding

  // ── Toast ──
  function showToast(msg) {
    let toast = document.getElementById('textify-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'textify-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('textify-toast-visible');
    clearTimeout(toast.__timer);
    toast.__timer = setTimeout(() => {
      toast.classList.remove('textify-toast-visible');
    }, 3000);
  }

  // ── Build overlays ──
  function getImages() {
    return Array.from(document.querySelectorAll('img')).filter((img) => {
      if (!img.complete || !img.naturalWidth) return false;
      const rect = img.getBoundingClientRect();
      // Use the larger of natural size and rendered size for the threshold
      const w = Math.max(img.naturalWidth, rect.width);
      const h = Math.max(img.naturalHeight, rect.height);
      return w >= MIN_SIZE && h >= MIN_SIZE; // both dimensions must qualify
    });
  }

  function buildOverlay(img) {
    // Position the overlay to sit exactly over the image using its bounding rect.
    // We use position:absolute relative to the document so it follows the image
    // even if the image is inside a scrolled container.
    const rect = img.getBoundingClientRect();
    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;

    const overlay = document.createElement('div');
    overlay.className = 'textify-overlay';
    overlay.style.left   = (rect.left + scrollX) + 'px';
    overlay.style.top    = (rect.top  + scrollY) + 'px';
    overlay.style.width  = rect.width  + 'px';
    overlay.style.height = rect.height + 'px';

    const label = document.createElement('span');
    label.className = 'textify-overlay-label';
    label.textContent = '[ TEXTIFY ]';
    overlay.appendChild(label);

    overlay.addEventListener('click', () => handleClick(img, overlay, label));

    return overlay;
  }

  // ── Attach overlays ──
  let overlayContainer = null;
  let overlaysVisible = true;

  function attachOverlays() {
    // Remove any existing overlays first (re-scan)
    if (overlayContainer) overlayContainer.remove();

    overlayContainer = document.createElement('div');
    overlayContainer.id = 'textify-overlay-container';
    overlayContainer.style.cssText =
      'position:absolute;top:0;left:0;width:0;height:0;pointer-events:none;z-index:2147483646;';
    document.body.appendChild(overlayContainer);

    const imgs = getImages();
    if (!imgs.length) {
      showToast('No images found on this page.');
      return;
    }

    imgs.forEach((img) => {
      const overlay = buildOverlay(img);
      overlayContainer.appendChild(overlay);
    });
  }

  function removeOverlays() {
    if (overlayContainer) {
      overlayContainer.remove();
      overlayContainer = null;
    }
    showToast('Textify overlays removed');
  }

  function toggleOverlays() {
    if (overlaysVisible) {
      removeOverlays();
      overlaysVisible = false;
    } else {
      attachOverlays();
      overlaysVisible = true;
      showToast('Textify overlays enabled');
    }
  }

  // ── Handle click: capture → store → open output ──
  function handleClick(img, overlay, label) {
    // Prevent double-clicks
    if (overlay.classList.contains('textify-loading')) return;

    overlay.classList.add('textify-loading');
    label.textContent = 'Processing…';

    // Preserve both natural processing size and the browser-rendered reference size.
    const sourceRect = img.getBoundingClientRect();
    const renderedWidth = Math.max(1, Math.round(sourceRect.width));
    const renderedHeight = Math.max(1, Math.round(sourceRect.height));
    let srcWidth  = img.naturalWidth  || img.width;
    let srcHeight = img.naturalHeight || img.height;

    // ── Min size guard ──
    if (srcWidth < MIN_SIZE || srcHeight < MIN_SIZE) {
      overlay.classList.remove('textify-loading');
      label.textContent = '[ TEXTIFY ]';
      showToast(`Image is too small to Textify (minimum ${MIN_SIZE}×${MIN_SIZE}px).`);
      return;
    }

    // ── Max dimension cap: scale down if longest side exceeds MAX_DIM ──
    let scaled = false;
    if (Math.max(srcWidth, srcHeight) > MAX_DIM) {
      const ratio = MAX_DIM / Math.max(srcWidth, srcHeight);
      srcWidth  = Math.round(srcWidth  * ratio);
      srcHeight = Math.round(srcHeight * ratio);
      scaled = true;
    }

    const canvas = document.createElement('canvas');
    canvas.width  = srcWidth;
    canvas.height = srcHeight;
    const ctx = canvas.getContext('2d');

    // drawImage can fail on cross-origin images without CORS headers.
    // We wrap in try/catch and also listen for the security error via taint.
    let drawn = false;
    try {
      ctx.drawImage(img, 0, 0, srcWidth, srcHeight);
      // Attempt to read a pixel — this will throw if the canvas is tainted.
      ctx.getImageData(0, 0, 1, 1);
      drawn = true;
    } catch (e) {
      drawn = false;
    }

    if (!drawn) {
      overlay.classList.remove('textify-loading');
      label.textContent = '[ TEXTIFY ]';
      showToast('Image is cross-origin and cannot be processed.');
      return;
    }

    // ── Encode as PNG to avoid JPEG compression artifacts in ASCII output ──
    const dataURL = canvas.toDataURL('image/png');

    if (scaled) {
      showToast(`Image scaled down to ${srcWidth}×${srcHeight}px for processing.`);
    }

    const payload = { dataURL, width: srcWidth, height: srcHeight, renderedWidth, renderedHeight };

    chrome.storage.local.set({ textify_payload: payload }, () => {
      if (chrome.runtime.lastError) {
        overlay.classList.remove('textify-loading');
        label.textContent = '[ TEXTIFY ]';
        showToast('Storage error: ' + chrome.runtime.lastError.message);
        return;
      }

      chrome.runtime.sendMessage({ action: 'open_output' }, () => {
        // Reset overlay after a short delay so the user can see the loading state
        setTimeout(() => {
          overlay.classList.remove('textify-loading');
          label.textContent = '[ TEXTIFY ]';
        }, 800);
      });
    });
  }

  // ── Message listener for toggle ──
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'toggle_overlays') {
      toggleOverlays();
      sendResponse({ ok: true });
    }
  });

  // ── Init ──
  // If the DOM isn't ready yet, wait for it.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attachOverlays);
  } else {
    attachOverlays();
  }

})();
