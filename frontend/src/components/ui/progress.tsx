"use client";

import * as React from "react";

/**
 * Simple Tailwind progress bar.
 * Usage:
 *   <Progress value={72} className="h-2" />
 */
export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number; // 0–100
}

export const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ value = 0, className = "", ...props }, ref) => {
    const clamped = Math.max(0, Math.min(100, value));
    return (
      <div
        ref={ref}
        className={`relative w-full overflow-hidden rounded-full bg-muted ${className}`}
        {...props}
      >
        <div
          className="h-full bg-primary transition-[width] duration-500 ease-out"
          style={{ width: `${clamped}%` }}
        />
      </div>
    );
  }
);

Progress.displayName = "Progress";
