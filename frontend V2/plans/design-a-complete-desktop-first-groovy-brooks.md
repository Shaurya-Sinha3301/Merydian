# Merydian — Production Frontend Plan

## Context

MerYDiaN is an AI-powered itinerary optimization platform. The frontend is enterprise software — not a travel booking UI. AI proposes itinerary optimizations; humans review, understand, and approve them. Every design decision optimizes for usability and readability, not visual impressiveness.

---

## Design Language

**Almost monochrome. Borders, not shadows. Typography, not color.**

- Primary palette: white / black / gray
- Color used only for meaning:
  - **Green** — approved, success
  - **Yellow** — pending, review
  - **Red** — failed, error
  - **Blue** — selected nav item, primary action button
- No gradients. No glassmorphism. No illustrations. No travel imagery. No decorative backgrounds.
- Borders separate sections. Font weight and spacing create hierarchy.

**Typography**: `Plus Jakarta Sans` (display/headings) · `Inter` (body/UI) · `Geist Mono` (data, logs, diffs, status codes)

**Layout**: Sidebar (240px) + Top navigation + Main workspace. Desktop-first; tablet and mobile supported; no horizontal scrolling. 8pt spacing system throughout.

---

## Architecture

**Strict layer contract**: `Page → Feature → Hook → Service → HTTP Client → Backend DTO`

Pages orchestrate features. Features own business logic. Components are reusable primitives. No page-specific components unless unavoidable. No duplicated UI. No `any` types. No mock APIs — services are wired to real backend endpoints from day one.

### Two Workflows

**Customer**: Login → Dashboard → Trip Overview → Timeline → Feedback → Optimization Progress → Diff Review → Explainability → Approve

**Agent**: Login → Dashboard → Assigned Trips → Review Queue → Diff → Explainability → Approve / Reject

### File Structure

```
src/
  App.tsx                          # Root: routing state (currentPage) + dark mode on <html>
  index.css                        # Google Fonts @import (line 1), Tailwind, CSS vars

  lib/
    http.ts                        # Fetch wrapper: auth headers, error normalization
    types.ts                       # All shared DTOs: Trip, Optimization, TimelineActivity,
                                   #   DiffChange, ExplanationStep, AgentJob, Traveler

  services/
    trips.service.ts
    optimization.service.ts
    timeline.service.ts
    feedback.service.ts
    explainability.service.ts
    agents.service.ts

  components/
    layout/
      AppShell.tsx                 # Sidebar + topnav composition
      Navigation.tsx               # Logo, search, notifications, profile
      Sidebar.tsx                  # Nav items, dark mode toggle, user info
      Breadcrumbs.tsx
    ui/
      Button.tsx                   # primary | secondary | ghost | destructive; sm | md | lg; loading state
      Card.tsx                     # Border-based card, no shadow; optional AI-tinted variant
      Badge.tsx                    # approved | pending | failed | review | ai
      StatusBadge.tsx              # Pill with colored dot + label
      MetricCard.tsx               # Label, value, delta — used in dashboard strips
      EmptyState.tsx               # Icon + title + description + optional action
      LoadingState.tsx             # Skeleton shimmer
      ErrorState.tsx               # Error message + retry action
      Table.tsx                    # Typed sortable table primitive
      Modal.tsx                    # Accessible modal with overlay
      Drawer.tsx                   # Right-side slide-in drawer

  features/
    authentication/
      LoginForm.tsx
    dashboard/
      CustomerDashboard.tsx        # Optimization Center → Metrics → Trips → Queue → AI Recs → Activity
      AgentDashboard.tsx           # Queue → Pending Approvals → Customer List → Activity
    trips/
      TripCard.tsx                 # Compact trip row/card: name, dates, health, status
      TripOverview.tsx             # Trip header + travelers + budget bar + timeline preview + health
      TravelerCard.tsx
    timeline/
      Timeline.tsx                 # Vertical timeline orchestrator
      TimelineCard.tsx             # Day separator card
      TimelineActivity.tsx         # Single block: transport | hotel | meal | activity + status
      TimelineWarning.tsx          # Inline conflict/warning row
    feedback/
      FeedbackPanel.tsx            # AI suggestion list + preference controls + history
    optimization/
      OptimizationProgress.tsx     # Progress ring (SVG) + pipeline stage list + log terminal
      JobProgressCard.tsx          # Queue item card
    diff/
      DiffViewer.tsx               # Previous Plan → Reason → Updated Plan → Impact → Approve
      DiffCard.tsx                 # Single change: before value, reason, after value, impact tags
    explainability/
      ExplainabilityPanel.tsx      # NL paragraph + confidence + constraints + steps + approval
      ExplanationCard.tsx          # Single reasoning step (expandable)
      ApprovalCard.tsx             # Approve / Request Changes + comment
    settings/
      Settings.tsx                 # Tabs: General | Notifications | AI Prefs | Team | Billing

  pages/
    LoginPage.tsx
    CustomerDashboardPage.tsx
    AgentDashboardPage.tsx
    TripOverviewPage.tsx
    TimelinePage.tsx
    FeedbackPage.tsx
    OptimizationProgressPage.tsx
    DiffViewerPage.tsx
    ExplainabilityPage.tsx
    SettingsPage.tsx
```

