
let activeTabId = null;
let activeTabUrl = null;
let activeTabStart = null;
let isIdle = false;

// Distracting domains to block in focus mode
const distractingDomains = [
  'twitter.com', 'x.com', 'facebook.com', 'instagram.com',
  'linkedin.com', 'reddit.com', 'tiktok.com',
  'youtube.com', 'netflix.com', 'twitch.tv', 'spotify.com',
  'hulu.com', 'disneyplus.com'
];

// Initialize
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    trackingData: {},
    settings: { 
      idleThreshold: 60, 
      groqApiKey: '',
      dailyGoal: 14400, // 4 hours in seconds
      focusModeEnabled: false
    }
  });
});

// Listen for focus mode changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.settings) {
    const newSettings = changes.settings.newValue;
    const oldSettings = changes.settings.oldValue || {};
    
    if (newSettings.focusModeEnabled !== oldSettings.focusModeEnabled) {
      updateBlockingRules(newSettings.focusModeEnabled);
    }
  }
});

// Update blocking rules based on focus mode
async function updateBlockingRules(enabled) {
  // Remove existing rules first
  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
  const existingRuleIds = existingRules.map(rule => rule.id);
  
  if (existingRuleIds.length > 0) {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: existingRuleIds
    });
  }
  
  if (enabled) {
    // Add blocking rules for distracting sites
    const rules = distractingDomains.map((domain, index) => ({
      id: index + 1,
      priority: 1,
      action: { type: 'block' },
      condition: {
        urlFilter: `*://*.${domain}/*`,
        resourceTypes: ['main_frame']
      }
    }));
    
    await chrome.declarativeNetRequest.updateDynamicRules({
      addRules: rules
    });
  }
}

// Initialize blocking rules on startup
chrome.storage.local.get('settings').then(({ settings }) => {
  if (settings?.focusModeEnabled) {
    updateBlockingRules(true);
  }
});

// Extract domain from URL
const getDomain = (url) => {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch { return null; }
};

// Get today's date key
const getTodayKey = () => new Date().toISOString().split('T')[0];

// Save time spent
async function saveTimeSpent(domain, seconds) {
  if (!domain || seconds < 1) return;
  
  const { trackingData = {} } = await chrome.storage.local.get('trackingData');
  const today = getTodayKey();
  
  if (!trackingData[today]) trackingData[today] = {};
  if (!trackingData[today][domain]) {
    trackingData[today][domain] = { time: 0, visits: 0 };
  }
  
  trackingData[today][domain].time += seconds;
  trackingData[today][domain].visits += 1;
  
  await chrome.storage.local.set({ trackingData });
}

// Record current tab time
async function recordCurrentTab() {
  if (activeTabUrl && activeTabStart && !isIdle) {
    const domain = getDomain(activeTabUrl);
    const elapsed = Math.floor((Date.now() - activeTabStart) / 1000);
    await saveTimeSpent(domain, elapsed);
  }
  activeTabStart = Date.now();
}

// Tab activated
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  await recordCurrentTab();
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    activeTabId = activeInfo.tabId;
    activeTabUrl = tab.url;
    activeTabStart = Date.now();
  } catch {}
});

// Tab URL changed
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (tabId === activeTabId && changeInfo.url) {
    await recordCurrentTab();
    activeTabUrl = changeInfo.url;
    activeTabStart = Date.now();
  }
});

// Window focus changed
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    await recordCurrentTab();
    activeTabStart = null;
  } else {
    try {
      const [tab] = await chrome.tabs.query({ active: true, windowId });
      if (tab) {
        activeTabId = tab.id;
        activeTabUrl = tab.url;
        activeTabStart = Date.now();
      }
    } catch {}
  }
});

// Idle detection
chrome.idle.onStateChanged.addListener(async (state) => {
  if (state === 'idle' || state === 'locked') {
    await recordCurrentTab();
    isIdle = true;
  } else {
    isIdle = false;
    activeTabStart = Date.now();
  }
});

// Set idle threshold
chrome.storage.local.get('settings').then(({ settings }) => {
  chrome.idle.setDetectionInterval(settings?.idleThreshold || 60);
});

// Periodic save every 30 seconds
setInterval(async () => {
  if (!isIdle) await recordCurrentTab();
}, 30000);