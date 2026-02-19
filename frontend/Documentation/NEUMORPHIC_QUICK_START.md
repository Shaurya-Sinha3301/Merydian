# Neumorphic Design System - Quick Start Guide

## 🚀 Getting Started in 5 Minutes

### Step 1: View the Demo
Navigate to the demo page to see all components:
```
http://localhost:3000/neumorphic-demo
```

### Step 2: View Sample Itineraries
Check out the pre-built itineraries:
```
http://localhost:3000/agent-dashboard/GRP001/itinerary  (The Hikers - Manali)
http://localhost:3000/agent-dashboard/GRP002/itinerary  (Beach Club - Goa)
```

### Step 3: Use Components in Your Pages

#### Simple Card
```tsx
<div className="neu-card p-6">
  <h3 className="text-xl font-bold text-gray-900">Title</h3>
  <p className="text-gray-600">Content</p>
</div>
```

#### Button
```tsx
<button className="neu-button px-6 py-3 font-bold text-gray-900">
  Click Me
</button>
```

#### Input Field
```tsx
<input
  type="text"
  placeholder="Enter text..."
  className="neu-input w-full"
/>
```

### Step 4: Add Itinerary to Any Page

```tsx
import ItineraryView from '@/components/itinerary/ItineraryView';

export default function MyPage() {
  return (
    <div className="min-h-screen bg-background p-8">
      <ItineraryView groupId="GRP001" />
    </div>
  );
}
```

## 📁 File Structure

```
frontend/
├── app/
│   ├── globals.css                          # Neumorphic CSS utilities
│   ├── neumorphic-demo/page.tsx            # Demo page
│   └── agent-dashboard/
│       └── [groupId]/
│           └── itinerary/page.tsx          # Itinerary page
├── components/
│   └── itinerary/
│       ├── ItineraryView.tsx               # Main itinerary component
│       ├── TimelineEventCard.tsx           # Event card component
│       └── TicketModal.tsx                 # Ticket modal component
├── lib/
│   └── agent-dashboard/
│       ├── itinerary-data.ts               # Helper functions & types
│       └── data/
│           └── itinerary_data.json         # Mock database
├── NEUMORPHIC_DESIGN_SYSTEM.md             # Full documentation
└── NEUMORPHIC_QUICK_START.md               # This file
```

## 🎨 Available CSS Classes

### Cards
- `neu-card` - Raised card
- `neu-card-hover` - Card with hover effect
- `neu-flat` - Flat card
- `neu-pressed` - Inset/pressed card

### Interactive
- `neu-button` - Button (auto handles hover/active)
- `neu-input` - Input field (inset style)

### Elements
- `neu-badge` - Small badge/tag
- `neu-icon-circle` - Circular icon container
- `neu-timeline-line` - Vertical timeline connector

### Modal
- `neu-modal-overlay` - Modal backdrop
- `neu-modal` - Modal content box

## 🎯 Common Patterns

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
    <h4 className="font-bold text-gray-900">Event Title</h4>
    <p className="text-sm text-gray-600">Description</p>
  </div>
</div>
```

### Form Section
```tsx
<div className="neu-card p-8">
  <h3 className="text-2xl font-bold text-gray-900 mb-6">Form Title</h3>
  <div className="space-y-4">
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        Name
      </label>
      <input type="text" className="neu-input w-full" />
    </div>
    <button className="neu-button w-full py-3 font-bold">
      Submit
    </button>
  </div>
</div>
```

## 🔧 Customization

### Change Background Color
Edit `app/globals.css`:
```css
:root {
  --background: #E0E5EC;  /* Change this */
}
```

### Adjust Shadow Intensity
Modify shadow values in `globals.css`:
```css
.neu-card {
  box-shadow: 5px 5px 10px #BEBEBE, -5px -5px 10px #FFFFFF;
  /* Increase values for stronger shadows */
}
```

### Add Custom Colors for Icons
```tsx
<div className="neu-icon-circle w-12 h-12 text-pink-600">
  <Icon name="HeartIcon" className="w-6 h-6" />
</div>
```

## 📊 Mock Data

### Add New Itinerary
Edit `lib/agent-dashboard/data/itinerary_data.json`:

```json
{
  "itineraries": [
    {
      "groupId": "GRP003",
      "itineraryName": "Your New Trip",
      "totalDays": 2,
      "startDate": "2026-04-01T00:00:00Z",
      "endDate": "2026-04-02T23:59:59Z",
      "days": [
        {
          "dayNumber": 1,
          "date": "2026-04-01",
          "title": "Day 1 Title",
          "timelineEvents": [
            // Add events here
          ]
        }
      ]
    }
  ]
}
```

### Event Template
```json
{
  "id": "evt_003_001",
  "type": "transport",
  "startTime": "2026-04-01T09:00:00Z",
  "endTime": "2026-04-01T10:00:00Z",
  "title": "Event Title",
  "description": "Event description",
  "transport": {
    "mode": "Cab",
    "providerName": "Provider Name",
    "driverDetails": {
      "name": "Driver Name",
      "contact": "+91-1234567890",
      "vehicleNumber": "XX-00-XX-0000",
      "vehicleModel": "Vehicle Model"
    },
    "pickupLocation": {
      "name": "Pickup Location",
      "address": "Address",
      "coordinates": { "lat": 0.0, "lng": 0.0 }
    },
    "dropLocation": {
      "name": "Drop Location",
      "address": "Address",
      "coordinates": { "lat": 0.0, "lng": 0.0 }
    },
    "ticketStatus": {
      "confirmed": true,
      "bookingReference": "REF-001",
      "ticketUrl": "https://example.com/ticket"
    }
  }
}
```

## 🎭 Dark Mode

Toggle dark mode by adding the `dark` class to the root element:

```tsx
// In your layout or theme provider
<html className="dark">
  {/* Your app */}
</html>
```

Or use a toggle:
```tsx
const [isDark, setIsDark] = useState(false);

<button 
  onClick={() => {
    document.documentElement.classList.toggle('dark');
    setIsDark(!isDark);
  }}
  className="neu-button px-4 py-2"
>
  {isDark ? '☀️' : '🌙'}
</button>
```

## 🐛 Troubleshooting

### Shadows not visible?
- Check background color is not pure white or black
- Ensure you're using `#E0E5EC` or similar mid-tone

### Components not styled?
- Verify `globals.css` is imported in your layout
- Check Tailwind config includes the component paths

### TypeScript errors?
- Run `npm install` to ensure all dependencies are installed
- Check that `itinerary-data.ts` types are imported correctly

## 📚 Next Steps

1. Read the full documentation: `NEUMORPHIC_DESIGN_SYSTEM.md`
2. Explore the demo page: `/neumorphic-demo`
3. Check out sample itineraries: `/agent-dashboard/GRP001/itinerary`
4. Customize colors and shadows to match your brand
5. Add your own itinerary data to the JSON file

## 💡 Tips

- Use `neu-card-hover` for clickable cards
- Combine with Tailwind utilities for spacing and layout
- Keep text high contrast (#1F1F1F on #E0E5EC)
- Use color sparingly - only for icons and status
- Test on mobile - shadows may need adjustment

## 🤝 Support

For questions or issues:
1. Check the full documentation
2. Review the demo page source code
3. Inspect existing components for patterns
4. Test in the browser dev tools

---

**Happy Building! 🎨**
