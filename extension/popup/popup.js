// ScriptPad — Popup Script
document.getElementById('openPanelBtn').addEventListener('click', async () => {
  // Try to open the side panel
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      await chrome.sidePanel.open({ tabId: tab.id });
      window.close();
    }
  } catch (err) {
    // Fallback: send message to background
    chrome.runtime.sendMessage({ action: 'openSidePanel' }, () => {
      window.close();
    });
  }
});
