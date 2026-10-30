import { create } from 'zustand';

interface TripState {
  currentTripId: string | null;
  lastJobId: string | null;
  setCurrentTripId: (id: string | null) => void;
  setLastJobId: (id: string | null) => void;
}

export const useTripStore = create<TripState>((set) => ({
  currentTripId: localStorage.getItem('current_trip_id'),
  lastJobId: localStorage.getItem('last_job_id'),
  setCurrentTripId: (currentTripId) => {
    if (currentTripId) localStorage.setItem('current_trip_id', currentTripId);
    else localStorage.removeItem('current_trip_id');
    set({ currentTripId });
  },
  setLastJobId: (lastJobId) => {
    if (lastJobId) localStorage.setItem('last_job_id', lastJobId);
    else localStorage.removeItem('last_job_id');
    set({ lastJobId });
  },
}));
