import os
import re

filepath = r"d:\Projects\Merydian\frontend\app\agent-dashboard\components\AgentDashboardInteractive.tsx"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# Replace activeGroups mock
content = content.replace("type TripRequest = any;\nconst activeGroups: any = [];", "type TripRequest = any;\nimport { tripsService } from '@/services/trips';")

# Replace states
old_states = """  const [isHydrated, setIsHydrated] = useState(false);
  const [filteredRequests, setFilteredRequests] = useState<TripRequest[]>(activeGroups);"""

new_states = """  const [isHydrated, setIsHydrated] = useState(false);
  const [activeGroups, setActiveGroups] = useState<any[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<TripRequest[]>([]);"""
content = content.replace(old_states, new_states)

# Replace useEffect
old_use_effect = """  useEffect(() => {
    setIsHydrated(true);
  }, []);"""

new_use_effect = """  useEffect(() => {
    setIsHydrated(true);
    tripsService.getAgentTrips().then((res: any) => {
      const items = res.items || res;
      if (Array.isArray(items)) {
        const formattedTrips = items.map((trip: any) => ({
          id: trip.trip_id,
          customerName: trip.trip_name || 'Unnamed Trip',
          destination: trip.destination || 'Unknown',
          status: trip.status || 'Pending',
          priority: 'Normal',
          budgetRange: { min: 1000, max: 5000 },
          startDate: trip.start_date || '2026-03-15',
          submittedAt: '2026-03-01T10:00:00Z',
        }));
        setActiveGroups(formattedTrips);
      }
    }).catch(err => console.error(err));
  }, []);"""
content = content.replace(old_use_effect, new_use_effect)

# In the second useEffect, replace activeGroups -> activeGroups
content = content.replace("let filtered = [...activeGroups];", "let filtered = [...activeGroups];")

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)
