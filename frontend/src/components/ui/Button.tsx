'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-space-xs font-label-md text-label-md font-medium rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
  {
    variants: {
      variant: {
        primary: 'bg-primary-container text-on-primary-container hover:bg-primary-container/90 shadow-sm hover:shadow-md',
        secondary: 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest border border-outline-variant',
        tertiary: 'bg-transparent text-on-surface hover:bg-surface-container-high',
        ghost: 'bg-transparent text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface',
        danger: 'bg-error-container text-on-error-container hover:bg-error-container/90 shadow-sm',
        success: 'bg-success-container text-on-success-container hover:bg-success-container/90 shadow-sm',
        warning: 'bg-warning-container text-on-warning-container hover:bg-warning-container/90 shadow-sm',
        outline: 'bg-transparent text-on-surface border border-outline hover:bg-surface-container-high',
        tonal: 'bg-secondary-container text-on-secondary-container hover:bg-secondary-container/90',
      },
      size: {
        xs: 'h-7 px-2 text-code-xs gap-1',
        sm: 'h-8 px-3 text-body-sm gap-1.5',
        md: 'h-9 px-space-md text-label-md gap-space-xs',
        lg: 'h-10 px-space-lg text-body-md gap-space-sm',
        xl: 'h-11 px-space-xl text-body-lg gap-space-md',
        icon: 'h-9 w-9 p-0',
        'icon-sm': 'h-7 w-7 p-0',
        'icon-lg': 'h-11 w-11 p-0',
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      fullWidth: false,
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, fullWidth, loading, iconLeft, iconRight, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, fullWidth }), className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : (
          <>
            {iconLeft && <span className="flex-shrink-0">{iconLeft}</span>}
            {children}
            {iconRight && <span className="flex-shrink-0">{iconRight}</span>}
          </>
        )}
      </button>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };