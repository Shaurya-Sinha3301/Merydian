# Customer Suggestions Integration Example

## Quick Integration Guide

### Step 1: Add to Agent Dashboard Group Details Page

Add the CustomerSuggestionsPanel to your group details page to show customer suggestions for that specific group.

```tsx
// In frontend/app/agent-dashboard/[groupId]/components/GroupDetailsInteractive.tsx
// or any other agent dashboard page

import CustomerSuggestionsPanel from '@/app/agent-dashboard/components/CustomerSuggestionsPanel';

// Add this section in your component's return statement
<div className="mt-6">
  <CustomerSuggestionsPanel groupId={groupId} />
</div>
```

### Step 2: Add to Main Dashboard (Optional)

Show all suggestions across all groups on the main dashboard:

```tsx
// In frontend/app/agent-dashboard/components/AgentDashboardInteractive.tsx

import CustomerSuggestionsPanel from '@/app/agent-dashboard/components/CustomerSuggestionsPanel';

// Add a new section in your dashboard
<section className="mb-8">
  <h2 className="text-2xl font-bold text-gray-900 mb-4">Customer Suggestions</h2>
  <CustomerSuggestionsPanel />
</section>
```

### Step 3: Add as a Tab in Group Details

Create a tabbed interface with suggestions as one of the tabs:

```tsx
const [activeTab, setActiveTab] = useState<'overview' | 'itinerary' | 'suggestions'>('overview');

// Tab Navigation
<div className="flex gap-2 mb-6">
  <button
    onClick={() => setActiveTab('overview')}
    className={`px-6 py-3 rounded-xl font-semibold ${
      activeTab === 'overview' ? 'bg-black text-white' : 'bg-gray-100 text-gray-700'
    }`}
  >
    Overview
  </button>
  <button
    onClick={() => setActiveTab('itinerary')}
    className={`px-6 py-3 rounded-xl font-semibold ${
      activeTab === 'itinerary' ? 'bg-black text-white' : 'bg-gray-100 text-gray-700'
    }`}
  >
    Itinerary
  </button>
  <button
    onClick={() => setActiveTab('suggestions')}
    className={`px-6 py-3 rounded-xl font-semibold ${
      activeTab === 'suggestions' ? 'bg-black text-white' : 'bg-gray-100 text-gray-700'
    }`}
  >
    Suggestions
    {suggestionCount > 0 && (
      <span className="ml-2 px-2 py-1 bg-red-500 text-white text-xs rounded-full">
        {suggestionCount}
      </span>
    )}
  </button>
</div>

// Tab Content
{activeTab === 'suggestions' && (
  <CustomerSuggestionsPanel groupId={groupId} />
)}
```

## Testing the Feature

### As a Customer:

1. Navigate to customer portal: `/customer-portal`
2. Login with any customer credentials
3. Click on a trip card to view itinerary
4. On any timeline event, you'll see quick action buttons:
   - 🏔️ More Adventurous
   - 🔄 Replace This
   - ⏰ Change Time
   - ➖ Remove
   - 💡 Other

5. Click any button to open the suggestion modal
6. Fill in details and submit
7. You should see a success message

### As a Travel Agent:

1. Navigate to agent dashboard: `/agent-dashboard`
2. Add the CustomerSuggestionsPanel component to any page
3. You should see all customer suggestions
4. Use filter buttons to filter by type
5. Click "Implemented" or "Dismiss" to manage suggestions

## Example: Full Integration in Group Details

```tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import CustomerSuggestionsPanel from '@/app/agent-dashboard/components/CustomerSuggestionsPanel';

export default function GroupDetailsInteractive() {
  const params = useParams();
  const groupId = params.groupId as string;
  const [suggestionCount, setSuggestionCount] = useState(0);

  useEffect(() => {
    // Count suggestions for this group
    const stored = localStorage.getItem('itinerarySuggestions');
    if (stored) {
      const suggestions = JSON.parse(stored);
      setSuggestionCount(suggestions.length);
    }
  }, []);

  return (
    <div className="p-8">
      {/* Existing group details content */}
      
      {/* Customer Suggestions Section */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">
            Customer Feedback & Suggestions
          </h2>
          {suggestionCount > 0 && (
            <span className="px-4 py-2 bg-red-100 text-red-700 rounded-lg font-semibold">
              {suggestionCount} New Suggestion{suggestionCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <CustomerSuggestionsPanel groupId={groupId} />
      </div>
    </div>
  );
}
```

## Notification Badge Example

Add a notification badge to show unread suggestions:

```tsx
import { useState, useEffect } from 'react';

function useSuggestionCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const updateCount = () => {
      const stored = localStorage.getItem('itinerarySuggestions');
      if (stored) {
        const suggestions = JSON.parse(stored);
        setCount(suggestions.length);
      }
    };

    updateCount();
    
    // Listen for storage changes
    window.addEventListener('storage', updateCount);
    return () => window.removeEventListener('storage', updateCount);
  }, []);

  return count;
}

// Use in your component
function NavigationWithBadge() {
  const suggestionCount = useSuggestionCount();

  return (
    <Link href="/agent-dashboard/suggestions" className="relative">
      Suggestions
      {suggestionCount > 0 && (
        <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
          {suggestionCount}
        </span>
      )}
    </Link>
  );
}
```

## API Integration (Future)

When you're ready to connect to a backend API:

```tsx
// In SuggestChangeModal.tsx, replace localStorage with API call:

const handleSubmit = async () => {
  if (!selectedAction || !details.trim()) return;

  setIsSubmitting(true);

  const suggestion: ItinerarySuggestion = {
    // ... existing fields
  };

  try {
    // Send to backend
    const response = await fetch('/api/itinerary/suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(suggestion)
    });

    if (!response.ok) throw new Error('Failed to submit suggestion');

    setSubmitted(true);
    setTimeout(() => onClose(), 1500);
  } catch (error) {
    console.error('Error submitting suggestion:', error);
    // Show error message
  } finally {
    setIsSubmitting(false);
  }
};
```

```tsx
// In CustomerSuggestionsPanel.tsx, replace localStorage with API call:

useEffect(() => {
  const fetchSuggestions = async () => {
    try {
      const response = await fetch(`/api/itinerary/suggestions?groupId=${groupId}`);
      const data = await response.json();
      setSuggestions(data);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    }
  };

  fetchSuggestions();
}, [groupId]);
```

## Styling Customization

The components use Tailwind CSS. Customize colors and styles:

```tsx
// Change primary color from black to blue
className="bg-blue-600 text-white" // instead of bg-black

// Change success color
className="bg-emerald-600 text-white" // instead of bg-green-600

// Adjust spacing
className="p-8" // change to p-6 or p-10

// Modify border radius
className="rounded-2xl" // change to rounded-xl or rounded-3xl
```
