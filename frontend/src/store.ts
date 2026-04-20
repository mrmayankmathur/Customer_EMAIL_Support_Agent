import { create } from 'zustand';

interface ThemeState {
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: 'dark', // default theme
  toggleTheme: () =>
    set((state) => {
      const newTheme = state.theme === 'dark' ? 'light' : 'dark';
      // update html class for tailwind dark mode
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return { theme: newTheme };
    }),
}));

// Basic types for the application data
export interface Ticket {
  ticket_id: string;
  category: string;
  confidence: number;
  status: string;
  needs_escalation: boolean;
  sender?: string;
  subject?: string;
  body?: string;
  created_at: string;
}

interface AppState {
  recentTickets: Ticket[];
  kpis: any;
  setRecentTickets: (tickets: Ticket[]) => void;
  setKpis: (kpis: any) => void;
}

export const useAppStore = create<AppState>((set) => ({
  recentTickets: [],
  kpis: null,
  setRecentTickets: (tickets) => set({ recentTickets: tickets }),
  setKpis: (kpis) => set({ kpis }),
}));
