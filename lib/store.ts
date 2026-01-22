/**
 * Global State Management using Zustand
 *
 * Provides centralized state for:
 * - User profile data
 * - Authentication state
 * - UI preferences
 * - Cached data
 *
 * NOTE: Run `pnpm add zustand` to install the required dependency
 */

// @ts-nocheck - Zustand types will work once package is installed
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  ProfileResponse,
  WorkingConfig,
  OvertimeConfig,
  PaymentConfig,
  SalaryRecord,
} from "@/lib/types";

// User Profile State
interface UserProfileState {
  profile: ProfileResponse | null;
  isLoading: boolean;
  error: string | null;
  lastFetched: number | null;

  // Actions
  setProfile: (profile: ProfileResponse | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  updateProfile: (updates: Partial<ProfileResponse>) => void;
  clearProfile: () => void;
  shouldRefetch: () => boolean;
}

// Cache TTL in milliseconds (5 minutes for profile)
const PROFILE_CACHE_TTL = 5 * 60 * 1000;

export const useProfileStore = create<UserProfileState>()((set, get) => ({
  profile: null,
  isLoading: false,
  error: null,
  lastFetched: null,

  setProfile: (profile) =>
    set({
      profile,
      lastFetched: Date.now(),
      error: null,
    }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error, isLoading: false }),

  updateProfile: (updates) =>
    set((state) => ({
      profile: state.profile ? { ...state.profile, ...updates } : null,
      lastFetched: Date.now(),
    })),

  clearProfile: () =>
    set({
      profile: null,
      lastFetched: null,
      error: null,
    }),

  shouldRefetch: () => {
    const { lastFetched, profile } = get();
    if (!profile || !lastFetched) return true;
    return Date.now() - lastFetched > PROFILE_CACHE_TTL;
  },
}));

// UI Preferences State (persisted)
interface UIPreferencesState {
  sidebarCollapsed: boolean;
  showEarnings: boolean;
  compactMode: boolean;
  dateFormat: "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD";
  timeFormat: "12h" | "24h";
  weekStartsOn: 0 | 1; // 0 = Sunday, 1 = Monday

  // Actions
  toggleSidebar: () => void;
  setShowEarnings: (show: boolean) => void;
  setCompactMode: (compact: boolean) => void;
  setDateFormat: (format: UIPreferencesState["dateFormat"]) => void;
  setTimeFormat: (format: UIPreferencesState["timeFormat"]) => void;
  setWeekStartsOn: (day: UIPreferencesState["weekStartsOn"]) => void;
}

