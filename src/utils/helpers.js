// ============================================
// 🤖 AI-POWERED DOMAIN CATEGORIZATION
// Categories are cached in Chrome storage
// ============================================

// Developer API key (from .env) - Used for category classification
// This is YOUR key, baked into the build
const DEV_API_KEY = import.meta.env.VITE_GROQ_API_KEY || '';

// Get developer API key (for categorization)
export const getDevApiKey = () => DEV_API_KEY;

// Get user API key (for chat/insights) - from settings
export const getUserApiKey = async () => {
  try {
    const { settings = {} } = await chrome.storage.local.get('settings');
    return settings.groqApiKey || '';
  } catch {
    return '';
  }
};

// Valid categories
export const CATEGORIES = ['Work', 'Social', 'Entertainment', 'Other'];

// Domains to ignore (browser internal pages)
const ignoredDomains = [
  'newtab', 'extensions', 'settings', 'history', 'bookmarks', 
  'downloads', 'chrome', 'about', 'blank', 'devtools', 'chrome-extension'
];

// Check if domain should be filtered out
export const shouldIgnoreDomain = (domain) => {
  if (!domain) return true;
  return ignoredDomains.some(ignored => 
    domain === ignored || 
    domain.includes(ignored) ||
    domain.startsWith('chrome') ||
    domain.startsWith('about') ||
    domain.startsWith('edge') ||
    domain.startsWith('brave')
  );
};

// Beige/Brown theme colors
export const categoryColors = {
  Work: '#5d7a3a',
  Social: '#8b5a2b',
  Entertainment: '#c67c3b',
  Other: '#9a8577'
};

// In-memory cache for categories (synced with storage)
let categoryCache = {};

// Load category cache from storage
export const loadCategoryCache = async () => {
  try {
    const { domainCategories = {} } = await chrome.storage.local.get('domainCategories');
    categoryCache = domainCategories;
    return categoryCache;
  } catch {
    return {};
  }
};

// Save category cache to storage
const saveCategoryCache = async () => {
  try {
    await chrome.storage.local.set({ domainCategories: categoryCache });
  } catch {}
};

// Get category from cache (sync - for immediate use)
export const categorize = (domain) => {
  return categoryCache[domain] || 'Other';
};

// AI categorization - calls Groq to categorize a domain
export const categorizeDomainWithAI = async (apiKey, domain) => {
  // Return cached if exists
  if (categoryCache[domain]) {
    return categoryCache[domain];
  }

  // No API key? Return Other
  if (!apiKey) {
    return 'Other';
  }

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{
          role: 'user',
          content: `Categorize this website domain into exactly ONE category.

Domain: ${domain}

Categories:
- Work: coding, documentation, productivity tools, professional sites (github, notion, slack, stackoverflow, jira, figma, google docs, etc.)
- Social: social media, messaging, networking (twitter, facebook, instagram, reddit, linkedin, discord, etc.)
- Entertainment: videos, streaming, games, music, news, shopping (youtube, netflix, twitch, spotify, amazon, etc.)
- Other: anything that doesn't fit above

Reply with ONLY the category name, nothing else. Just one word: Work, Social, Entertainment, or Other.`
        }],
        max_tokens: 10,
        temperature: 0
      })
    });

    const json = await res.json();
    const response = json.choices?.[0]?.message?.content?.trim() || 'Other';
    
    // Extract valid category from response
    const category = CATEGORIES.find(c => 
      response.toLowerCase().includes(c.toLowerCase())
    ) || 'Other';
    
    // Cache the result
    categoryCache[domain] = category;
    await saveCategoryCache();
    
    return category;
  } catch {
    return 'Other';
  }
};

