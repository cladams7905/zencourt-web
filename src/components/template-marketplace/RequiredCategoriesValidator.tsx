"use client";

import { Check, X, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

/**
 * Required Categories Validator Props
 */
export interface RequiredCategoriesValidatorProps {
  requiredCategories: string[];
  availableCategories: string[];
  className?: string;
}

/**
 * Required Categories Validator Component
 *
 * Displays validation status for required image categories
 */
export function RequiredCategoriesValidator({
  requiredCategories,
  availableCategories,
  className = ""
}: RequiredCategoriesValidatorProps) {
  const missingCategories = requiredCategories.filter(
    (cat) => !availableCategories.includes(cat)
  );
  const hasMissingCategories = missingCategories.length > 0;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Category List */}
      <div className="space-y-2">
        {requiredCategories.map((category) => {
          const isAvailable = availableCategories.includes(category);
          return (
            <div
              key={category}
              className="flex items-center gap-2 text-sm"
            >
              {isAvailable ? (
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                  <Check className="h-3 w-3 text-green-700" />
                </div>
              ) : (
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-red-100 flex items-center justify-center">
                  <X className="h-3 w-3 text-red-700" />
                </div>
              )}
              <span
                className={
                  isAvailable
                    ? "text-gray-900 font-medium"
                    : "text-red-600 font-medium"
                }
              >
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </span>
              {!isAvailable && (
                <span className="text-xs text-red-500">(Missing)</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Warning Message */}
      {hasMissingCategories && (
        <Alert variant="destructive" className="bg-red-50 border-red-200">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-sm text-red-800">
            <p className="font-medium mb-1">Missing required categories</p>
            <p>
              Please add the missing categories to your project or choose a
              different template. You can re-categorize your images from the
              project editor.
            </p>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
