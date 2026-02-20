import { useState, useEffect, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Settings, BarChart3, Shield, ShieldOff, Flame, Target, Brain } from 'lucide-react';
import { categorize, categoryColors, formatTime, getTodayKey, calculateStreak, getAIInsight, loadCategoryCache, categorizeDomainsWithAI, getDevApiKey, shouldIgnoreDomain } from '../utils/helpers';
import './App.css';

export default function App() {
  const [data, setData] = useState({ domains: [], totalTime: 0, focusTime: 0 });
  const [settings, setSettings] = useState({ idleThreshold: 60, dailyGoal: 14400, focusModeEnabled: false, groqApiKey: '' });
  const [showSettings, setShowSettings] = useState(false);
  const [goalInput, setGoalInput] = useState(4);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [streak, setStreak] = useState(0);
  const [focusMode, setFocusMode] = useState(false);
  const [insight, setInsight] = useState('');
  const [categorizing, setCategorizing] = useState(false);

  // Developer API key (from .env) - for categorization
  const devApiKey = getDevApiKey();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { trackingData = {}, settings: s = {} } = await chrome.storage.local.get(['trackingData', 'settings']);
    setSettings(s);
    setGoalInput(Math.round((s.dailyGoal || 14400) / 3600));
    setApiKeyInput(s.groqApiKey || '');
    setFocusMode(s.focusModeEnabled || false);

    // Load cached categories first
    await loadCategoryCache();

    const today = getTodayKey();
    const todayData = trackingData[today] || {};
    // Filter out internal browser pages (newtab, chrome://, etc.)
    const domainNames = Object.keys(todayData).filter(k => k !== '_idle' && !shouldIgnoreDomain(k));

    // First render with cached categories
    let domains = domainNames
      .map(domain => ({
        domain,
        time: todayData[domain].time || 0,
        category: categorize(domain)
      }))
      .sort((a, b) => b.time - a.time);

    let totalTime = domains.reduce((sum, d) => sum + d.time, 0);
    let focusTime = domains.filter(d => d.category === 'Work').reduce((sum, d) => sum + d.time, 0);
    setData({ domains, totalTime, focusTime });

    // Calculate streak with current categories
    const currentStreak = calculateStreak(trackingData);
    setStreak(currentStreak);

    // Categorize domains with DEV API key (your key from .env)
    if (devApiKey && domainNames.length > 0) {
      setCategorizing(true);
      await categorizeDomainsWithAI(devApiKey, domainNames);
      
      // Re-render with AI categories
      domains = domainNames
        .map(domain => ({
          domain,
          time: todayData[domain].time || 0,
          category: categorize(domain)
        }))
        .sort((a, b) => b.time - a.time);

      totalTime = domains.reduce((sum, d) => sum + d.time, 0);
      focusTime = domains.filter(d => d.category === 'Work').reduce((sum, d) => sum + d.time, 0);
      
      const newData = { domains, totalTime, focusTime };
      setData(newData);
      setCategorizing(false);
    }

    // Get AI insight with USER's API key (from settings)
    if (s.groqApiKey && totalTime > 60) {
      const aiInsight = await getAIInsight(s.groqApiKey, { domains, totalTime, focusTime });
      setInsight(aiInsight || 'Keep going!');
    }
  };

  const saveSettings = async () => {
    const newSettings = { 
      ...settings, 
      dailyGoal: goalInput * 3600,
      groqApiKey: apiKeyInput
    };
    await chrome.storage.local.set({ settings: newSettings });
    setSettings(newSettings);
    setShowSettings(false);
    loadData();
  };

  const toggleFocusMode = async () => {
    const newFocusMode = !focusMode;
    setFocusMode(newFocusMode);
    const newSettings = { ...settings, focusModeEnabled: newFocusMode };
    await chrome.storage.local.set({ settings: newSettings });
    setSettings(newSettings);
  };

  const openDashboard = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
  };

  const categoryData = useMemo(() => 
    Object.entries(
      data.domains.reduce((acc, d) => {
        acc[d.category] = (acc[d.category] || 0) + d.time;
        return acc;
      }, {})
    ).map(([name, value]) => ({ name, value })),
    [data.domains]
  );

  const distractTime = useMemo(() => data.totalTime - data.focusTime, [data.totalTime, data.focusTime]);
  const focusPercent = useMemo(() => 
    data.totalTime > 0 ? Math.round((data.focusTime / data.totalTime) * 100) : 0,
    [data.totalTime, data.focusTime]
  );
  const goalProgress = useMemo(() => 
    Math.min(100, Math.round((data.focusTime / (settings.dailyGoal || 14400)) * 100)),
    [data.focusTime, settings.dailyGoal]
  );

  return (
    <div className="popup">
      {/* Header */}
      <div className="header">
        <div className="header-left">
          <h1>☕ Fokus</h1>
          {streak > 0 && (
            <span className="streak-badge">
              <Flame size={12} /> {streak} day{streak > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="header-right">
          <button 
            className={`icon-btn ${focusMode ? 'focus-active' : ''}`} 
            onClick={toggleFocusMode}
            title={focusMode ? 'Disable Focus Mode' : 'Enable Focus Mode'}
          >
            {focusMode ? <Shield size={16} /> : <ShieldOff size={16} />}
          </button>
          <button className="icon-btn" onClick={() => setShowSettings(true)}>
            <Settings size={16} />
          </button>
        </div>
      </div>

      {/* Focus Mode Banner */}
      {focusMode && (
        <div className="focus-mode-banner">
          <Shield size={14} /> Focus Mode Active - Distracting sites blocked
        </div>
      )}

      {/* Daily Goal Progress */}
      <div className="goal-section">
        <div className="goal-header">
          <span><Target size={12} /> Daily Goal</span>
          <span>{formatTime(data.focusTime)} / {formatTime(settings.dailyGoal || 14400)}</span>
        </div>
        <div className="goal-bar">
          <div 
            className="goal-bar-fill" 
            style={{ width: `${goalProgress}%` }}
          />
        </div>
        {goalProgress >= 100 && <span className="goal-complete">🎉 Goal achieved!</span>}
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-value primary">{formatTime(data.totalTime)}</span>
          <span className="stat-label">Total</span>
        </div>
        <div className="stat-card">
          <span className="stat-value success">{formatTime(data.focusTime)}</span>
          <span className="stat-label">Focus</span>
        </div>
        <div className="stat-card">
          <span className="stat-value warning">{formatTime(distractTime)}</span>
          <span className="stat-label">Distracted</span>
        </div>
      </div>

      {/* Focus Progress Bar */}
      {data.totalTime > 0 && (
        <div className="focus-bar">
          <div 
            className="focus-bar-fill" 
            style={{ width: `${focusPercent}%` }}
          />
          <span className="focus-bar-text">{focusPercent}% focused</span>
        </div>
      )}

      {/* Main Content */}
      <div className="main-content">
        {/* Chart */}
        <div className="section">
          <div className="section-title">Categories</div>
          {categoryData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={120}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="value"
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={50}
                  >
                    {categoryData.map((entry, i) => (
                      <Cell key={i} fill={categoryColors[entry.name]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="category-legend">
                {categoryData.map((entry, i) => (
                  <span key={i} className="legend-item">
                    <span className="legend-dot" style={{ background: categoryColors[entry.name] }} />
                    {entry.name}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <div className="no-data">No data yet</div>
          )}
        </div>

        {/* Top Sites */}
        <div className="section">
          <div className="section-title">Top Sites</div>
          <div className="top-sites">
            {data.domains.slice(0, 4).map((d, i) => (
              <div key={i} className="site-item">
                <span className="site-name">{d.domain.slice(0, 15)}</span>
                <span className="site-time">{formatTime(d.time)}</span>
              </div>
            ))}
            {data.domains.length === 0 && <div className="no-data">Start browsing!</div>}
          </div>
        </div>
      </div>

      {/* AI Insight */}
      <div className="ai-box">
        <div className="ai-header">
          <Brain size={14} /> AI Insight
        </div>
        <p className="ai-text">
          {settings.groqApiKey 
            ? (insight || 'Analyzing...') 
            : 'Add Groq API key in settings →'}
        </p>
      </div>

      {/* Dashboard Button */}
      <button className="primary-btn" onClick={openDashboard}>
        <BarChart3 size={16} /> Open Dashboard
      </button>

      {/* Settings Modal */}
      {showSettings && (
        <div className="modal">
          <h2>Settings</h2>
          
          <label>Daily Focus Goal (hours)</label>
          <input
            type="number"
            min="1"
            max="12"
            value={goalInput}
            onChange={(e) => setGoalInput(Math.max(1, Math.min(12, parseInt(e.target.value) || 1)))}
          />
          <p className="hint">Set your daily focus time target</p>
          
          <label>Groq API Key</label>
          <input
            type="password"
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            placeholder="gsk_..."
          />
          <p className="hint">Free at console.groq.com</p>
          
          <div className="btn-row">
            <button className="secondary-btn" onClick={() => setShowSettings(false)}>Cancel</button>
            <button className="primary-btn" onClick={saveSettings}>Save</button>
          </div>
        </div>
      )}
    </div>
  );
}