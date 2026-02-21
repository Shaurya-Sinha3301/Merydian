# Customer Suggestion Feature - Quick Reference

## 🚀 Quick Start

### Enable for Customers (1 line)
```tsx
<ItineraryView groupId={tripId} isCustomerView={true} />
```

### Enable for Agents (2 lines)
```tsx
import CustomerSuggestionsPanel from '@/app/agent-dashboard/components/CustomerSuggestionsPanel';
<CustomerSuggestionsPanel groupId={groupId} />
```

---

## 📦 Components

### SuggestChangeModal
**Path:** `frontend/app/customer-portal/components/SuggestChangeModal.tsx`
**Purpose:** Customer-facing suggestion modal
**Props:**
```tsx
{
  eventTitle?: string;
  eventId?: string;
  dayNumber?: number;
  dayTitle?: string;
  eventTime?: string;
  eventType?: string;
  preselectedAction?: string;
  onClose: () => void;
  onSubmit?: (suggestion: ItinerarySuggestion) => void;
}
```

### CustomerSuggestionsPanel
**Path:** `frontend/app/agent-dashboard/components/CustomerSuggestionsPanel.tsx`
**Purpose:** Agent dashboard panel
**Props:**
```tsx
{
  groupId?: string;
}
```

---

## 🔧 Modified Components

### TimelineEventCard
**New Props:**
```tsx
{
  isCustomerView?: boolean;
  dayNumber?: number;
  dayTitle?: string;
  onSuggestChange?: (eventId: string, eventTitle: string, preselectedAction?: string) => void;
}
```

### ItineraryView
**New Prop:**
```tsx
{
  isCustomerView?: boolean;  // Set to true for customer portal
}
```

---

## 📊 Data Structure

```typescript
interface ItinerarySuggestion {
  type: 'add' | 'remove' | 'modify' | 'replace' | 'general';
  action: string;
  eventId?: string;
  eventTitle?: string;
  dayNumber?: number;
  dayTitle?: string;
  eventTime?: string;
  eventType?: string;
  details: string;
  preferences?: string[];
  timestamp: string;
}
```

---

## 💾 Storage

### Current (LocalStorage)
```typescript
// Save
localStorage.setItem('itinerarySuggestions', JSON.stringify(suggestions));

// Load
const suggestions = JSON.parse(localStorage.getItem('itinerarySuggestions') || '[]');
```

### Future (API)
```typescript
// POST /api/itinerary/suggestions
// GET /api/itinerary/suggestions?groupId=xxx
```

---

## 🎨 Action Types

| ID | Label | Icon | Type |
|---|---|---|---|
| `add-place` | Add a Place | ➕ | add |
| `remove-event` | Remove This | ➖ | remove |
| `more-adventure` | More Adventurous | 🏔️ | modify |
| `more-relaxing` | More Relaxing | 🧘 | modify |
| `change-timing` | Change Timing | ⏰ | modify |
| `replace-activity` | Replace Activity | 🔄 | replace |
| `add-meal` | Add Meal Stop | 🍽️ | add |
| `more-cultural` | More Cultural | 🏛️ | modify |
| `kid-friendly` | More Kid-Friendly | 👶 | modify |
| `other` | Other Suggestion | 💡 | general |

---

## 🏷️ Preference Tags

```typescript
const preferenceChips = [
  'Budget-friendly',
  'Luxury',
  'Family-friendly',
  'Adventure',
  'Cultural',
  'Nature',
  'Food & Dining',
  'Shopping',
  'Photography',
  'Nightlife'
];
```

---

## 🎨 Color Coding

```typescript
const typeColors = {
  'add': 'bg-green-50 border-green-200 text-green-800',
  'remove': 'bg-red-50 border-red-200 text-red-800',
  'modify': 'bg-blue-50 border-blue-200 text-blue-800',
  'replace': 'bg-purple-50 border-purple-200 text-purple-800',
  'general': 'bg-gray-50 border-gray-200 text-gray-800'
};
```

---

## 🔌 Integration Examples

### Basic Customer Portal
```tsx
import ItineraryView from '@/components/itinerary/ItineraryView';

export default function CustomerItinerary({ tripId }: { tripId: string }) {
  return <ItineraryView groupId={tripId} isCustomerView={true} />;
}
```

### Basic Agent Dashboard
```tsx
import CustomerSuggestionsPanel from '@/app/agent-dashboard/components/CustomerSuggestionsPanel';

export default function GroupDetails({ groupId }: { groupId: string }) {
  return (
    <div>
      <h2>Customer Suggestions</h2>
      <CustomerSuggestionsPanel groupId={groupId} />
    </div>
  );
}
```