---

## Build Order

**Rule: implement → compile (`npx tsc --noEmit`) → fix → verify UI → continue. Never move on with broken code.**

### Phase 1: Foundation
1. `src/index.css` — Google Fonts @import on line 1, Tailwind import, `@theme inline` block, light/dark CSS var blocks
2. `src/lib/types.ts` — all shared DTOs shaped like real backend responses
3. `src/lib/http.ts` — fetch wrapper with auth header injection and typed error handling
4. `src/services/*.ts` — all six service modules, typed signatures, wired to real endpoints
5. `src/App.tsx` — minimal shell: `currentPage` state, dark mode effect, AppShell render
6. `components/layout/` — Navigation, Sidebar, AppShell, Breadcrumbs

### Phase 2: Complete UI Component Library (before any feature page)
7. Button, Card, Badge, StatusBadge — core primitives
8. MetricCard, EmptyState, LoadingState, ErrorState — states every feature needs
9. Table, Modal, Drawer — structural components

### Phase 3: Domain Components (before any feature page)
10. TripCard, TravelerCard
11. TimelineCard, TimelineActivity, TimelineWarning
12. JobProgressCard, DiffCard
13. ExplanationCard, ApprovalCard

### Phase 4: Customer Workflow (fully complete before Agent workflow)
14. LoginForm → LoginPage
15. CustomerDashboard → CustomerDashboardPage
16. TripOverview → TripOverviewPage
17. Timeline → TimelinePage
18. FeedbackPanel → FeedbackPage
19. OptimizationProgress → OptimizationProgressPage
20. DiffViewer → DiffViewerPage
21. ExplainabilityPanel → ExplainabilityPage

### Phase 5: Agent Workflow
22. AgentDashboard → AgentDashboardPage

### Phase 6: Settings + Polish
23. Settings → SettingsPage
24. Responsive pass (1024px, 768px breakpoints)
25. Framer Motion: page enter, card appear, progress ring fill — state-change only, no decoration
26. Final dark/light mode verification across all pages

---

## Key Feature Specs

### Dashboard — AI Optimization Center
Information hierarchy (top → bottom):
1. **Optimization Center**: active job count, overall health score (0–100), running jobs status
2. **Key Metrics strip**: pending approvals, active trips, avg confidence, jobs completed today
3. **Active Trips**: TripCard list with inline status
4. **Optimization Queue**: job list with priority, estimated completion, quick-approve action
5. **Recent AI Recommendations**: suggestion list with accept/dismiss
6. **Recent Activity**: timestamped feed

### Diff Viewer — Decision Flow (not Git-style)
```
┌─ Previous Plan ────────────────────────────────┐
│  Rome → Florence  ·  Trenitalia FR 9610        │
│  Dep 14:30  ·  Arr 17:15  ·  €89              │
└────────────────────────────────────────────────┘
          ↓  Reason: 2h scheduling conflict + €48 saving
┌─ Updated Plan ─────────────────────────────────┐
│  Rome → Florence  ·  Trenitalia FR 9514        │
│  Dep 11:00  ·  Arr 13:45  ·  €41              │
└────────────────────────────────────────────────┘
  Impact: −€48  ·  +3h buffer  ·  Confidence 94%
  [ Approve ]  [ Request Changes ]
```

### Explainability — Flagship Feature
Every optimization presents:
1. Natural language paragraph (plain English, no jargon)
2. Confidence bar — labeled percentage, color-coded (green ≥ 80%, yellow 60–79%, red < 60%)
3. Affected constraints — tag list (`Budget ≤ €3,200`, `Max layover: 2h`, `Preferred: Lufthansa`)
4. Reasoning steps — expandable accordion, each step typed with logic chain
5. Human approval — Approve / Request Changes buttons + threaded comment field
6. Every AI action answers: **What changed? Why? What should I do next?**

---

## CSS Token Setup

```css
/* Line 1 — must precede all other statements */
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Inter:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap');

@import 'tailwindcss';

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-primary: var(--primary);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-border: var(--border);
  --font-display: 'Plus Jakarta Sans', sans-serif;
  --font-body: 'Inter', sans-serif;
  --font-mono: 'Geist Mono', monospace;
}

:root {
  --background: #ffffff; --foreground: #09090b;
  --card: #fafafa; --muted: #f4f4f5;
  --muted-foreground: #71717a; --border: #e4e4e7;
  --primary: #2563eb;
}
.dark {
  --background: #09090b; --foreground: #fafafa;
  --card: #111113; --muted: #1c1c1f;
  --muted-foreground: #71717a; --border: #27272a;
}
```

---

## Verification Checklist (before marking any feature complete)

```bash
npx tsc --noEmit   # zero type errors
npm run lint       # zero lint errors
npm run build      # successful build
```

Manual:
- Dark/light mode on all pages
- Loading, empty, and error states render correctly
- No mock data in service layer (real endpoint signatures)
- Responsive at 1024px and 768px — no horizontal scroll
- Diff: Previous → Reason → Updated → Impact → Approve flow intact
- Explainability: all accordion steps expand; confidence bar renders; approval controls present
- Dashboard: optimization center metrics visible above fold
- Agent quick-approve works without page navigation
