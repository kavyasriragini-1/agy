# 📢 BigQuery Release Notes Curator Dashboard

A sleek, responsive, and modern web application that fetches, parses, and formats the latest release notes from Google Cloud BigQuery, allowing users to curate and compose safe posts to share on X (Twitter).

---

## 🤖 Attribution & Course Info

This project was built entirely using **Antigravity** (Google DeepMind's agentic AI coding assistant) as part of the:
🎓 **5-Day AI Agents: Intensive Vibe Coding Course With Google and Kaggle**

---

## ✨ Features

- **Automated RSS Fetching**: Live retrieval of Google Cloud's BigQuery release notes XML feed (`https://docs.cloud.google.com/feeds/bigquery-release-notes.xml`).
- **Dynamic Content Splicing**: Parses HTML blobs from the Atom feed, breaking down updates by entry type headers (`Feature`, `Announcement`, `Issue`, `Change`, `General`) into clean individual cards.
- **Advanced Filtering & Search**: Instant full-text search and badge classification filtering tabs (All, Features, Announcements, Issues, Changes).
- **Smart Tweet Composer**: 
  - Generates predefined templates incorporating the release category, release date, and deep-linked references.
  - **Character Limit Guard**: Automatically calculates remaining character space out of the 280-char limit after adding tags/links, and safely truncates the description text using `...` so posts never overflow.
  - Suggested Hashtag Pills: Toggleable tags (`#BigQuery`, `#GoogleCloud`, `#GCP`, etc.) that insert/remove themselves into the tweet content dynamically.
  - Actionable copy-to-clipboard buttons and one-click redirection to X Web Intent sharing.
- **Glassmorphic UI**: Beautiful dark-theme design utilizing Outfits/Jakarta Google Fonts, smooth scaling animations, and loading animations.

---

## 💻 Tech Stack

- **Backend**: Python Flask
- **Frontend**: Vanilla HTML5, CSS3, JavaScript (ES6)
- **Data Source**: BigQuery Atom Feed (XML)

---

## 🚀 Getting Started

### Prerequisites
- Python 3.10+ installed

### Setup & Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/kavyasriragini-1/agy.git
   cd agy/bq_release_notes
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Start the Flask server**:
   ```bash
   python app.py
   ```

4. **Open in browser**:
   Navigate to **`http://localhost:5000`** in your browser.