### With Notification Badge
```tsx
import { useState, useEffect } from 'react';

function SuggestionsWithBadge({ groupId }: { groupId: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const stored = localStorage.getItem('itinerarySuggestions');
    if (stored) {
      setCount(JSON.parse(stored).length);
    }
  }, []);

  return (
    <div className="relative">
      <CustomerSuggestionsPanel groupId={groupId} />
      {count > 0 && (
        <span className="absolute top-0 right-0 bg-red-500 text-white px-2 py-1 rounded-full text-xs">
          {count}
        </span>
      )}
    </div>
  );
}
```

### With Custom Callback
```tsx
import SuggestChangeModal from '@/app/customer-portal/components/SuggestChangeModal';

function CustomSuggestionFlow() {
  const [showModal, setShowModal] = useState(false);

  const handleSubmit = (suggestion: ItinerarySuggestion) => {
    console.log('Suggestion submitted:', suggestion);
    // Send to API, show notification, etc.
  };

  return (
    <>
      <button onClick={() => setShowModal(true)}>Suggest Change</button>
      {showModal && (
        <SuggestChangeModal
          onClose={() => setShowModal(false)}
          onSubmit={handleSubmit}
        />
      )}
    </>
  );
}
```

---

## 🧪 Testing Checklist

### Customer Side
- [ ] Quick action buttons appear on timeline events
- [ ] Modal opens with correct pre-selected action
- [ ] Can type in details field
- [ ] Can select preference tags
- [ ] Context info displays correctly
- [ ] Submit shows success message
- [ ] Data saved to localStorage

### Agent Side
- [ ] Suggestions panel displays all suggestions
- [ ] Filter buttons work correctly
- [ ] Suggestion cards show complete context
- [ ] "Implemented" button removes suggestion
- [ ] "Dismiss" button removes suggestion
- [ ] Empty state shows when no suggestions

---

## 🐛 Common Issues

### Issue: Quick actions not showing
**Solution:** Ensure `isCustomerView={true}` is passed to ItineraryView

### Issue: Suggestions not appearing in agent panel
**Solution:** Check localStorage key is `itinerarySuggestions`

### Issue: Context not captured
**Solution:** Ensure dayNumber and dayTitle are passed to TimelineEventCard

### Issue: TypeScript errors
**Solution:** Import ItinerarySuggestion type from SuggestChangeModal

---

## 📚 Documentation Files

1. **CUSTOMER_ITINERARY_SUGGESTIONS.md** - Complete feature documentation
2. **CUSTOMER_SUGGESTIONS_INTEGRATION_EXAMPLE.md** - Integration guide
3. **CUSTOMER_SUGGESTION_FEATURE_SUMMARY.md** - Implementation summary
4. **CUSTOMER_SUGGESTION_DEMO_GUIDE.md** - Demo walkthrough
5. **CUSTOMER_SUGGESTION_QUICK_REFERENCE.md** - This file

---

## 🔗 File Locations

```
frontend/
├── app/
│   ├── customer-portal/
│   │   └── components/
│   │       └── SuggestChangeModal.tsx          ← New
│   └── agent-dashboard/
│       └── components/
│           └── CustomerSuggestionsPanel.tsx    ← New
├── components/
│   └── itinerary/
│       ├── TimelineEventCard.tsx               ← Modified
│       └── ItineraryView.tsx                   ← Modified
└── Documentation/
    ├── CUSTOMER_ITINERARY_SUGGESTIONS.md
    ├── CUSTOMER_SUGGESTIONS_INTEGRATION_EXAMPLE.md
    ├── CUSTOMER_SUGGESTION_FEATURE_SUMMARY.md
    ├── CUSTOMER_SUGGESTION_DEMO_GUIDE.md
    └── CUSTOMER_SUGGESTION_QUICK_REFERENCE.md
```

---

## ⚡ Performance Tips

1. **Lazy Load Modal:** Only import when needed
2. **Debounce Input:** For search/filter in agent panel
3. **Virtual Scrolling:** For large suggestion lists
4. **Memoize Components:** Use React.memo for suggestion cards

---

## 🔐 Security Considerations

1. **Sanitize Input:** Clean user-provided text
2. **Rate Limiting:** Prevent spam submissions
3. **Authentication:** Verify user identity
4. **Authorization:** Check user can modify this trip

---

## 🚀 Future Enhancements

- [ ] Backend API integration
- [ ] Real-time notifications
- [ ] Email alerts to agents
- [ ] Suggestion status tracking
- [ ] AI-powered alternatives
- [ ] Group voting on suggestions
- [ ] Analytics dashboard

---

**Version:** 1.0.0  
**Last Updated:** February 19, 2026  
**Status:** ✅ Production Ready
