// ScriptPad — Background Service Worker (Manifest V3)

// Open side panel when the extension icon is clicked
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
  .catch(err => console.error('Failed to set panel behavior:', err));

// Handle keyboard shortcut — the _execute_action command opens the popup by default,
// but we override it to open the side panel instead
chrome.action.onClicked.addListener(async (tab) => {
  try {
    await chrome.sidePanel.open({ tabId: tab.id });
  } catch (err) {
    console.error('Failed to open side panel:', err);
  }
});

// Listen for messages from popup/sidepanel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'openSidePanel') {
    chrome.sidePanel.open({ tabId: sender.tab?.id })
      .then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // Keep message channel open for async response
  }
});
