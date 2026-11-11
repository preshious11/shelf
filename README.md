# Shelf

> A quiet, fast, private library for your X (Twitter) bookmarks.
> 100% free tier: Next.js on Vercel (Hobby), Supabase (Free), Google Gemini Flash API (Free Tier).

---

## Overview

**Shelf** is an intentional, distraction-free library and single-piece triage system for saved tweets. It bypasses the paid Twitter API entirely by using a companion Chrome extension that captures bookmarks directly from `x.com/i/bookmarks` while you are signed into your account.

### Core Principles
* **Quiet & Fast**: The saved tweet is the star, not the app. No dashboards, engagement analytics, follower counts, or vanity charts. Search results update as you type.
* **Inbox-Style Triage**: New bookmarks arrive in **To sort** with an AI-suggested category and explanation. Reviewing them takes one keystroke (`Enter` to accept, `1-9` to pick category, `S` to skip).
* **Keyboard-First**: Press `/` to search, `⌘K` for the command palette, `T` for triage mode.
* **Calm Tone**: Plain, sentence-case English. No upsells, no exclamation marks, no emoji in the UI.
* **Multi-User Ready**: Enforced with Postgres Row Level Security (RLS) on every table so your data is strictly isolated.

---

## Tech Stack

* **Web App**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS
* **Database & Auth**: Supabase (Postgres, Row Level Security, `@supabase/ssr` auth)
* **Search**: PostgreSQL full-text search with generated `tsvector` columns, `GIN` index, and `pg_trgm` for typo-tolerant matching
* **AI Categorization**: Google Gemini API (`gemini-1.5-flash` free tier from Google AI Studio)
* **Chrome Extension**: Manifest V3, TypeScript, Vite, centralized DOM selector config

---

## Step-by-Step Setup Guide

### 1. Supabase Setup (Database & Auth)

