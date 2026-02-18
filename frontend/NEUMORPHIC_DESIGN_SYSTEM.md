# Neumorphic Design System - Black & White Monochrome

## Overview

This design system implements a **Neumorphic (Soft UI)** aesthetic using a strictly **Black, White, and Gray** color palette. The design creates depth through shadows and highlights rather than color, resulting in a minimalist, elegant interface.

## Design Philosophy

- **Monochrome Palette**: Only black, white, and shades of gray
- **Soft Shadows**: Dual shadows (light and dark) create depth
- **Tactile Feel**: Elements appear to be pressed into or raised from the surface
- **Minimalist**: Clean, uncluttered interfaces with focus on content
- **Accessible**: High contrast text for readability

## Color Palette

### Light Mode (Default)
```css
--background: #E0E5EC     /* Neumorphic Base - Light Grey */
--foreground: #1F1F1F     /* Almost Black for text */
--shadow-dark: #BEBEBE    /* Dark shadow */
--shadow-light: #FFFFFF   /* Light highlight */
```

### Dark Mode
```css
--background: #292929     /* Dark Grey Base */
--foreground: #E0E0E0     /* Off-White for text */
--shadow-dark: #151515    /* Black shadow */
--shadow-light: #3D3D3D   /* Lighter Grey highlight */
```

## Core Components

### 1. Cards

#### Raised Card (Default)
```tsx
<div className="neu-card p-6">
  <h3>Card Title</h3>
  <p>Card content</p>
</div>
```
- **Effect**: Appears to float above the surface
- **Shadow**: `5px 5px 10px #BEBEBE, -5px -5px 10px #FFFFFF`

#### Hover Card
```tsx
<div className="neu-card neu-card-hover p-6">
  <h3>Hover Me</h3>
</div>
```
- **Effect**: Elevates further on hover
- **Use**: Interactive cards, clickable elements

#### Flat Card
```tsx
<div className="neu-flat p-6 rounded-2xl">
  <h3>Flat Card</h3>
</div>
```
- **Effect**: Subtle depth, minimal shadows
- **Use**: Background sections, containers

### 2. Buttons

#### Default Button
```tsx
<button className="neu-button px-8 py-4 font-bold">
  Click Me
</button>
```
- **States**: Default, Hover, Active (pressed)
- **Transitions**: Smooth 0.2s ease

#### Button with Icon
```tsx
<button className="neu-button px-6 py-3 flex items-center gap-2">
  <Icon name="SparklesIcon" className="w-5 h-5" />
  With Icon
</button>
```

### 3. Input Fields

#### Text Input
```tsx
<input
  type="text"
  placeholder="Enter text..."
  className="neu-input w-full"
/>
```
- **Effect**: Pressed/inset appearance
- **Shadow**: `inset 2px 2px 5px #BEBEBE, inset -2px -2px 5px #FFFFFF`

#### Textarea
```tsx
<textarea
  placeholder="Message..."
  className="neu-input w-full min-h-[120px]"
/>
```

### 4. Badges

```tsx
<span className="neu-badge">Active</span>
<span className="neu-badge">Pending</span>
```
- **Effect**: Small raised elements
- **Use**: Status indicators, tags, labels

### 5. Icon Circles

```tsx
<div className="neu-icon-circle w-16 h-16 text-blue-600">
  <Icon name="SparklesIcon" className="w-8 h-8" />
</div>
```
- **Effect**: Circular raised button
- **Use**: Timeline markers, action buttons, avatars

### 6. Pressed/Inset Elements

```tsx
<div className="neu-pressed p-4 rounded-lg">
  <p>Pressed content</p>
</div>
```
- **Effect**: Appears pressed into the surface
- **Use**: Active states, input fields, stat cards

## Itinerary Components

### Data Structure

The itinerary system uses a comprehensive JSON structure with:
- **Group ID**: Links itineraries to travel groups
- **Days**: Array of daily schedules
- **Timeline Events**: Minute-by-minute breakdown
- **Event Types**: Transport, Activity, Accommodation, Meal

### Components

#### 1. ItineraryView
Main container component that displays the full itinerary.

```tsx
import ItineraryView from '@/components/itinerary/ItineraryView';

<ItineraryView groupId="GRP001" />
```

**Features**:
- Day selector with neumorphic buttons
- Timeline visualization
- Event statistics
- Action buttons (Download, Share, Optimize)

#### 2. TimelineEventCard
Individual event card with expandable details.

```tsx
import TimelineEventCard from '@/components/itinerary/TimelineEventCard';

<TimelineEventCard event={event} isLast={false} />
```

**Features**:
- Neumorphic card design
- Expandable details
- Event-specific information
- "View Ticket" button for transport/activities

#### 3. TicketModal
Modal displaying ticket/pass details.

```tsx
import TicketModal from '@/components/itinerary/TicketModal';

<TicketModal
  isOpen={true}
  onClose={() => {}}
  event={event}
/>
```

**Features**:
- Deep inset modal design
- QR code placeholder
- Booking references
- Driver/Guide details
- Download/Share actions

