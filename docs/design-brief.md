# Shelf — Design Brief & Visual Identity

> A quiet, fast, private library for X (Twitter) bookmarks.
> Documented before implementation to ensure intentional, non-generic craft.

---

## 1. Borrowed Insights from Design References

* **mymind (`mymind.com`)**: The sensation of a private sanctuary. Generous whitespace, zero advertisement or corporate chrome, and a feeling that this is personal memory storage rather than a public social feed.
* **Raindrop.io (`raindrop.io`)**: Clean, pragmatic library structure. A disciplined sidebar (To sort, All, Pinned, Unread, Categories with live item counts, Tags) and efficient information density for scaling to thousands of saved items.
* **Superhuman (`superhuman.com`)**: Single-piece flow triage. A focused, distraction-free "To sort" review mode with instant single-key execution (`Enter` to accept, `1-9` to pick category, `S` to skip, arrow keys to navigate), turning sorting into a fast, satisfying ritual culminating in a peaceful zero-state.
* **Linear (`linear.app`)**: Craft, speed, and precision. `Cmd/Ctrl+K` command palette, instant local search filtering, 1px crisp borders instead of muddy shadows, and seamless keyboard navigation.
* **dewey. (`getdewey.co`)**: Practical extension capture mechanics. A discrete floating button directly inside `x.com/i/bookmarks`, paced incremental scrolling with randomized human-like delay, live progress counters, and immediate stop controls—stripped of all marketing upsells.
* **ContextBolt (`contextbolt.com/bookmarks`)**: Intelligent assistance without loss of agency. AI-driven categorization suggestions paired with one-sentence rationales and confidence scores, empowering rapid user acceptance while preserving total user control.

---

## 2. Color System: Quiet Architectural Palette

We deliberately reject the generic AI tropes: no purple/indigo gradients, no neon cyan accents, and no terracotta/clay approximations. Instead, Shelf uses an archival, paper-and-ink inspired palette anchored by a quiet, deep petroleum accent for active states.

### Light Mode
* `--bg-canvas`: `#FBFBFA` (Warm architectural paper off-white; calm and easy on the eyes)
* `--bg-surface`: `#FFFFFF` (Crisp white for reading cards and dialogs)
* `--border-subtle`: `#E5E5E3` (1px hairline division with no heavy drop shadows)
* `--text-primary`: `#18181B` (Deep carbon ink, high-contrast, razor-sharp legibility)
* `--text-muted`: `#71717A` (Neutral stone for handles, timestamps, and secondary metadata)
* `--accent`: `#0284C7` (Muted petrol blue for focus rings, active filters, and triage hotkeys)

### Dark Mode
* `--bg-canvas`: `#0C0C0E` (Deep obsidian/carbon base; restful, zero glare)
* `--bg-surface`: `#16161A` (Graphite surface for elevated cards and sidebars)
* `--border-subtle`: `#26262B` (Subtle boundary border maintaining structure in darkness)
* `--text-primary`: `#F4F4F5` (Clean parchment white)
* `--text-muted`: `#A1A1AA` (Balanced secondary gray with WCAG AA compliance)
* `--accent`: `#38BDF8` (Clear atmospheric sky accent for keyboard focus rings and selection)

---

## 3. Typography & Hierarchy

Shelf uses two free Google Fonts:
1. **Primary Interface & Content Font**: `Plus Jakarta Sans` — a crisp, modern humanist sans-serif with open apertures and clean geometric proportions that excels in both UI controls and long-form tweet reading.
2. **Monospace Font (Micro/Technical)**: `JetBrains Mono` — reserved exclusively for keyboard shortcut indicators (`/`, `Enter`, `S`, `1-9`, `⌘K`), confidence scores, and API tokens.

### Type Scale
* **Display / View Title**: 20px / 1.3, SemiBold (Subdued and purposeful, never shouting)
* **Section Heading**: 13px / 1.4, Medium, Sentence Case (Subtle navigation labels)
* **Tweet Body Text**: 15px / 1.5, Normal (Generous line height, strictly under 75 characters per line)
* **Author Name**: 14px / 1.4, SemiBold
* **Author Handle & Timestamps**: 13px / 1.4, Normal, Muted
* **Category & Tag Chips**: 12px / 1.3, Medium, Sentence Case
* **Keyboard Hotkeys & Confidence Badges**: 11px / 1.2, Mono, Medium

---

## 4. ASCII Wireframes

### Main Screen (Library & Search)

```
+----------------------------------------------------------------------------------------------------+
| [ Shelf ]                                 [ / Search your bookmarks...                 ]  [Settings]
+-------------------+--------------------------------------------------------------------------------+
|                   | Filters: [ All ] [ Has Media ] [ Threads ] [ Unread ] [ Category v ]  Sort: [v]|
| LIBRARY           +--------------------------------------------------------------------------------+
|   To sort     (14)| @karpathy  ·  Andrej Karpathy  ·  May 14, 2024                    [Unread] [Pin]
|   All        (382)| ------------------------------------------------------------------------------
|   Pinned       (7)| "LLM OS is a useful mental model for modern systems. The CPU is the LLM,      |
|   Unread      (89)|  RAM is the context window, and storage is disk/web search..."                 |
|                   |                                                                                |
| CATEGORIES        | [ AI & Tech ]  [ #llm ]  [ #systems ]                         Note: Revisit for |
|   AI & Tech  (142)| Open on x.com ↗                                               paper draft       |
|   Programming (88)|+-------------------------------------------------------------------------------+
|   Design      (45)| @shadcn  ·  shadcn  ·  Apr 2, 2024                                       [Pin]  |
|   Finance     (23)| ------------------------------------------------------------------------------ |
|   + New category  | "Craft isn't about adding decoration; it's about eliminating distraction       |
|                   |  until only the essential remains."                                            |
| TAGS              |                                                                                |
|   #typescript (34)| [ Design ]  [ #craft ]                                                         |
|   #llm        (28)| Open on x.com ↗                                                                |
+-------------------+--------------------------------------------------------------------------------+
| Press "/" to search  ·  "⌘K" for commands  ·  "T" to triage To sort                                |
+----------------------------------------------------------------------------------------------------+
```

