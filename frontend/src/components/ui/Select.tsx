'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const selectTriggerVariants = cva(
  'w-full h-9 pl-10 pr-32 bg-surface-container-lowest text-on-surface border border-outline-variant rounded-lg appearance-none',
  {
    variants: {
      state: {
        default: '',
        error: 'border-error focus:ring-2 focus:ring-error/20',
        success: 'border-success focus:ring-2 focus:ring-success/20',
      },
      hasIcon: {
        true: 'pl-10',
        false: '',
      },
    },
    defaultVariants: {
      state: 'default',
      hasIcon: false,
    },
  }
);

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
  icon?: React.ReactNode;
}

export function Select({
  className,
  label,
  hint,
  error,
  options,
  placeholder,
  icon,
  id,
  required,
  ...props
}: SelectProps) {
  const selectId = id || React.useId();
  const errorId = error ? `${selectId}-error` : undefined;
  const hintId = hint && !error ? `${selectId}-hint` : undefined;

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label htmlFor={selectId} className="block font-label-md text-label-md text-on-surface-variant mb-1">
          {label}
          {required && <span className="text-error ml-0.5" aria-hidden="true">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-space-md top-1/2 -translate-y-1/2 text-outline text-[18px] pointer-events-none">
            {icon}
          </span>
        )}
        <select
          id={selectId}
          className={cn(
            selectTriggerVariants({ state: error ? 'error' : 'default', hasIcon: !!icon }),
            'focus:outline-none focus:ring-2 focus:ring-primary-container focus:border-primary-container',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'hover:border-outline'
          )}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={errorId || hintId}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="absolute right-space-md top-1/2 -translate-y-1/2 text-outline text-[18px] pointer-events-none">
          <span className="material-symbols-outlined">expand_more</span>
        </span>
      </div>
      {error && (
        <p id={errorId} className="mt-1 font-code-xs text-code-xs text-error flex items-center gap-1" role="alert">
          <span className="material-symbols-outlined text-[12px]">error</span>
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={hintId} className="mt-1 font-code-xs text-code-xs text-outline">
          {hint}
        </p>
      )}
    </div>
  );
}

export { selectTriggerVariants };