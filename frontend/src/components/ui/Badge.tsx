'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 font-code-xs text-code-xs font-medium rounded-full px-2 py-0.5 transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-surface-container-highest text-on-surface-variant',
        primary: 'bg-primary-container text-on-primary-container',
        secondary: 'bg-secondary-container text-on-secondary-container',
        tertiary: 'bg-tertiary-container text-on-tertiary-container',
        success: 'bg-success-container text-on-success-container',
        warning: 'bg-warning-container text-on-warning-container',
        danger: 'bg-danger-container text-on-error-container',
        info: 'bg-info-container text-on-info-container',
        outline: 'bg-transparent text-on-surface border border-outline',
        ghost: 'bg-transparent text-on-surface-variant',
        dot: 'px-1.5',
      },
      size: {
        xs: 'px-1.5 py-0 text-code-xs gap-0.5',
        sm: 'px-1.5 py-0.5 text-code-xs gap-0.5',
        md: 'px-2 py-0.5 text-code-xs gap-1',
        lg: 'px-2.5 py-0.5 text-label-md gap-1.5',
      },
      dotColor: {
        primary: 'bg-primary',
        secondary: 'bg-secondary',
        tertiary: 'bg-tertiary',
        success: 'bg-success',
        warning: 'bg-warning',
        danger: 'bg-error',
        info: 'bg-info',
        outline: 'bg-outline',
        none: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
      dotColor: 'none',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, size, dotColor, dot, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(badgeVariants({ variant, size, dotColor }), className)}
        {...props}
      >
        {dot && (
          <span
            className={cn(
              'w-1.5 h-1.5 rounded-full flex-shrink-0',
              badgeVariants({ variant: 'dot', dotColor })
            )}
            aria-hidden="true"
          />
        )}
        {children}
      </span>
    );
  }
);
Badge.displayName = 'Badge';

export { Badge, badgeVariants };