// Batch categorize multiple domains at once (more efficient)
export const categorizeDomainsWithAI = async (apiKey, domains) => {
  // Filter out already cached domains
  const uncachedDomains = domains.filter(d => !categoryCache[d]);
  
  if (uncachedDomains.length === 0) {
    return categoryCache;
  }

  if (!apiKey) {
    // No API key - set all to Other
    uncachedDomains.forEach(d => { categoryCache[d] = 'Other'; });
    return categoryCache;
  }

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{
          role: 'user',
          content: `Categorize each website domain into exactly ONE category.

Domains:
${uncachedDomains.map((d, i) => `${i + 1}. ${d}`).join('\n')}

Categories:
- Work: coding, documentation, productivity tools, professional sites
- Social: social media, messaging, networking
- Entertainment: videos, streaming, games, music, news, shopping
- Other: anything that doesn't fit above

Reply in this exact format, one per line:
domain1: Category
domain2: Category
...

Only use: Work, Social, Entertainment, or Other.`
        }],
        max_tokens: 200,
        temperature: 0
      })
    });

    const json = await res.json();
    const response = json.choices?.[0]?.message?.content || '';
    
    // Parse response
    response.split('\n').forEach(line => {
      const match = line.match(/^(.+?):\s*(Work|Social|Entertainment|Other)/i);
      if (match) {
        const domain = match[1].trim().replace(/^\d+\.\s*/, '');
        const category = CATEGORIES.find(c => 
          c.toLowerCase() === match[2].toLowerCase()
        ) || 'Other';
        
        // Find matching domain (fuzzy match)
        const matchedDomain = uncachedDomains.find(d => 
          d.includes(domain) || domain.includes(d)
        );
        if (matchedDomain) {
          categoryCache[matchedDomain] = category;
        }
      }
    });
    
    // Set remaining uncached to Other
    uncachedDomains.forEach(d => {
      if (!categoryCache[d]) categoryCache[d] = 'Other';
    });
    
    await saveCategoryCache();
    return categoryCache;
  } catch {
    uncachedDomains.forEach(d => { categoryCache[d] = 'Other'; });
    return categoryCache;
  }
};

// Manually override a domain's category
export const setDomainCategory = async (domain, category) => {
  if (CATEGORIES.includes(category)) {
    categoryCache[domain] = category;
    await saveCategoryCache();
  }
};

// Distracting domains (for Focus Mode) - Social + Entertainment
export const isDistractingSite = (domain) => {
  const category = categorize(domain);
  return category === 'Social' || category === 'Entertainment';
};

export const formatTime = (seconds) => {
  if (!seconds || seconds < 1) return '0m';
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m`;
};

export const getTodayKey = () => new Date().toISOString().split('T')[0];

export const getDateKey = (date) => date.toISOString().split('T')[0];

// Calculate streak of consecutive days with >50% focus time
export const calculateStreak = (trackingData) => {
  let streak = 0;
  const today = new Date();
  
  for (let i = 1; i <= 365; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateKey = getDateKey(date);
    const dayData = trackingData[dateKey];
    
    if (!dayData) break;
    
    const domains = Object.entries(dayData)
      .filter(([k]) => k !== '_idle')
      .map(([domain, d]) => ({
        domain,
        time: d.time || 0,
        category: categorize(domain)
      }));
    
    const totalTime = domains.reduce((sum, d) => sum + d.time, 0);
    const focusTime = domains.filter(d => d.category === 'Work').reduce((sum, d) => sum + d.time, 0);
    
    if (totalTime < 1800) break;
    
    const focusPercent = (focusTime / totalTime) * 100;
    
    if (focusPercent >= 50) {
      streak++;
    } else {
      break;
    }
  }
  
  return streak;
};

// Fetch AI insight from Groq
export const getAIInsight = async (apiKey, data) => {
  if (!apiKey || !data.totalTime) return null;
  
  const topSites = data.domains
    .slice(0, 5)
    .map(d => `${d.domain}: ${formatTime(d.time)}`)
    .join(', ');
  
  const focusPercent = data.totalTime > 0 
    ? Math.round((data.focusTime / data.totalTime) * 100) 
    : 0;

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{
          role: 'user',
          content: `You're a productivity coach. Give ONE specific insight (max 20 words). Top sites: ${topSites}. Focus: ${focusPercent}%. Total: ${formatTime(data.totalTime)}.`
        }],
        max_tokens: 50,
        temperature: 0.7
      })
    });

    const json = await res.json();
    return json.choices?.[0]?.message?.content || null;
  } catch {
    return null;
  }
};

// Chat with AI
export const chatWithAI = async (apiKey, message, data) => {
  if (!apiKey) return 'Add your Groq API key in settings first!';

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { 
            role: 'system', 
            content: `You're a productivity coach. Answer concisely (max 40 words). Data: ${JSON.stringify(data.domains.slice(0, 10))}` 
          },
          { role: 'user', content: message }
        ],
        max_tokens: 100,
        temperature: 0.7
      })
    });

    const json = await res.json();
    return json.choices?.[0]?.message?.content || 'Could not process that.';
  } catch {
    return 'Error connecting to AI.';
  }
};