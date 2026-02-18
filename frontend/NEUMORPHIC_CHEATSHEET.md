# Neumorphic Design System - Quick Reference Cheatsheet

## 🎨 CSS Classes

### Cards
```css
.neu-card              /* Raised card with soft shadows */
.neu-card-hover        /* Card that elevates on hover */
.neu-flat              /* Subtle flat card */
.neu-pressed           /* Inset/pressed appearance */
```

### Interactive
```css
.neu-button            /* Button (auto handles hover/active) */
.neu-input             /* Input field (inset style) */
```

### Elements
```css
.neu-badge             /* Small raised badge/tag */
.neu-icon-circle       /* Circular icon container */
.neu-timeline-line     /* Vertical timeline connector */
.neu-divider           /* Horizontal divider line */
```

### Modal
```css
.neu-modal-overlay     /* Modal backdrop with blur */
.neu-modal             /* Deep inset modal container */
```

---

## 🎯 Quick Examples

### Basic Card
```tsx
<div className="neu-card p-6">
  <h3 className="text-xl font-bold text-gray-900">Title</h3>
  <p className="text-gray-600">Content</p>
</div>
```

### Button
```tsx
<button className="neu-button px-6 py-3 font-bold text-gray-900">
  Click Me
</button>
```

### Button with Icon
```tsx
<button className="neu-button px-6 py-3 font-bold flex items-center gap-2">
  <Icon name="SparklesIcon" className="w-5 h-5" />
  Action
</button>
```

### Input Field
```tsx
<input
  type="text"
  placeholder="Enter text..."
  className="neu-input w-full"
/>
```

### Badge
```tsx
<span className="neu-badge">Active</span>
```

### Icon Circle
```tsx
<div className="neu-icon-circle w-12 h-12 text-blue-600">
  <Icon name="SparklesIcon" className="w-6 h-6" />
</div>
```

### Stats Card
```tsx
<div className="neu-pressed p-6 rounded-2xl text-center">
  <Icon name="UserGroupIcon" className="w-8 h-8 text-blue-600 mx-auto mb-3" />
  <p className="text-3xl font-bold text-gray-900">1,234</p>
  <p className="text-sm text-gray-600 uppercase font-semibold">Users</p>
</div>
```

### Timeline Item
```tsx
<div className="flex gap-4">
  <div className="neu-icon-circle w-12 h-12 text-purple-600">
    <Icon name="SparklesIcon" className="w-6 h-6" />
  </div>
  <div className="neu-card p-4 flex-1">
    <h4 className="font-bold text-gray-900">Event</h4>
    <p className="text-sm text-gray-600">Description</p>
  </div>
</div>
```

### Modal
```tsx
<div className="fixed inset-0 neu-modal-overlay" onClick={onClose}>
  <div className="neu-modal max-w-2xl mx-4 p-8" onClick={e => e.stopPropagation()}>
    <h2 className="text-2xl font-bold text-gray-900 mb-4">Modal Title</h2>
    <p className="text-gray-600">Modal content</p>
  </div>
</div>
```

---

## 🎨 Color Palette

### Light Mode (Default)
```
Background:  #E0E5EC  (Neumorphic base)
Text:        #1F1F1F  (Almost black)
Shadow Dark: #BEBEBE  (Grey)
Shadow Light:#FFFFFF  (White)
Muted:       #6B7280  (Grey-500)
```

### Dark Mode
```
Background:  #292929  (Dark grey)
Text:        #E0E0E0  (Off-white)
Shadow Dark: #151515  (Black)
Shadow Light:#3D3D3D  (Lighter grey)
```

### Accent Colors (Icons Only)
```
Blue:    text-blue-600    (Transport)
Purple:  text-purple-600  (Activities)
Green:   text-green-600   (Accommodation)
Orange:  text-orange-600  (Meals)
Red:     text-red-600     (Alerts)
Yellow:  text-yellow-600  (Ratings)
```

---

## 📦 Component Imports

### Itinerary Components
```tsx
import ItineraryView from '@/components/itinerary/ItineraryView';
import TimelineEventCard from '@/components/itinerary/TimelineEventCard';
import TicketModal from '@/components/itinerary/TicketModal';
```

### Data Functions
```tsx
import {
  getItineraryByGroupId,
  getAllItineraries,
  formatTime,
  formatDate,
  getEventTypeIcon,
  getTransportModeIcon
} from '@/lib/agent-dashboard/itinerary-data';
```

### Types
```tsx
import type {
  Itinerary,
  ItineraryDay,
  TimelineEvent,
  TransportEvent,
  ActivityEvent,
  AccommodationEvent,
  MealEvent
} from '@/lib/agent-dashboard/itinerary-data';
```

---

## 🔧 Helper Functions

