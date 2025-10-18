"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getSubscriptionStatus,
  canAccessPremiumTemplates,
  getSubscriptionFeatures
} from "@/db/actions/subscription";
import type { SubscriptionStatus } from "@/types/templates";

/**
 * Hook to fetch user subscription status
 *
 * @returns Query result with subscription status, loading, and error states
 */
export function useSubscription() {
  return useQuery<SubscriptionStatus, Error>({
    queryKey: ["subscription"],
    queryFn: getSubscriptionStatus,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    retry: 1, // Only retry once on error
    // Fallback to free tier on error
    placeholderData: {
      isSubscribed: false,
      plan: "free",
      features: {
        premiumTemplates: false,
        maxProjects: 5,
        maxVideosPerMonth: 10
      }
    }
  });
}

/**
 * Hook to check if user can access premium templates
 *
 * @returns Query result with premium access boolean
 */
export function useCanAccessPremium() {
  return useQuery<boolean, Error>({
    queryKey: ["can-access-premium"],
    queryFn: canAccessPremiumTemplates,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
    // Fallback to false on error
    placeholderData: false
  });
}

/**
 * Hook to get subscription features
 *
 * @returns Query result with subscription features
 */
export function useSubscriptionFeatures() {
  return useQuery<SubscriptionStatus["features"], Error>({
    queryKey: ["subscription-features"],
    queryFn: getSubscriptionFeatures,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
    placeholderData: {
      premiumTemplates: false,
      maxProjects: 5,
      maxVideosPerMonth: 10
    }
  });
}

/**
 * Derived hook to check if user has a specific plan
 *
 * @returns Object with plan check functions
 */
export function useSubscriptionPlan() {
  const { data: subscription } = useSubscription();

  return {
    isPremium: subscription?.plan === "premium",
    isEnterprise: subscription?.plan === "enterprise",
    isFree: subscription?.plan === "free" || !subscription?.isSubscribed,
    plan: subscription?.plan || "free"
  };
}

/**
 * Derived hook to check subscription limits
 *
 * @returns Object with limit check functions and values
 */
export function useSubscriptionLimits() {
  const { data: subscription } = useSubscription();

  return {
    maxProjects: subscription?.features.maxProjects || 5,
    maxVideosPerMonth: subscription?.features.maxVideosPerMonth || 10,
    canAccessPremium: subscription?.features.premiumTemplates || false
  };
}

/**
 * Hook to check if subscription is expiring soon
 *
 * @param daysThreshold - Number of days to consider as "soon" (default: 7)
 * @returns True if subscription expires within the threshold
 */
export function useIsSubscriptionExpiringSoon(daysThreshold = 7): boolean {
  const { data: subscription } = useSubscription();

  if (!subscription?.expiresAt || !subscription.isSubscribed) {
    return false;
  }

  const expiresAt = new Date(subscription.expiresAt);
  const now = new Date();
  const daysUntilExpiry = Math.ceil(
    (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  return daysUntilExpiry <= daysThreshold && daysUntilExpiry > 0;
}

/**
 * Hook to get subscription error message
 *
 * @param error - Error object
 * @returns User-friendly error message or null
 */
export function useSubscriptionError(error: Error | null): string | null {
  if (!error) return null;

  // Provide user-friendly error messages
  if (error.message.includes("not authenticated")) {
    return "Please sign in to view your subscription.";
  }

  // Generic fallback - don't show error since we have placeholder data
  return null;
}
