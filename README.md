# 🎯 Fokus

> AI-powered productivity tracker Chrome extension that helps you understand and improve your browsing habits.

![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-green?logo=googlechrome)
![React](https://img.shields.io/badge/React-18.2-blue?logo=react)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-orange)
![License](https://img.shields.io/badge/License-MIT-yellow)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 📊 **Time Tracking** | Automatically tracks time spent on every website |
| 🧠 **AI Insights** | Get personalized productivity tips powered by Groq AI |
| 💬 **AI Chat** | Chat with AI about your browsing habits |
| 🔒 **Focus Mode** | Block distracting sites with one click |
| 🎯 **Daily Goals** | Set and track daily focus time goals |
| 🔥 **Streak Counter** | Build streaks for consecutive productive days |
| 📈 **Visual Dashboard** | Beautiful charts showing your productivity patterns |

---

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| **React 18** | UI components and state management |
| **Vite** | Fast build tool and dev server |
| **Chrome Extension Manifest V3** | Modern extension architecture |
| **Recharts** | Beautiful, responsive charts |
| **Lucide React** | Clean, consistent icons |
| **Groq API** | Fast AI inference for insights |
| **Chrome Storage API** | Persistent data storage |
| **declarativeNetRequest** | Site blocking for focus mode |

---

## 📁 Project Structure Explained

```
fokus/
├── popup.html              # Entry HTML for popup (click extension icon)
├── dashboard.html          # Entry HTML for full dashboard
├── package.json            # Dependencies and scripts
├── vite.config.js          # Vite build configuration
│
├── public/
│   └── manifest.json       # Chrome extension configuration
│
└── src/
    ├── background/
    │   └── index.js        # Service worker - tracks tabs & time
    │
    ├── popup/
    │   ├── main.jsx        # Popup entry point
    │   ├── App.jsx         # Popup UI component
    │   └── App.css         # Popup styles (beige/brown theme)
    │
    ├── dashboard/
    │   ├── main.jsx        # Dashboard entry point
    │   ├── App.jsx         # Dashboard UI with charts & AI chat
    │   └── App.css         # Dashboard styles
    │
    ├── components/         # Reusable UI components
    │   ├── index.js        # Component exports
    │   ├── StatCard.jsx    # Stats display card
    │   ├── ProgressBar.jsx # Progress indicator
    │   ├── Section.jsx     # Content section wrapper
    │   ├── Button.jsx      # Styled buttons
    │   ├── IconButton.jsx  # Icon-only buttons
    │   └── Modal.jsx       # Modal dialog
    │
    └── utils/
        └── helpers.js      # Utilities: categorize, formatTime, AI calls
```

## 🚀 Getting Started

### Prerequisites
- **Node.js** 18+ installed
- **npm** or **yarn**
- **Google Chrome** browser

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/fokus.git
cd fokus

# 2. Install dependencies
npm install

# 3. Build the extension
npm run build

# 4. Load in Chrome:
#    - Open chrome://extensions/
#    - Enable "Developer mode" (top right)
#    - Click "Load unpacked"
#    - Select the `dist` folder
```

### Development

```bash
# Run development server (for testing UI changes)
npm run dev

# Rebuild after changes
npm run build
```

> **Note:** After running `npm run build`, refresh the extension in `chrome://extensions/` to see changes.

---

## ⚙️ Configuration

### Setting Up AI Features

1. Get a free API key from [Groq Console](https://console.groq.com/)
2. Click the ⚙️ settings icon in the extension popup
3. Paste your API key and save

### Focus Mode

Toggle Focus Mode to block these distracting sites:
- Social: Twitter/X, Facebook, Instagram, LinkedIn, Reddit, TikTok
- Entertainment: YouTube, Netflix, Twitch, Spotify, Hulu, Disney+

### Daily Goal

Set your daily focus time goal in the settings. Default is 4 hours.

---

## 🎨 Color Theme

The extension uses a warm beige/brown palette:

| Color | Hex | Usage |
|-------|-----|-------|
| 🟫 Background | `#f5f0e6` | Main background |
| 🟤 Brown | `#8b5a2b` | Accents, headers |
| 🟢 Green | `#5d7a3a` | Work/Focus indicators |
| 🟠 Orange | `#c67c3b` | Entertainment |
| ⬛ Dark Brown | `#5c4033` | Text, icons |

---

### Category Classification
```javascript
// Domains are classified as:
Work         → github, docs.google, notion, figma, slack...
Social       → twitter, facebook, instagram, reddit...
Entertainment→ youtube, netflix, twitch, spotify...
Other        → Everything else
```

### Focus Percentage Calculation
```
Focus % = (Time on Work sites / Total time) × 100
```

### Streak Calculation
A day counts toward your streak if:
- You had at least 30 minutes of tracked time
- Your focus percentage was 50% or higher

---