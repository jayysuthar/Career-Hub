# Career Hub

A personal job-hunt dashboard that lives entirely in your browser — no backend, no account, no build step. Track every company you're eyeing, log daily visits, manage contacts, and stay organized without switching between 10 different tabs.

---

## Why Career Hub?

Job hunting is messy. You have a mental list of 30 companies to check, you forget which ones you visited yesterday, you lose that recruiter's email, and you can't remember why you tagged a company as "interesting" three weeks ago.

Career Hub fixes that:

- Every company you care about is in one place with its career page URL, tags, and your own notes
- You see at a glance which pages you've visited today and how consistent your habit is over time
- Contacts (recruiters, hiring managers) are mapped directly to companies so nothing slips through
- Everything is private — your data never leaves your browser

---

## Features

### Company Tracking
- Add any company with a name, career page URL, tag (e.g. Fintech, AI, Health), and a personal note
- Edit or remove companies at any time
- Drag and drop tiles to reorder companies however makes sense to you
- Import an entire Chrome bookmarks folder in one click — if you already have a "Companies" folder bookmarked, export it as HTML and import it directly

### Daily Visit Tracking
- Click "Open career page" on any tile to open it in a new tab — the visit is recorded automatically
- A progress bar in the toolbar shows how many companies you've visited today vs. your total list (e.g. 12 / 47)
- If you accidentally mark a visit, click the green "Visited" chip on the tile to undo it

### Visit History Calendar
- Click the clock icon in the toolbar to open the history calendar
- See which days you were active, a running tally of total visits per month, and today's date highlighted
- Date tracking follows EST timezone

### Contact Management
- Add contacts (recruiters, hiring managers, engineers) and map them to a specific company
- Store name, email, phone (10-digit validation), LinkedIn URL, role/position, and a note per contact
- Click "Contacts" on any company tile to expand a full-width contact table below it
- The active company tile and its contact panel are highlighted in indigo so you always know which company you're viewing
- Edit or delete any contact at any time
- Contacts are sorted alphabetically by name within each company

### Search & Filter
- Search across company names, tags, and notes simultaneously
- Filter by tag with one click — tag pills appear automatically as you add companies
- Search and filter work together

### Dark / Light Mode
- Toggle between light and dark mode with the sun/moon button in the header
- Your preference is saved and restored on next visit
- Works cleanly across all UI elements including buttons, cards, and modals

### Personalized Title
- Click the "Career Hub" title in the header to type your name
- The title updates instantly to "Jay's Career Hub" (or whoever's name you enter)
- The browser tab title updates too
- Press Enter or click away to save, Escape to cancel
- Stored locally — each person who uses their own hosted copy sets their own name

### LinkedIn Quick Access
- Add your LinkedIn profile URL once — stored locally in your browser
- Click the LinkedIn button anytime to jump directly to your profile
- Right-click the button to update the URL
- Anyone hosting their own copy sets their own URL — it's never shared

### US Job Market Pulse
- The "Market pulse" button in the header links to a live US job market visualizer
- Quick way to check macro hiring trends without leaving your workflow

### Privacy First
- Zero backend — all data lives in `localStorage` in your own browser
- Nothing is ever sent to any server
- If you share the GitHub Pages URL with a friend, they get a completely blank dashboard — your data is yours only

---

## Setup

### Option 1 — Run locally (instant, no setup)

```
Open index.html in any modern browser. That's it.
```

### Option 2 — Host on GitHub Pages (access from anywhere)

1. Create a new GitHub repository (e.g. `career-hub`)
2. Push this project to it:

```bash
cd career-hub
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/career-hub.git
git push -u origin main
```

3. Go to your repo → **Settings → Pages**
4. Under **Source**, choose `main` branch and `/ (root)` folder → click **Save**
5. Your dashboard will be live at:

```
https://YOUR_USERNAME.github.io/career-hub/
```

Once hosted, you can access it from any device on any browser. Each browser/device has its own separate `localStorage`, so your data on your laptop won't appear on your phone — and that's fine for a personal tool.

---

## How to use it effectively

**Day 1** — Import your existing bookmarks or add 20–30 companies you want to follow. Tag them by industry or priority.

**Every day** — Open Career Hub first thing. Work through your list, open career pages that look promising. The progress bar tells you how many you've checked today.

**When you spot a role** — Add a note to the company tile ("Applied May 22 — PM role, hybrid NYC"). Update it as things progress.

**When you make a contact** — Add them immediately. Recruiters especially — you want their name, email, and role locked in before you forget.

**Weekly** — Open the history calendar. If you see gaps, you know your consistency slipped. No guilt, just signal.

---

## Project structure

```
career-hub/
├── index.html        — markup and all modals
├── favicon.svg       — browser tab icon
├── css/
│   └── style.css     — all styles, light + dark mode
├── js/
│   └── app.js        — all logic, localStorage, rendering
└── README.md
```

---

## Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl / Cmd + K` | Focus the search bar |
| `Esc` | Close any open modal |
| Right-click LinkedIn button | Edit your saved LinkedIn URL |

---

## Data & localStorage keys

| Key | What it stores |
|---|---|
| `career_hub_companies` | Your company list (name, URL, tag, note, order) |
| `career_hub_visits` | Daily visit log keyed by date |
| `career_hub_emails` | Contacts mapped to companies |
| `career_hub_theme` | Your light/dark preference |
| `career_hub_linkedin` | Your LinkedIn profile URL |
| `career_hub_username` | Your name for the personalized title |

To reset everything, open DevTools → Application → Local Storage → delete all `career_hub_*` keys.
