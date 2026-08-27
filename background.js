// background.js — Textify service worker
// Release hardening: do not rely on in-memory tab tracking because Manifest V3
// service workers may be suspended and restarted at any time.

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;

  // Guard: Chrome internal/extension pages cannot accept normal script injection.
  if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
    return;
  }

  // First try the existing content-script listener. This remains reliable even
  // after the service worker itself has restarted.
  try {
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'toggle_overlays' });
    if (response && response.ok) return;
  } catch (_) {
    // No listener in this page yet: inject below.
  }

  try {
    await chrome.scripting.insertCSS({
      target: { tabId: tab.id },
      files: ['content.css']
    });

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });
  } catch (err) {
    console.error('Textify: injection failed', err);
  }
});

// content.js sends 'open_output' after storing the selected image payload.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'open_output') {
    const outputUrl = chrome.runtime.getURL('output.html');
    chrome.tabs.create({ url: outputUrl });
    sendResponse({ ok: true });
  }
});
