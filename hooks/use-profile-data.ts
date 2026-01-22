"use client";

import { useCallback, useEffect, useRef } from "react";
import { useProfileStore } from "@/lib/store";
import { useFetchWithCsrf } from "@/hooks/use-fetch-with-csrf";
import type { ProfileResponse } from "@/lib/types";

interface UseProfileDataOptions {
  /**
   * Whether to fetch profile on mount
   * @default true
   */
  fetchOnMount?: boolean;

  /**
   * Force refetch even if cache is valid
   * @default false
   */
  forceRefetch?: boolean;

  /**
   * Callback when profile is successfully fetched
   */
  onSuccess?: (profile: ProfileResponse) => void;

  /**
   * Callback when profile fetch fails
   */
  onError?: (error: string) => void;
}

/**
 * Hook for managing user profile data with caching
 *
 * Features:
 * - Global state management via Zustand
 * - Automatic cache invalidation
 * - Deduplication of concurrent requests
 * - Optimistic updates
 */
export function useProfileData(options: UseProfileDataOptions = {}) {
  const {
    fetchOnMount = true,
    forceRefetch = false,
    onSuccess,
    onError,
  } = options;

  const { fetchWithCsrf } = useFetchWithCsrf();
  const fetchingRef = useRef(false); // Prevent duplicate fetches

  const {
    profile,
    isLoading,
    error,
    lastFetched,
    setProfile,
    setLoading,
    setError,
    updateProfile,
    clearProfile,
    shouldRefetch,
  } = useProfileStore();

  /**
   * Fetch profile from API
   */
  const fetchProfile = useCallback(
    async (force = false) => {
      // Skip if already fetching
      if (fetchingRef.current) return;

      // Skip if cache is valid and not forcing
      if (!force && !shouldRefetch()) {
        return;
      }

      fetchingRef.current = true;
      setLoading(true);
      setError(null);

      try {
        const response = await fetchWithCsrf("/api/profile");

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || "Failed to fetch profile");
        }

        const data: ProfileResponse = await response.json();
        setProfile(data);
        onSuccess?.(data);

        return data;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to fetch profile";
        setError(message);
        onError?.(message);
        throw err;
      } finally {
        fetchingRef.current = false;
        setLoading(false);
      }
    },
    [
      fetchWithCsrf,
      shouldRefetch,
      setProfile,
      setLoading,
      setError,
      onSuccess,
      onError,
    ],
  );

  /**
   * Save profile updates to API
   */
  const saveProfile = useCallback(
    async (updates: Partial<ProfileResponse>) => {
      // Optimistic update
      const previousProfile = profile;
      if (profile) {
        updateProfile(updates);
      }

      try {
        const response = await fetchWithCsrf("/api/profile", {
          method: "PUT",
          body: JSON.stringify(updates),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || "Failed to save profile");
        }

        const data: ProfileResponse = await response.json();
        setProfile(data);

        return data;
      } catch (err) {
        // Rollback on error
        if (previousProfile) {
          setProfile(previousProfile);
        }
        throw err;
      }
    },
    [profile, updateProfile, fetchWithCsrf, setProfile],
  );

  /**
   * Refresh profile data (force refetch)
   */
  const refreshProfile = useCallback(() => {
    return fetchProfile(true);
  }, [fetchProfile]);

  // Fetch on mount if enabled
  useEffect(() => {
    if (fetchOnMount) {
      fetchProfile(forceRefetch);
    }
  }, [fetchOnMount, forceRefetch, fetchProfile]);

  return {
    profile,
    isLoading,
    error,
    lastFetched,

    // Actions
    fetchProfile,
    saveProfile,
    refreshProfile,
    updateProfile,
    clearProfile,

    // Computed
    hasProfile: !!profile,
    isCacheValid: !shouldRefetch(),

    // Convenience getters
    name: profile?.name,
    email: profile?.email,
    salaryHistory: profile?.salaryHistory ?? [],
    currentSalary: profile?.currentSalary,
    workingConfig: profile?.workingConfig,
    overtime: profile?.overtime,
    paymentConfig: profile?.paymentConfig,
    contact: profile?.contact,
  };
}

/**
 * Simplified hook for just reading profile data
 * Use this when you only need to display profile info
 */
export function useProfile() {
  const profile = useProfileStore((state: any) => state.profile);
  const isLoading = useProfileStore((state: any) => state.isLoading);

  return { profile, isLoading };
}

/**
 * Hook for checking if earnings should be shown
 * Combines profile setting with local override
 */
export function useShowEarnings() {
  const profile = useProfileStore((state: any) => state.profile);

  // Profile-level setting (from server)
  const serverSetting = profile?.showEarnings ?? false;

  return serverSetting;
}

export default useProfileData;
