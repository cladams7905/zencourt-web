"use server";

import { getUser } from "./users";
import type { SubscriptionStatus } from "@/types/templates";

/**
 * In-memory cache for subscription status
 * Key: userId, Value: { status, timestamp }
 */
const subscriptionCache = new Map<
  string,
  { status: SubscriptionStatus; timestamp: number }
>();

/**
 * Cache duration: 5 minutes
 */
const CACHE_DURATION_MS = 5 * 60 * 1000;

/**
 * Default free tier subscription
 */
const DEFAULT_FREE_SUBSCRIPTION: SubscriptionStatus = {
  isSubscribed: false,
  plan: "free",
  features: {
    premiumTemplates: false,
    maxProjects: 5,
    maxVideosPerMonth: 10
  }
};

/**
 * Get user subscription status
 * Server action that fetches subscription details from Stack Auth
 *
 * @returns Promise<SubscriptionStatus> - User subscription status
 * @throws Error if user is not authenticated
 */
export async function getSubscriptionStatus(): Promise<SubscriptionStatus> {
  try {
    // Get authenticated user
    const user = await getUser();

    // Check cache first
    const cached = subscriptionCache.get(user.id);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
      return cached.status;
    }

    // TODO: Integrate with Stack Auth subscription API
    // For now, we'll return a mock subscription based on user metadata
    // In a real implementation, you would:
    // 1. Check Stack Auth user metadata for subscription info
    // 2. Or integrate with a payment provider (Stripe, etc.)
    // 3. Or query a subscriptions table in the database

    // Example implementation (to be replaced with actual Stack Auth integration):
    /*
    const stackUser = await stackServerApp.getUser();
    const subscriptionData = stackUser?.clientMetadata?.subscription;

    if (subscriptionData?.plan === 'premium') {
      const subscription: SubscriptionStatus = {
        isSubscribed: true,
        plan: 'premium',
        expiresAt: new Date(subscriptionData.expiresAt),
        features: {
          premiumTemplates: true,
          maxProjects: 50,
          maxVideosPerMonth: 100
        }
      };

      // Cache the result
      subscriptionCache.set(user.id, {
        status: subscription,
        timestamp: Date.now()
      });

      return subscription;
    }
    */

    // For now, return default free tier
    const freeSubscription = { ...DEFAULT_FREE_SUBSCRIPTION };

    // Cache the result
    subscriptionCache.set(user.id, {
      status: freeSubscription,
      timestamp: Date.now()
    });

    return freeSubscription;
  } catch (error) {
    console.error("Error fetching subscription status:", error);

    // Fallback to free tier on error
    return { ...DEFAULT_FREE_SUBSCRIPTION };
  }
}

/**
 * Check if user can access premium templates
 * Server action that checks premium access
 *
 * @returns Promise<boolean> - True if user has premium access
 */
export async function canAccessPremiumTemplates(): Promise<boolean> {
  try {
    const subscription = await getSubscriptionStatus();
    return subscription.features.premiumTemplates;
  } catch (error) {
    console.error("Error checking premium access:", error);
    return false;
  }
}

/**
 * Clear subscription cache for a user
 * Useful after subscription changes
 *
 * @param userId - User ID (optional, clears current user if not provided)
 */
export async function clearSubscriptionCache(
  userId?: string
): Promise<void> {
  try {
    if (userId) {
      subscriptionCache.delete(userId);
    } else {
      const user = await getUser();
      subscriptionCache.delete(user.id);
    }
  } catch (error) {
    console.error("Error clearing subscription cache:", error);
  }
}

/**
 * Get subscription features for current user
 * Helper function to get just the features
 *
 * @returns Promise<SubscriptionStatus['features']> - Subscription features
 */
export async function getSubscriptionFeatures(): Promise<
  SubscriptionStatus["features"]
> {
  const subscription = await getSubscriptionStatus();
  return subscription.features;
}
