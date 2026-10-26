'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface SwitchProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
}

export const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, label, description, id, disabled, ...props }, ref) => {
    const switchId = id || `switch-${Math.random().toString(36).slice(2)}`;

    return (
      <div className="flex items-start gap-3">
        <label
          htmlFor={switchId}
          className="flex items-center gap-3 cursor-pointer"
          style={{ userSelect: 'none' }}
        >
          <div className="relative">
            <input
              ref={ref}
              type="checkbox"
              id={switchId}
              className="peer h-5 w-5 appearance-none rounded-full border-2 border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 checked:border-primary-600 checked:bg-primary-600 checked:after:translate-x-full disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow-md after:transition-transform after:duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-950"
              disabled={disabled}
              {...props}
            />
          </div>
          {label && (
            <div>
              <span className="text-sm font-medium text-neutral-900 dark:text-white">{label}</span>
              {description && (
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{description}</p>
              )}
            </div>
          )}
        </label>
      </div>
    );
  }
);

Switch.displayName = 'Switch';