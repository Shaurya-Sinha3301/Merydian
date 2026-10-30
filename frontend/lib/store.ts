import { create } from 'zustand';

interface AppState {
  activeTripId: string | null;
  setActiveTripId: (id: string | null) => void;
  
  isFeedbackPanelOpen: boolean;
  setFeedbackPanelOpen: (isOpen: boolean) => void;
  
  isDiffViewerOpen: boolean;
  setDiffViewerOpen: (isOpen: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeTripId: null,
  setActiveTripId: (id) => set({ activeTripId: id }),
  
  isFeedbackPanelOpen: false,
  setFeedbackPanelOpen: (isOpen) => set({ isFeedbackPanelOpen: isOpen }),
  
  isDiffViewerOpen: false,
  setDiffViewerOpen: (isOpen) => set({ isDiffViewerOpen: isOpen }),
}));
