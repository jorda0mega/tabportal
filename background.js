// Check if URL is restricted (can't inject content scripts)
function isRestrictedUrl(url) {
  return !url ||
    url.startsWith('chrome://') ||
    url.startsWith('chrome-extension://') ||
    url.startsWith('https://chrome.google.com/webstore') ||
    url.startsWith('edge://') ||
    url.startsWith('about:');
}

// Listen for keyboard shortcut
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'open-tab-portal') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;

    // Check for restricted URLs
    if (isRestrictedUrl(tab.url)) {
      // Open as popup window instead
      chrome.windows.create({
        url: 'popup.html',
        type: 'popup',
        width: 600,
        height: 500,
        focused: true
      });
      return;
    }

    // Try to toggle existing modal first
    try {
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'toggle' });
      if (response?.success) return; // Modal toggled successfully
    } catch (e) {
      // Content script not injected yet, inject it
    }

    // Inject content script and CSS
    try {
      await chrome.scripting.insertCSS({
        target: { tabId: tab.id },
        files: ['content.css']
      });
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });
    } catch (e) {
      console.error('Failed to inject Tab Portal:', e);
    }
  }
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getTabs') {
    getAllTabs().then(sendResponse);
    return true; // Keep channel open for async response
  }

  if (message.action === 'switchToTab') {
    chrome.tabs.update(message.tabId, { active: true });
    chrome.windows.update(message.windowId, { focused: true });
    sendResponse({ success: true });
  }

  if (message.action === 'deleteTab') {
    chrome.tabs.remove(message.tabId).then(() => {
      sendResponse({ success: true });
    }).catch(() => {
      sendResponse({ success: false });
    });
    return true;
  }
});

async function getAllTabs() {
  const tabs = await chrome.tabs.query({});
  const windows = await chrome.windows.getAll();

  const windowNames = new Map();
  windows.forEach((win, index) => {
    windowNames.set(win.id, `Window ${index + 1}`);
  });

  return tabs.map(tab => ({
    id: tab.id,
    windowId: tab.windowId,
    title: tab.title || 'Untitled',
    url: tab.url || '',
    favIconUrl: tab.favIconUrl,
    active: tab.active,
    lastAccessed: tab.lastAccessed || 0,
    windowName: windowNames.get(tab.windowId) || 'Window'
  }));
}
