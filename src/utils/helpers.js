// Domain categorization
const workDomains = [
  'github.com', 'gitlab.com', 'bitbucket.org', 'docs.google.com',
  'sheets.google.com', 'drive.google.com', 'notion.so', 'linear.app',
  'figma.com', 'slack.com', 'stackoverflow.com', 'localhost', 'vercel.app'
];

const socialDomains = [
  'twitter.com', 'x.com', 'facebook.com', 'instagram.com', 
  'linkedin.com', 'reddit.com', 'tiktok.com'
];

const entertainmentDomains = [
  'youtube.com', 'netflix.com', 'twitch.tv', 'spotify.com', 
  'hulu.com', 'disneyplus.com'
];

// Domains to block in focus mode
export const distractingDomains = [...socialDomains, ...entertainmentDomains];

export const categorize = (domain) => {
  if (workDomains.some(w => domain.includes(w))) return 'Work';
  if (socialDomains.some(s => domain.includes(s))) return 'Social';
  if (entertainmentDomains.some(e => domain.includes(e))) return 'Entertainment';
  return 'Other';
};

// Beige/Brown theme colors
export const categoryColors = {
  Work: '#5d7a3a',
  Social: '#8b5a2b',
  Entertainment: '#c67c3b',
  Other: '#9a8577'
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