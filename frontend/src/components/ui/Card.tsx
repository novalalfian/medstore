'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const cardVariants = cva(
  'bg-surface-container rounded-xl border border-outline-variant shadow-sm transition-all duration-200',
  {
    variants: {
      variant: {
        default: '',
        elevated: 'shadow-md hover:shadow-lg',
        outlined: 'border-2 border-outline-variant',
        ghost: 'bg-transparent border-transparent shadow-none',
        interactive: 'cursor-pointer hover:shadow-md hover:border-primary',
      },
      padding: {
        none: '',
        sm: 'p-space-sm',
        md: 'p-space-md',
        lg: 'p-gutter',
      },
    },
    defaultVariants: {
      variant: 'default',
      padding: 'md',
    },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, padding, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(cardVariants({ variant, padding }), className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Card.displayName = 'Card';

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center justify-between border-b border-outline-variant px-gutter py-space-md', className)}
      {...props}
    />
  )
);
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn('font-headline-sm text-headline-sm text-on-surface', className)}
      {...props}
    />
  )
);
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn('font-body-sm text-body-sm text-on-surface-variant mt-0.5', className)}
      {...props}
    />
  )
);
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-gutter', className)} {...props} />
  )
);
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center border-t border-outline-variant px-gutter py-space-md', className)}
      {...props}
    />
  )
);
CardFooter.displayName = 'CardFooter';

const StatCard = React.forwardRef<
  HTMLDivElement,
  {
    title: string;
    value: string | number;
    subtitle?: string;
    icon?: React.ReactNode;
    trend?: { value: number; label: string; positive?: boolean };
    className?: string;
  }
>(({ title, value, subtitle, icon, trend, className }, ref) => (
  <div
    ref={ref}
    className={cn(cardVariants({ variant: 'interactive', padding: 'md' }), className)}
  >
    <div className="flex items-start justify-between">
      <div className="min-w-0">
        <p className="font-label-md text-label-md text-outline tracking-wider uppercase">{title}</p>
        <p className="mt-1 font-headline-lg text-headline-lg text-on-surface font-semibold tabular-nums">{value}</p>
        {subtitle && <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">{subtitle}</p>}
        {trend && (
          <div className="mt-2 flex items-center gap-1.5">
            <span
              className={cn(
                'font-code-xs text-code-xs font-medium flex items-center gap-1',
                trend.positive ? 'text-secondary' : 'text-error'
              )}
            >
              <span className="material-symbols-outlined text-[12px]">
                {trend.positive ? 'trending_up' : 'trending_down'}
              </span>
              {Math.abs(trend.value)}%
            </span>
            <span className="font-code-xs text-code-xs text-outline">{trend.label}</span>
          </div>
        )}
      </div>
      {icon && (
        <div className="flex-shrink-0 ml-4 p-3 bg-surface-container-highest rounded-xl text-primary">
          {icon}
        </div>
      )}
    </div>
  </div>
));
StatCard.displayName = 'StatCard';

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, StatCard };