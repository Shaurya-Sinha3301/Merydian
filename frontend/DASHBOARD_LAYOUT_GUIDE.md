# Dashboard Layout Visual Guide

## Layout Structure

```
┌─────────────────────────────────────────────────────────────────┐
│  👤 Good Morning, Agent!                    [📊 Detailed View]  │
│     Thursday, February 19, 2026                                 │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────┬──────────────────────────────┐
│  LEFT COLUMN (2/3 width)         │  RIGHT COLUMN (1/3 width)    │
│                                  │                              │
│  ┌─ Active Destinations ───────┐ │  ┌─ Statistics ───────────┐ │
│  │                              │ │  │ Revenue This Month     │ │
│  │  🏖️ Goa, India              │ │  │ ₹50K  +12.4% ↗        │ │
│  │  Goa Beach Retreat 2026     │ │  │                        │ │
│  │  👥 22 travelers             │ │  │  [Bar Chart]           │ │
│  │  📅 5 days remaining         │ │  │  ▂▃▅▇█▆▄▃▂▁           │ │
│  │  ▓▓▓▓▓▓▓▓░░░░ 65%           │ │  │                        │ │
│  │                              │ │  │  Active Groups: 3      │ │
│  │  🏔️ Manali, India           │ │  │  Avg Group Size: 22    │ │
│  │  Himalayan Adventure Trek   │ │  └────────────────────────┘ │
│  │  👥 18 travelers             │ │                              │
│  │  📅 3 days remaining         │ │  ┌─ Upcoming Groups ─────┐ │
│  │  ▓▓▓▓▓▓▓▓▓░░ 75%            │ │  │                        │ │
│  │                              │ │  │  ● Goa Beach Retreat   │ │
│  │  🌴 Alleppey, Kerala        │ │  │    👤👤👤 +19          │ │
│  │  Kerala Backwaters          │ │  │    📅 Feb 10-17        │ │
│  │  👥 26 travelers             │ │  │    [5 days]            │ │
│  │  📅 2 days remaining         │ │  │    📧 📞 💬           │ │
│  │  ▓▓▓▓▓▓▓▓▓▓▓ 85%            │ │  │                        │ │
│  └──────────────────────────────┘ │  │  ● Himalayan Trek      │ │
│                                  │ │  │    👤👤 +16           │ │
│  ┌─ Issues & Alerts ───────────┐ │  │    📅 Feb 12-19        │ │
│  │                              │ │  │    [3 days]            │ │
│  │  [All] [Critical] [Warning]  │ │  │    📧 📞 💬           │ │
│  │  [Info]                      │ │  │                        │ │
│  │                              │ │  │  ● Kerala Backwaters   │ │
│  │  🔴 Missing Bookings         │ │  │    👤👤👤 +23         │ │
│  │     GRP003 has no confirmed  │ │  │    📅 Feb 14-21        │ │
│  │     bookings                 │ │  │    [2 days]            │ │
│  │                              │ │  │    📧 📞 💬           │ │
│  │  🟡 Departure Soon           │ │  │                        │ │
│  │     Goa Beach Retreat        │ │  │  [View All Groups]     │ │
│  │     departs in 2 days        │ │  └────────────────────────┘ │
│  │                              │ │                              │
│  │  🟡 Pending Bookings         │ │                              │
│  │     2 bookings awaiting      │ │                              │
│  │     confirmation             │ │                              │
│  │                              │ │                              │
│  │  🔵 Trip Ending              │ │                              │
│  │     Kerala trip ends         │ │                              │
│  │     tomorrow                 │ │                              │
│  │                              │ │                              │
│  │  🟢 All Set                  │ │                              │
│  │     Manali has all bookings  │ │                              │
│  │     confirmed                │ │                              │
│  └──────────────────────────────┘ │                              │
└──────────────────────────────────┴──────────────────────────────┘
```

## Component Breakdown

### 1. Dashboard Header (Top)
```
┌────────────────────────────────────────────────────┐
│  [Avatar]  Good Morning, Agent!    [Toggle Button] │
│            Thursday, Feb 19, 2026                  │
└────────────────────────────────────────────────────┘
```
- Circular gradient avatar (blue to purple)
- Time-based greeting
- Full date display
- View toggle button (Overview ⟷ Detailed)

### 2. Destination Cards (Left, Top)
```
┌──────────────────────────┐  ┌──────────────────────────┐
│ 🏖️                       │  │ 🏔️                       │
│ Goa, India              │  │ Manali, India           │
│ Goa Beach Retreat 2026  │  │ Himalayan Adventure     │
│                         │  │                         │
│ 👥 22 travelers         │  │ 👥 18 travelers         │
│ 📅 5 days remaining     │  │ 📅 3 days remaining     │
│                         │  │                         │
│ Trip Progress    65%    │  │ Trip Progress    75%    │
│ ▓▓▓▓▓▓▓▓░░░░░░░        │  │ ▓▓▓▓▓▓▓▓▓░░░░░░        │
└──────────────────────────┘  └──────────────────────────┘
```
- 2x2 grid on desktop
- Gradient backgrounds (unique per destination)
- Large emoji icons
- Key metrics (travelers, days)
- Animated progress bar
- Hover effects with shadow