### Get Itinerary
```tsx
const itinerary = getItineraryByGroupId('GRP001');
```

### Format Time
```tsx
const time = formatTime('2026-03-15T09:30:00Z');
// Output: "09:30 AM"
```

### Format Date
```tsx
const date = formatDate('2026-03-15T00:00:00Z');
// Output: "Mar 15, 2026"
```

### Get Icon
```tsx
const icon = getEventTypeIcon('transport');
// Output: "TruckIcon"
```

---

## 🎭 State Management

### Toggle Expansion
```tsx
const [isExpanded, setIsExpanded] = useState(false);

<div onClick={() => setIsExpanded(!isExpanded)}>
  {isExpanded ? 'Collapse' : 'Expand'}
</div>
```

### Modal State
```tsx
const [showModal, setShowModal] = useState(false);

<button onClick={() => setShowModal(true)}>Open</button>
<Modal isOpen={showModal} onClose={() => setShowModal(false)} />
```

### Day Selection
```tsx
const [selectedDay, setSelectedDay] = useState(1);

<button onClick={() => setSelectedDay(2)}>Day 2</button>
```

---

## 📱 Responsive Classes

### Tailwind Breakpoints
```tsx
<div className="
  grid 
  grid-cols-1        /* Mobile: 1 column */
  md:grid-cols-2     /* Tablet: 2 columns */
  lg:grid-cols-3     /* Desktop: 3 columns */
  gap-4
">
```

### Hide on Mobile
```tsx
<div className="hidden md:block">Desktop only</div>
```

### Show on Mobile
```tsx
<div className="block md:hidden">Mobile only</div>
```

---

## 🎨 Common Patterns

### Section Container
```tsx
<section className="neu-card p-8">
  <h2 className="text-3xl font-bold text-gray-900 mb-6">Section Title</h2>
  {/* Content */}
</section>
```

### Grid Layout
```tsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
  <div className="neu-card p-6">Card 1</div>
  <div className="neu-card p-6">Card 2</div>
  <div className="neu-card p-6">Card 3</div>
</div>
```

### Form Group
```tsx
<div className="space-y-4">
  <div>
    <label className="block text-sm font-semibold text-gray-700 mb-2">
      Label
    </label>
    <input type="text" className="neu-input w-full" />
  </div>
</div>
```

### Action Buttons
```tsx
<div className="flex gap-4">
  <button className="flex-1 neu-button py-3 px-6 font-bold">
    Primary
  </button>
  <button className="flex-1 neu-button py-3 px-6 font-bold">
    Secondary
  </button>
</div>
```

---

## 🚀 Quick Start

### 1. Create a Page
```tsx
// app/my-page/page.tsx
export default function MyPage() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">
          My Page
        </h1>
        {/* Your content */}
      </div>
    </div>
  );
}
```

### 2. Add Itinerary
```tsx
import ItineraryView from '@/components/itinerary/ItineraryView';

<ItineraryView groupId="GRP001" />
```

### 3. Add Custom Card
```tsx
<div className="neu-card neu-card-hover p-6">
  <h3 className="text-xl font-bold text-gray-900 mb-2">
    Card Title
  </h3>
  <p className="text-gray-600">
    Card description
  </p>
</div>
```

---

## 🎯 URLs

```
Demo:        /neumorphic-demo
Itinerary:   /agent-dashboard/[groupId]/itinerary
Group:       /agent-dashboard/[groupId]
```

---

## 📚 Documentation

```
Quick Start:     NEUMORPHIC_QUICK_START.md
Full Docs:       NEUMORPHIC_DESIGN_SYSTEM.md
Testing:         TESTING_GUIDE.md
Summary:         NEUMORPHIC_IMPLEMENTATION_SUMMARY.md
Cheatsheet:      NEUMORPHIC_CHEATSHEET.md (this file)
```

---

## 💡 Tips

1. **Always use grey background** (#E0E5EC) - not pure white
2. **Keep text dark** (#1F1F1F) for readability
3. **Use color sparingly** - only for icons
4. **Test hover states** - they should elevate
5. **Combine with Tailwind** - for spacing and layout
6. **Check dark mode** - toggle with `dark` class

---

## ⚡ Common Mistakes

❌ **Don't:**
```tsx
<div className="bg-white">  /* Pure white - no shadows visible */
<div className="bg-black">  /* Pure black - no shadows visible */
<button className="bg-blue-500">  /* Colored button - breaks monochrome */
```

✅ **Do:**
```tsx
<div className="neu-card">  /* Proper neumorphic card */
<button className="neu-button">  /* Proper neumorphic button */
<div className="neu-icon-circle text-blue-600">  /* Color only on icon */
```

---

**Cheatsheet Version**: 1.0.0  
**Print this for quick reference!** 📄