## Event Types

### Transport Events
- **Modes**: Cab, Flight, Train
- **Details**: Driver info, vehicle details, pickup/drop locations
- **Ticket**: PNR, seat numbers, booking reference

### Activity Events
- **Details**: Location, description, entry fee
- **Extras**: Guide details, skipper info (for boat rides)
- **Ticket**: Booking ID, QR code

### Accommodation Events
- **Details**: Hotel name, room type, room numbers
- **Times**: Check-in/check-out
- **Booking**: Confirmation reference

### Meal Events
- **Details**: Restaurant, cuisine type, meal type
- **Extras**: Special arrangements (bonfire, live music)

## Usage Examples

### Creating a New Itinerary Page

```tsx
// app/itinerary/[groupId]/page.tsx
import ItineraryView from '@/components/itinerary/ItineraryView';

export default function ItineraryPage({ params }: { params: { groupId: string } }) {
  return (
    <div className="min-h-screen bg-background p-8">
      <ItineraryView groupId={params.groupId} />
    </div>
  );
}
```

### Adding Custom Event Cards

```tsx
import { TimelineEvent } from '@/lib/agent-dashboard/itinerary-data';

const customEvent: TimelineEvent = {
  id: 'custom_001',
  type: 'activity',
  startTime: '2026-03-15T10:00:00Z',
  endTime: '2026-03-15T12:00:00Z',
  title: 'Custom Activity',
  description: 'Description here',
  activity: {
    // ... activity details
  }
};
```

## Helper Functions

### Data Access
```typescript
import { getItineraryByGroupId, getAllItineraries } from '@/lib/agent-dashboard/itinerary-data';

// Get specific itinerary
const itinerary = getItineraryByGroupId('GRP001');

// Get all itineraries
const allItineraries = getAllItineraries();
```

### Formatting
```typescript
import { formatTime, formatDate } from '@/lib/agent-dashboard/itinerary-data';

// Format time: "09:30 AM"
const time = formatTime('2026-03-15T09:30:00Z');

// Format date: "Mar 15, 2026"
const date = formatDate('2026-03-15T00:00:00Z');
```

### Icons
```typescript
import { getEventTypeIcon, getTransportModeIcon } from '@/lib/agent-dashboard/itinerary-data';

// Get icon for event type
const icon = getEventTypeIcon('transport'); // Returns 'TruckIcon'

// Get icon for transport mode
const modeIcon = getTransportModeIcon('Flight'); // Returns 'PaperAirplaneIcon'
```

## CSS Utilities

All neumorphic utilities are defined in `app/globals.css`:

```css
/* Cards */
.neu-card          /* Raised card */
.neu-card-hover    /* Hover effect */
.neu-flat          /* Flat card */
.neu-pressed       /* Inset/pressed */

/* Interactive */
.neu-button        /* Button with states */
.neu-input         /* Input field */

/* Elements */
.neu-badge         /* Small badge */
.neu-icon-circle   /* Circular icon container */
.neu-timeline-line /* Timeline connector */

/* Modal */
.neu-modal-overlay /* Modal backdrop */
.neu-modal         /* Modal content */

/* Utility */
.neu-divider       /* Horizontal divider */
```

## Demo Page

Visit `/neumorphic-demo` to see all components in action:
- Buttons (default, with icons, pressed states)
- Cards (raised, hover, flat)
- Input fields (text, email, textarea)
- Badges
- Icon circles
- Stats cards
- Timeline example
- Color palette

## Accessibility

- **Contrast**: Text uses #1F1F1F on #E0E5EC (AAA compliant)
- **Focus States**: All interactive elements have focus indicators
- **Keyboard Navigation**: Full keyboard support
- **Screen Readers**: Proper ARIA labels and semantic HTML

## Best Practices

1. **Don't Overuse**: Too many neumorphic elements can be overwhelming
2. **Maintain Hierarchy**: Use different depths for visual hierarchy
3. **Consistent Spacing**: Use Tailwind spacing utilities
4. **Color Accents**: Use subtle color only for icons/status (blue, purple, green, orange)
5. **Responsive**: Test on mobile - shadows may need adjustment
6. **Performance**: Shadows are CSS-based, no performance impact

## Browser Support

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support
- Mobile: Full support (iOS/Android)

## Future Enhancements

- [ ] Dark mode toggle component
- [ ] Animation presets for transitions
- [ ] More complex shadow patterns
- [ ] Glassmorphism variants
- [ ] Accessibility audit tools

## Resources

- **Data**: `frontend/lib/agent-dashboard/data/itinerary_data.json`
- **Types**: `frontend/lib/agent-dashboard/itinerary-data.ts`
- **Components**: `frontend/components/itinerary/`
- **Styles**: `frontend/app/globals.css`
- **Demo**: `frontend/app/neumorphic-demo/page.tsx`

---

**Design System Version**: 1.0.0  
**Last Updated**: February 2026  
**Maintained By**: Frontend Team
