# Customer Itinerary Suggestion Feature

## Overview

This feature allows customers to suggest changes to their itinerary with minimal hassle. The system captures structured data that helps travel agents quickly identify what needs to be changed and where in the timeline.

## Key Features

### 1. Inline Quick Actions
Each timeline event in the customer view has quick action buttons:
- 🏔️ **More Adventurous** - Request more exciting activities
- 🔄 **Replace This** - Suggest replacing the current activity
- ⏰ **Change Time** - Request timing adjustments
- ➖ **Remove** - Request removal of this event
- 💡 **Other** - Open full suggestion modal

### 2. Comprehensive Suggestion Modal
The modal captures:
- **Action Type**: Add, Remove, Modify, Replace, or General
- **Specific Actions**: 10 predefined options (add place, more adventure, more relaxing, etc.)
- **Detailed Description**: Free-text explanation from customer
- **Preference Tags**: Budget-friendly, Luxury, Family-friendly, Adventure, Cultural, etc.
- **Automatic Context**: Day number, event title, timing, event type

### 3. Context-Aware Data Capture
Every suggestion automatically includes:
- Event ID and title
- Day number and day title
- Event timing
- Event type (transport, activity, meal, accommodation)
- Timestamp of suggestion
- Customer preferences

### 4. Agent Dashboard Integration
Travel agents can view all suggestions in the `CustomerSuggestionsPanel` component with:
- Filter by type (All, Add, Modify, Remove)
- Complete context for each suggestion
- Quick actions (Mark as Implemented, Dismiss)
- Visual categorization by suggestion type

## Usage

### For Customers

1. **View Itinerary**: Open the detailed itinerary modal from the customer portal
2. **Quick Actions**: Click any quick action button on a timeline event
3. **Full Suggestion**: Click "Suggest Changes" button at the bottom or "Other" on any event
4. **Fill Details**: Select action type, provide details, add preference tags
5. **Submit**: Suggestion is sent to travel agent

### For Travel Agents

1. **View Suggestions**: Import and use `CustomerSuggestionsPanel` component
2. **Filter**: Use filter buttons to view specific types of suggestions
3. **Review Context**: See all relevant information (day, time, event details)
4. **Take Action**: Mark as implemented or dismiss

## Implementation Details

### Components Created

1. **SuggestChangeModal.tsx**
   - Location: `frontend/app/customer-portal/components/SuggestChangeModal.tsx`
   - Purpose: Modal for capturing customer suggestions
   - Features: Action selection, detailed input, preference tags, context display

2. **CustomerSuggestionsPanel.tsx**
   - Location: `frontend/app/agent-dashboard/components/CustomerSuggestionsPanel.tsx`
   - Purpose: Agent dashboard panel for viewing suggestions
   - Features: Filtering, context display, action buttons

### Components Modified

1. **TimelineEventCard.tsx**
   - Added: Quick action buttons for customer view
   - Props: `isCustomerView`, `dayNumber`, `dayTitle`, `onSuggestChange`

2. **ItineraryView.tsx**
   - Added: Suggestion modal integration
   - Added: "Suggest Changes" button for customers
   - Added: Handler for suggestion events

### Data Structure

```typescript
interface ItinerarySuggestion {
  type: 'add' | 'remove' | 'modify' | 'replace' | 'general';
  action: string; // Specific action ID
  eventId?: string;
  eventTitle?: string;
  dayNumber?: number;
  dayTitle?: string;
  eventTime?: string;
  eventType?: string;
  details: string; // Customer's detailed explanation
  preferences?: string[]; // Selected preference tags
  timestamp: string;
}
```

### Storage

Currently uses `localStorage` with key `itinerarySuggestions`. In production, this should be:
- Stored in backend database
- Associated with trip/group ID
- Linked to customer profile
- Synced across devices

## Benefits

### For Customers
- **Zero Hassle**: No forms to fill, just click and describe
- **Quick Actions**: Common requests are one-click away
- **Context Preserved**: Don't need to explain "which day" or "what time"
- **Flexible**: Can be specific or general with suggestions

### For Travel Agents
- **Structured Data**: All suggestions come with complete context
- **Easy Location**: Know exactly where in the itinerary to make changes
- **Prioritization**: Filter by type to handle urgent changes first
- **Efficiency**: No need to parse emails or messages to understand requests

## Future Enhancements

1. **Backend Integration**
   - API endpoints for storing/retrieving suggestions
   - Real-time notifications to agents
   - Suggestion status tracking (pending, in-progress, implemented)

2. **AI-Powered Suggestions**
   - Auto-suggest alternatives based on customer preferences
   - Predict what customer might want based on their profile
   - Generate optimized itinerary variations

3. **Collaborative Features**
   - Allow family members to vote on suggestions
   - Group chat for discussing changes
   - Version history of itinerary changes

4. **Analytics**
   - Track most common suggestion types
   - Identify patterns in customer preferences
   - Optimize default itineraries based on feedback

## Integration Example

### In Customer Portal

```tsx
import ItineraryView from '@/components/itinerary/ItineraryView';

// In your component
<ItineraryView 
  groupId={tripId} 
  isCustomerView={true} 
/>
```

### In Agent Dashboard

```tsx
import CustomerSuggestionsPanel from '@/app/agent-dashboard/components/CustomerSuggestionsPanel';

// In your component
<CustomerSuggestionsPanel groupId={selectedGroupId} />
```

## Testing

1. **Customer Flow**:
   - Login as customer
   - View itinerary
   - Click quick action buttons
   - Submit full suggestion
   - Verify success message

2. **Agent Flow**:
   - Open agent dashboard
   - Add CustomerSuggestionsPanel component
   - Verify suggestions appear
   - Test filtering
   - Test mark as implemented/dismiss

## Notes

- All suggestions are stored locally until backend integration is complete
- The feature is only visible when `isCustomerView={true}` is passed to ItineraryView
- Quick action buttons appear on every timeline event card
- The "Suggest Changes" button appears at the bottom of the itinerary for general suggestions
