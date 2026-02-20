import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ChevronLeft, ChevronRight, Flame, Target, Send } from 'lucide-react';
import { categorize, categoryColors, formatTime, getDateKey, calculateStreak, chatWithAI, loadCategoryCache, categorizeDomainsWithAI, getDevApiKey, shouldIgnoreDomain } from '../utils/helpers';
import './App.css';

export default function App() {
  const [trackingData, setTrackingData] = useState({});
  const [settings, setSettings] = useState({});
  const [currentDate, setCurrentDate] = useState(new Date());
  const [streak, setStreak] = useState(0);
  const [messages, setMessages] = useState([{ role: 'ai', text: 'Ask me anything about your productivity! 👋' }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [domains, setDomains] = useState([]);
  const [categorizing, setCategorizing] = useState(false);

  // Developer API key (from .env) - for categorization
  const devApiKey = getDevApiKey();

  useEffect(() => {
    loadData();
  }, []);

  // Re-categorize when date changes
  useEffect(() => {
    if (Object.keys(trackingData).length > 0) {
      categorizeCurrentDay();
    }
  }, [currentDate, trackingData]);

  const loadData = async () => {
    // Load category cache first
    await loadCategoryCache();
    
    const { trackingData: td = {}, settings: s = {} } = await chrome.storage.local.get(['trackingData', 'settings']);
    setTrackingData(td);
    setSettings(s);
    setStreak(calculateStreak(td));
  };

  const categorizeCurrentDay = async () => {
    const dateKey = getDateKey(currentDate);
    const dayData = trackingData[dateKey] || {};
    // Filter out internal browser pages (newtab, chrome://, etc.)
    const domainNames = Object.keys(dayData).filter(k => k !== '_idle' && !shouldIgnoreDomain(k));

    // First render with cached categories
    let domainList = domainNames
      .map(domain => ({
        domain,
        time: dayData[domain].time || 0,
        visits: dayData[domain].visits || 0,
        category: categorize(domain)
      }))
      .sort((a, b) => b.time - a.time);
    
    setDomains(domainList);

    // Categorize with DEV API key (your key from .env)
    if (devApiKey && domainNames.length > 0) {
      setCategorizing(true);
      await categorizeDomainsWithAI(devApiKey, domainNames);
      
      // Re-render with AI categories
      domainList = domainNames
        .map(domain => ({
          domain,
          time: dayData[domain].time || 0,
          visits: dayData[domain].visits || 0,
          category: categorize(domain)
        }))
        .sort((a, b) => b.time - a.time);
      
      setDomains(domainList);
      setCategorizing(false);
    }
  };

  const dateKey = getDateKey(currentDate);
  const dayData = trackingData[dateKey] || {};

  const totalTime = domains.reduce((s, d) => s + d.time, 0);
  const focusTime = domains.filter(d => d.category === 'Work').reduce((s, d) => s + d.time, 0);
  const distractTime = totalTime - focusTime;

  const categoryData = Object.entries(
    domains.reduce((acc, d) => {
      acc[d.category] = (acc[d.category] || 0) + d.time;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  const topSitesData = domains.slice(0, 8).map(d => ({
    name: d.domain.length > 12 ? d.domain.slice(0, 12) + '...' : d.domain,
    time: Math.round(d.time / 60)
  }));

  const prevDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 1);
    setCurrentDate(d);
  };

  const nextDay = () => {
    const d = new Date(currentDate);
    const today = new Date();
    if (getDateKey(d) < getDateKey(today)) {
      d.setDate(d.getDate() + 1);
      setCurrentDate(d);
    }
  };

  const isToday = getDateKey(currentDate) === getDateKey(new Date());
  const focusPercent = totalTime > 0 ? Math.round((focusTime / totalTime) * 100) : 0;
  const goalProgress = Math.min(100, Math.round((focusTime / (settings.dailyGoal || 14400)) * 100));

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(m => [...m, { role: 'user', text: userMsg }]);
    setLoading(true);

    const reply = await chatWithAI(settings.groqApiKey, userMsg, { domains, totalTime, focusTime });
    setMessages(m => [...m, { role: 'ai', text: reply }]);
    setLoading(false);
  };

  const quickPrompts = [
    'What was my most productive time?',
    'How can I improve focus?',
    'Summarize my day'
  ];

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <h1>☕ Fokus Dashboard</h1>
          {streak > 0 && (
            <span className="streak-badge">
              <Flame size={14} /> {streak} day streak
            </span>
          )}
        </div>
        <div className="date-nav">
          <button onClick={prevDay}><ChevronLeft size={20} /></button>
          <span>{isToday ? 'Today' : currentDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
          <button onClick={nextDay} disabled={isToday}><ChevronRight size={20} /></button>
        </div>
      </header>

      {/* Goal Progress (only show for today) */}
      {isToday && (
        <div className="goal-section">
          <div className="goal-header">
            <span><Target size={14} /> Daily Goal Progress</span>
            <span>{formatTime(focusTime)} / {formatTime(settings.dailyGoal || 14400)}</span>
          </div>
          <div className="goal-bar">
            <div className="goal-bar-fill" style={{ width: `${goalProgress}%` }} />
          </div>
          {goalProgress >= 100 && <span className="goal-complete">🎉 Goal achieved!</span>}
        </div>
      )}

      {/* Stats */}
      <div className="stats-row">
        <div className="stat-card">
          <span className="stat-label">Total Time</span>
          <span className="stat-value primary">{formatTime(totalTime)}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Focus Time</span>
          <span className="stat-value success">{formatTime(focusTime)}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Distracted</span>
          <span className="stat-value warning">{formatTime(distractTime)}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Sites Visited</span>
          <span className="stat-value">{domains.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Focus Rate</span>
          <span className={`stat-value ${focusPercent >= 50 ? 'success' : 'danger'}`}>{focusPercent}%</span>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-row">
        <div className="chart-card">
          <h3>Time by Site (minutes)</h3>
          {topSitesData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={topSitesData} layout="vertical">
                <XAxis type="number" tick={{ fill: '#6b5344' }} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#6b5344', fontSize: 12 }} width={100} />
                <Tooltip contentStyle={{ background: '#fff8f0', border: '1px solid #d4c4b0', borderRadius: '8px' }} />
                <Bar dataKey="time" fill="#8b5a2b" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="no-data">No data for this day</div>
          )}
        </div>

        <div className="chart-card">
          <h3>Categories</h3>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={categoryData}
                  dataKey="value"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  label={({ name }) => name}
                >
                  {categoryData.map((entry, i) => (
                    <Cell key={i} fill={categoryColors[entry.name]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ background: '#fff8f0', border: '1px solid #d4c4b0', borderRadius: '8px' }} 
                  formatter={(value) => formatTime(value)}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="no-data">No data for this day</div>
          )}
        </div>
      </div>

      {/* Sites List */}
      <div className="bottom-row">
        <div className="chart-card">
          <h3>All Sites</h3>
          <div className="sites-list">
            {domains.map((d, i) => (
              <div key={i} className="site-row">
                <div className="site-info">
                  <span className="site-name">{d.domain}</span>
                  <span className={`site-cat cat-${d.category.toLowerCase()}`}>{d.category}</span>
                </div>
                <span className="site-time">{formatTime(d.time)}</span>
              </div>
            ))}
            {domains.length === 0 && <div className="no-data">No activity recorded</div>}
          </div>
        </div>

        {/* AI Chat */}
        <div className="chart-card chat-card">
          <h3>🤖 Chat with AI</h3>
          <div className="quick-prompts">
            {quickPrompts.map((p, i) => (
              <button key={i} onClick={() => { setInput(p); }}>{p}</button>
            ))}
          </div>
          <div className="chat-messages">
            {messages.map((m, i) => (
              <div key={i} className={`message ${m.role}`}>{m.text}</div>
            ))}
            {loading && <div className="message ai">Thinking...</div>}
          </div>
          <div className="chat-input">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Ask about your productivity..."
            />
            <button onClick={sendMessage}><Send size={18} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}