### 3. Issues & Alerts (Left, Bottom)
```
┌─────────────────────────────────────────┐
│  Issues & Alerts              12 total  │
│                                         │
│  [All (12)] [Critical (2)] [Warning (4)]│
│  [Info (3)] [Success (3)]               │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 🔴 Missing Bookings             │   │
│  │    GRP003 has no confirmed      │   │
│  │    bookings                  ›  │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 🟡 Departure Soon               │   │
│  │    Goa Beach Retreat departs    │   │
│  │    in 2 days                 ›  │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 🟢 All Set                      │   │
│  │    Manali has all bookings      │   │
│  │    confirmed                 ›  │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```
- Filter tabs with counts
- Color-coded alert cards
- Scrollable list (max 400px)
- Icon indicators
- Chevron for navigation

### 4. Statistics Panel (Right, Top)
```
┌──────────────────────────────┐
│  Revenue This Month    March │
│                              │
│  ₹50K  ↗ +12.4%             │
│  From total ₹70K             │
│                              │
│  ┌────────────────────────┐  │
│  │ ▂▃▅▇█▆▄▃▂▁▂▃▅▇█▆▄▃▂▁ │  │
│  │ 3  7  15  20  24  31   │  │
│  └────────────────────────┘  │
│                              │
│  Active Groups        3      │
│  Avg. Group Size     22      │
└──────────────────────────────┘
```
- Large revenue number
- Trend indicator (up/down arrow)
- 31-day bar chart
- Hover tooltips on bars
- Current day highlighted
- Additional metrics below

### 5. Upcoming Groups Timeline (Right, Bottom)
```
┌──────────────────────────────────┐
│  Upcoming Groups      4 scheduled│
│                                  │
│  ● ┌──────────────────────────┐ │
│  │ │ Goa Beach Retreat        │ │
│  │ │ Goa, India        [5 days]│ │
│  │ │ 📅 Feb 10 - Feb 17       │ │
│  │ │                          │ │
│  │ │ 👤👤👤 +19  22 travelers │ │
│  │ │ 📧 📞 💬                 │ │
│  │ └──────────────────────────┘ │
│  │                              │
│  ● ┌──────────────────────────┐ │
│  │ │ Himalayan Trek           │ │
│  │ │ Manali, India   [3 days] │ │
│  │ │ 📅 Feb 12 - Feb 19       │ │
│  │ │                          │ │
│  │ │ 👤👤 +16  18 travelers   │ │
│  │ │ 📧 📞 💬                 │ │
│  │ └──────────────────────────┘ │
│  │                              │
│  ● ┌──────────────────────────┐ │
│                                  │
│  [View All Groups]               │
└──────────────────────────────────┘
```
- Vertical timeline with dots
- Connecting lines between items
- Gradient avatar circles
- Days until badge (color-coded)
- Date range display
- Quick action buttons
- View all button at bottom

## Color Palette

### Backgrounds
- Card: `bg-card` (white/dark based on theme)
- Muted: `bg-muted` (light gray)
- Border: `border-border` (subtle gray)

### Alerts
- Critical: Red (bg-red-50, border-red-200, text-red-700)
- Warning: Amber (bg-amber-50, border-amber-200, text-amber-700)
- Info: Blue (bg-blue-50, border-blue-200, text-blue-700)
- Success: Emerald (bg-emerald-50, border-emerald-200, text-emerald-700)

### Gradients
- Beach: amber-400 → orange-400 → rose-400
- Mountain: emerald-400 → teal-400 → cyan-400
- Tropical: green-400 → emerald-500 → teal-500
- Water: blue-400 → cyan-400 → teal-400

## Responsive Behavior

### Desktop (≥1024px)
- 3-column grid (2:1 ratio)
- Side-by-side destination cards
- Full timeline visible
- All features accessible

### Mobile (<1024px)
- Single column stack
- Destination cards in 1 column
- Scrollable alerts
- Compact timeline
- Touch-friendly buttons

## Interactions

### Hover States
- Destination cards: Shadow elevation + opacity change
- Alert cards: Shadow + background lightening
- Timeline items: Background change
- Buttons: Opacity/background change

### Click Actions
- Destination cards → Navigate to group details
- Alert cards → Navigate to affected group
- Timeline items → Navigate to group details
- Quick action buttons → Console log (ready for implementation)
- View toggle → Switch between overview/detailed

### Animations
- Smooth transitions (300ms)
- Progress bar fills
- Hover shadow growth
- Filter tab switching

## Data Sources

### Active Groups
- Loaded from `frontend/lib/agent-dashboard/data/active_groups.json`
- Contains 3 groups with full member details
- Includes booking information

### Generated Data
- Alerts: Auto-generated based on group status
- Statistics: Calculated from booking totals
- Timeline: Sorted by start date

## Key Differences from Screenshot

### Inspired Elements
✅ Destination cards with visual themes
✅ Statistics panel with bar chart
✅ Timeline with member avatars
✅ Issues/alerts snapshot
✅ Clean, modern aesthetic

### Custom Enhancements
🎨 Gradient backgrounds instead of illustrations
📊 Interactive bar chart with tooltips
🔔 Filterable alerts with counts
🎯 Progress bars on destination cards
🔄 View toggle for flexibility
📱 Fully responsive design

## Implementation Notes

- All components are client-side (`'use client'`)
- Hydration-safe with loading states
- TypeScript for type safety
- Tailwind CSS for styling
- No external dependencies beyond existing project
- Follows existing design system patterns
