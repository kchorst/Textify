// background.js — Textify service worker

// Track injected tabs to handle re-injection gracefully
const injectedTabs = new Set();

// Toolbar icon click — inject content script into active tab
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;

  // Guard: don't inject into chrome:// or extension pages
  if (!tab.url || tab.url.startsWith('chrome') || tab.url.startsWith('chrome-extension')) {
    return;
  }

  try {
    // If already injected, content.js will handle the re-injection guard itself
    await chrome.scripting.insertCSS({
      target: { tabId: tab.id },
      files: ['content.css']
    });

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });

    injectedTabs.add(tab.id);
  } catch (err) {
    console.error('Textify: injection failed', err);
  }
});

// Clean up tracking when tab closes
chrome.tabs.onRemoved.addListener((tabId) => {
  injectedTabs.delete(tabId);
});

// Message listener — content.js sends 'open_output' after storing pixel data
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'open_output') {
    const outputUrl = chrome.runtime.getURL('output.html');
    chrome.tabs.create({ url: outputUrl });
    sendResponse({ ok: true });
  }
});