export const useUIPreferencesStore = create<UIPreferencesState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      showEarnings: false,
      compactMode: false,
      dateFormat: "MM/DD/YYYY",
      timeFormat: "12h",
      weekStartsOn: 1,

      toggleSidebar: () =>
        set((state) => ({
          sidebarCollapsed: !state.sidebarCollapsed,
        })),

      setShowEarnings: (showEarnings) => set({ showEarnings }),

      setCompactMode: (compactMode) => set({ compactMode }),

      setDateFormat: (dateFormat) => set({ dateFormat }),

      setTimeFormat: (timeFormat) => set({ timeFormat }),

      setWeekStartsOn: (weekStartsOn) => set({ weekStartsOn }),
    }),
    {
      name: "ui-preferences",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

// Time Entry Cache State
interface TimeEntryData {
  id: string;
  date: string;
  timeIn: string;
  timeOut: string;
  totalHours: number;
  workDescription?: string;
  client?: string;
  project?: string;
}

interface TimeEntryCacheState {
  entries: Map<string, TimeEntryData[]>; // Keyed by date
  pendingSync: TimeEntryData[]; // Entries waiting to be synced (offline)
  lastSync: number | null;

  // Actions
  setEntriesForDate: (date: string, entries: TimeEntryData[]) => void;
  addEntry: (entry: TimeEntryData) => void;
  updateEntry: (id: string, updates: Partial<TimeEntryData>) => void;
  removeEntry: (id: string) => void;
  addPendingSync: (entry: TimeEntryData) => void;
  clearPendingSync: () => void;
  clearCache: () => void;
}

export const useTimeEntryCacheStore = create<TimeEntryCacheState>()(
  (set, get) => ({
    entries: new Map(),
    pendingSync: [],
    lastSync: null,

    setEntriesForDate: (date, entries) =>
      set((state) => {
        const newEntries = new Map(state.entries);
        newEntries.set(date, entries);
        return { entries: newEntries, lastSync: Date.now() };
      }),

    addEntry: (entry) =>
      set((state) => {
        const newEntries = new Map(state.entries);
        const dateEntries = newEntries.get(entry.date) || [];
        newEntries.set(entry.date, [...dateEntries, entry]);
        return { entries: newEntries };
      }),

    updateEntry: (id, updates) =>
      set((state) => {
        const newEntries = new Map(state.entries);
        for (const [date, dateEntries] of newEntries) {
          const idx = dateEntries.findIndex((e) => e.id === id);
          if (idx !== -1) {
            const updated = [...dateEntries];
            updated[idx] = { ...updated[idx], ...updates };
            newEntries.set(date, updated);
            break;
          }
        }
        return { entries: newEntries };
      }),

    removeEntry: (id) =>
      set((state) => {
        const newEntries = new Map(state.entries);
        for (const [date, dateEntries] of newEntries) {
          const filtered = dateEntries.filter((e) => e.id !== id);
          if (filtered.length !== dateEntries.length) {
            newEntries.set(date, filtered);
            break;
          }
        }
        return { entries: newEntries };
      }),

    addPendingSync: (entry) =>
      set((state) => ({
        pendingSync: [...state.pendingSync, entry],
      })),

    clearPendingSync: () => set({ pendingSync: [] }),

    clearCache: () =>
      set({
        entries: new Map(),
        pendingSync: [],
        lastSync: null,
      }),
  }),
);

// Auth State
interface AuthState {
  isAuthenticated: boolean;
  user: {
    id: string;
    email: string;
    name: string;
  } | null;
  pinVerified: boolean;
  pinVerifiedAt: number | null;

  // Actions
  setAuthenticated: (user: AuthState["user"]) => void;
  logout: () => void;
  setPinVerified: (verified: boolean) => void;
}

// PIN verification TTL (5 minutes)
const PIN_VERIFICATION_TTL = 5 * 60 * 1000;

export const useAuthStore = create<AuthState>()((set, get) => ({
  isAuthenticated: false,
  user: null,
  pinVerified: false,
  pinVerifiedAt: null,

  setAuthenticated: (user) =>
    set({
      isAuthenticated: true,
      user,
    }),

  logout: () => {
    // Clear all stores on logout
    useProfileStore.getState().clearProfile();
    useTimeEntryCacheStore.getState().clearCache();

    set({
      isAuthenticated: false,
      user: null,
      pinVerified: false,
      pinVerifiedAt: null,
    });
  },

  setPinVerified: (verified) =>
    set({
      pinVerified: verified,
      pinVerifiedAt: verified ? Date.now() : null,
    }),
}));

// Helper to check if PIN is still verified within TTL
export function isPinStillVerified(): boolean {
  const { pinVerified, pinVerifiedAt } = useAuthStore.getState();
  if (!pinVerified || !pinVerifiedAt) return false;
  return Date.now() - pinVerifiedAt < PIN_VERIFICATION_TTL;
}

// Notification State
interface Notification {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message?: string;
  duration?: number;
}

interface NotificationState {
  notifications: Notification[];

  // Actions
  addNotification: (notification: Omit<Notification, "id">) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

export const useNotificationStore = create<NotificationState>()((set) => ({
  notifications: [],

  addNotification: (notification) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const newNotification = { ...notification, id };

    set((state) => ({
      notifications: [...state.notifications, newNotification],
    }));

    // Auto-remove after duration (default 5 seconds)
    const duration = notification.duration ?? 5000;
    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        }));
      }, duration);
    }
  },

  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),

  clearNotifications: () => set({ notifications: [] }),
}));