1. Create a free Supabase project at [supabase.com](https://supabase.com).
2. Go to **Project Settings > API** and copy:
   * **Project URL** (`https://your-project.supabase.co`)
   * **anon public** key
   * **service_role** secret key
3. **Turn OFF Email Confirmations (Important)**:
   * In your Supabase dashboard, navigate to **Authentication > Providers > Email**.
   * Toggle **"Confirm email"** to **OFF** and click **Save**.
   * *This ensures you can create an account and immediately land directly in your library without confirmation links.*
4. **Apply the Database Migration**:
   * Navigate to **SQL Editor** in your Supabase dashboard.
   * Open the file [`supabase/migrations/20261111000000_initial_schema.sql`](supabase/migrations/20261111000000_initial_schema.sql) in this repository.
   * Copy the entire SQL script, paste it into the Supabase SQL editor, and click **Run**.
   * *This creates the `profiles`, `categories`, `bookmarks`, `tags`, `bookmark_tags`, and `api_tokens` tables, indexes, strict RLS policies, and the onboarding trigger that automatically seeds the 11 default categories on first sign-up.*

---

### 2. Google Gemini API Key (Free)

1. Visit [Google AI Studio](https://aistudio.google.com/).
2. Sign in with your Google account and click **Get API key**.
3. Create an API key in a free-tier Google Cloud project.
4. Copy your key. *The key lives strictly in server environment variables and is never exposed to the client.*
5. Note: The app defaults to `gemini-2.5-flash`. You can customize this with the `GEMINI_MODEL` environment variable.

---

### 3. Local Environment & Installation

1. Clone or navigate to the project directory:
   ```bash
   cd Bookmarker
   ```
2. Create your `.env.local` file from `.env.example`:
   ```bash
   cp .env.example .env.local
   ```
3. Populate `.env.local`:
   ```ini
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
   GEMINI_API_KEY=AIzaSy...
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```
4. Install dependencies and start the development server:
   ```bash
   npm install
   npm run dev
   ```
5. Open [http://localhost:3000](http://localhost:3000) in your browser.
6. You will be redirected to `/login`. Toggle to **"Create account"**, enter your email and password (minimum 8 characters), and click **Create account**.
7. You land immediately in your quiet Shelf library with your default categories initialized!

---

### 4. Chrome Extension Setup

1. Build the extension bundle:
   ```bash
   npm run build:extension
   ```
   *This compiles the Manifest V3 extension with Vite into `extension/dist`.*
2. Open Google Chrome and navigate to:
   ```text
   chrome://extensions
   ```
3. Enable **Developer mode** (toggle in the top-right corner).
4. Click **Load unpacked** (top-left) and select the directory:
   ```text
   <path-to-repository>/extension/dist
   ```
5. Generate an API Token:
   * In your Shelf web app, click **Settings** (bottom left in the sidebar or via `/settings`).
   * Under **Chrome Extension API Tokens**, enter a description (e.g. `Laptop Chrome`) and click **Generate Token**.
   * Copy the raw `shf_...` token. *(It is stored as a SHA-256 hash and won't be shown again).*
6. Configure the Extension:
   * Right-click the Shelf extension icon in your Chrome toolbar and select **Options** (or click the extension icon and select **Options**).
   * Enter your **Shelf Web App URL** (`http://localhost:3000` or your Vercel URL).
   * Paste your **Personal API Token**.
   * Click **Save Configuration**, then click **Test Connection** to verify that your web app accepts the token.

---

### 5. Capturing Your Bookmarks

1. Open [https://x.com/i/bookmarks](https://x.com/i/bookmarks) while signed into X.
2. A discrete floating pill **"Save to Shelf"** will appear in the bottom-right corner.
3. Click **"Save to Shelf"**:
   * The extension automatically scrolls down your bookmarks with human-like randomized delays (1.5 to 3.0 seconds).
   * Tweets are extracted (tweet ID, author name, handle, avatar, text, media, links, thread context).
   * The floating widget displays live count progress: `Saving to Shelf: 14` with a **Stop** button.
   * Bookmarks are ingested in batches of 25 to `POST /api/ingest`.
   * **Incremental Capture**: Once the extension reaches tweets that have already been saved, it stops automatically.
4. Return to your Shelf library: newly captured bookmarks are waiting in **To sort**!

---

### 6. Triage & AI Suggestions

1. Click **To sort** in the sidebar (or press `T` on your keyboard).
2. Click **"Focus Triage"** to enter single-piece flow triage.
3. Click **"AI Suggest Categories"**:
   * Gemini Flash analyzes unsuggested bookmarks against your category names and descriptions.
   * Each suggestion includes a confidence score and a concise single-sentence reason.
   * *AI never auto-assigns; you remain in complete control.*
4. Review with single keystrokes:
   * Press `↵ Enter` to accept the suggestion.
   * Press `1` through `9` to assign a specific category.
   * Press `S` to skip to the next item.
   * Press `←` / `→` to navigate.
   * Use **"Accept all above 80%"** for bulk triage of clear matches.
5. Reach the peaceful **"All sorted"** zero-state.

---

## Keyboard Shortcuts Reference

| Shortcut | Context | Action |
| :--- | :--- | :--- |
| `/` | Anywhere | Focus the search bar instantly |
| `⌘K` or `Ctrl+K` | Anywhere | Open Command Palette (jump to categories, tags, actions) |
| `T` | Library | Jump to "To sort" triage mode |
| `Esc` | Search / Modal | Clear search input / close dialog or palette |
| `↵ Enter` | Triage | Accept suggested category for current bookmark |
| `1` – `9` | Triage | Assign category 1 through 9 directly |
| `S` | Triage | Skip current bookmark |
| `←` / `→` | Triage | Navigate to previous / next bookmark |

---

## Deploying to Vercel

1. Push your repository to GitHub or GitLab.
2. Import the repository in [Vercel](https://vercel.com) (Hobby tier is 100% free).
3. In **Settings > Environment Variables**, add:
   * `NEXT_PUBLIC_SUPABASE_URL` = `https://your-project.supabase.co`
   * `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your Supabase anon key
   * `SUPABASE_SERVICE_ROLE_KEY` = your Supabase service role key
   * `GEMINI_API_KEY` = your Google AI Studio Gemini API key
   * `NEXT_PUBLIC_APP_URL` = your Vercel deployment URL (e.g. `https://shelf.vercel.app`)
4. Deploy!
5. In your Chrome extension options, update the **Shelf Web App URL** to your live Vercel URL.

---

## Data Portability

* **Export**: Go to **Settings** and click **Export All Data (JSON)**. This downloads a complete archive of your categories, tags, and bookmarks with full metadata.
* **Import**: Click **Import Bookmarks (JSON)** to restore from a backup or import existing bookmark exports. Duplicate tweet IDs are automatically deduplicated.