### "To sort" Screen (Single-Piece Flow Triage)

```
+----------------------------------------------------------------------------------------------------+
| [ < Back to Library ]                   TO SORT (1 of 14 remaining)                      [Settings]|
+----------------------------------------------------------------------------------------------------+
|                                                                                                    |
|             +------------------------------------------------------------------------+             |
|             | @geoffreyhinton  ·  Geoffrey Hinton  ·  Jun 10, 2024                   |             |
|             | ---------------------------------------------------------------------- |             |
|             | "A brief reflection on neural network scaling limits and inductive     |             |
|             |  biases in biological vs artificial systems..."                        |             |
|             |                                                                        |             |
|             | [View media attachment - 1 image]                                      |             |
|             |                                                                        |             |
|             | ---------------------------------------------------------------------- |             |
|             | Gemini Suggestion:  [ AI & Tech ]  (94% confidence)                    |             |
|             | Reason: Post discusses neural network architectures and scaling limits.|             |
|             +------------------------------------------------------------------------+             |
|                                                                                                    |
|   HOTKEYS:                                                                                         |
|   [ ↵ Enter ] Accept suggestion (AI & Tech)      [ S ] Skip for now      [ ← / → ] Prev / Next     |
|                                                                                                    |
|   OR CHOOSE CATEGORY:                                                                              |
|   [ 1 ] AI & Tech      [ 2 ] Programming     [ 3 ] Startups        [ 4 ] Design                    |
|   [ 5 ] Career         [ 6 ] Finance         [ 7 ] Health          [ 8 ] Threads                   |
|                                                                                                    |
|   [ Accept all suggestions above 85% confidence (11 items) ]                                       |
+----------------------------------------------------------------------------------------------------+
```

### Auth Screen (`/login`)

```
+----------------------------------------------------------------------------------------------------+
|                                                                                                    |
|                                         [ Shelf ]                                                  |
|                               Your private bookmark library.                                       |
|                                                                                                    |
|                             +--------------------------------+                                     |
|                             | [ Sign in ]    Create account  |                                     |
|                             | ------------------------------ |                                     |
|                             | Email                          |                                     |
|                             | [ user@example.com           ] |                                     |
|                             |                                |                                     |
|                             | Password                       |                                     |
|                             | [ ••••••••••••••••           ] |                                     |
|                             |                                |                                     |
|                             | [ Continue                   ] |                                     |
|                             +--------------------------------+                                     |
|                                                                                                    |
|                               Single user. Instant entry.                                          |
+----------------------------------------------------------------------------------------------------+
```

---

## 5. Three Core Design Principles Specific to Shelf

1. **The Library is a Quiet Room, Not a Dashboard**
   Saved tweets are saved for contemplation, reference, and synthesis. Shelf intentionally excludes vanity analytics, follower counts, charts, graphs, or gamified progress badges. The content of the tweet is the primary visual element; chrome exists only to support reading and retrieval.
2. **Speed is Craft**
   Finding a half-remembered tweet should take less than three seconds. The search bar is instantly activated with `/`, results filter client-side as you type without jarring layout shifts, and triage operates with zero mouse dependency. Transitions are snappy and respect `prefers-reduced-motion`.
3. **AI Proposes, You Decide**
   Google Gemini models categorize incoming bookmarks in the background and explain *why* in a single sentence, but they never overwrite user decisions or auto-file without consent. Once an item is sorted, it is permanent and quiet.

---

## 6. Review Against `frontend-design` Skill

| Standard Generic AI / SaaS Default | Shelf Intentional Design Choice | Rationale |
| :--- | :--- | :--- |
| **Purple/Indigo gradients & blur glows** | Crisp solid canvas (`#FBFBFA` / `#0C0C0E`) with hairline borders (`#E5E5E3` / `#26262B`). | Shelf feels like a physical library of crisp paper and archival ink, avoiding ephemeral SaaS trends. |
| **Tracked-out ALL CAPS labels** (`CATEGORIES`, `OVERVIEW`, `STATS`) | Natural sentence-case typographic hierarchy (`Categories`, `To sort`, `Tags`). | Eliminates visual tension and avoids the generic "marketing dashboard" aesthetic. |
| **Identical floating cards with soft shadows** (`shadow-md`, `rgba(0,0,0,0.08)`) | High-clarity bordered containers with minimal elevation; hierarchy driven by typography and spatial rhythm. | Clean contrast that renders fast, prevents visual noise, and mirrors editorial quality. |
| **Emoji in interface copy** ("Awesome job! 🎉", "Inbox Zero! 🚀") | Plain, calm English: "All sorted", "Saved", "To sort". | Dignified, quiet tone that respects the user's focus and intelligence. |
| **Multi-step onboarding wizards & email loops** | Single clean login box with instant sign-in and direct landing in the library. | Frictionless entry. No marketing hurdles between the user and their bookmarks. |

