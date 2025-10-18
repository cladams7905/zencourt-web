"use client";

import { Lock, Sparkles, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Premium Upgrade Prompt Props
 */
export interface PremiumUpgradePromptProps {
  onClose?: () => void;
  className?: string;
}

/**
 * Premium Upgrade Prompt Component
 *
 * Overlay displayed on premium templates to encourage subscription upgrade
 */
export function PremiumUpgradePrompt({
  onClose,
  className = ""
}: PremiumUpgradePromptProps) {
  const benefits = [
    "Access to all premium templates",
    "Unlimited content generation",
    "Priority processing",
    "Advanced customization options",
    "Early access to new features"
  ];

  return (
    <div
      className={`absolute inset-0 bg-white/95 backdrop-blur-sm rounded-lg flex items-center justify-center p-6 ${className}`}
    >
      <div className="max-w-sm text-center space-y-6">
        {/* Lock Icon */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-100">
          <Lock className="h-8 w-8 text-yellow-900" />
        </div>

        {/* Heading */}
        <div className="space-y-2">
          <h3 className="text-2xl font-bold text-gray-900">Premium Template</h3>
          <p className="text-gray-600">
            Upgrade to access this template and unlock premium features
          </p>
        </div>

        {/* Benefits List */}
        <div className="text-left space-y-2">
          {benefits.map((benefit, index) => (
            <div key={index} className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                  <Check className="h-3 w-3 text-green-700" />
                </div>
              </div>
              <span className="text-sm text-gray-700">{benefit}</span>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-2">
          <Button className="w-full gap-2" size="lg">
            <Sparkles className="h-4 w-4" />
            Upgrade to Premium
          </Button>
          {onClose && (
            <Button
              variant="outline"
              className="w-full"
              size="lg"
              onClick={onClose}
            >
              View Free Templates
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
