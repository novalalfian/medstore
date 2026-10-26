'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const progressVariants = cva(
  'relative h-2 w-full overflow-hidden rounded-full bg-neutral-200',
  {
    variants: {
      size: {
        xs: 'h-1',
        sm: 'h-1.5',
        md: 'h-2',
        lg: 'h-3',
        xl: 'h-4',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
);

const progressIndicatorVariants = cva(
  'h-full rounded-full transition-all duration-300 ease-out',
  {
    variants: {
      variant: {
        default: 'bg-primary-600',
        primary: 'bg-primary-600',
        secondary: 'bg-secondary-600',
        success: 'bg-success-600',
        warning: 'bg-warning-600',
        danger: 'bg-danger-600',
        info: 'bg-info-600',
      },
      striped: {
        true: 'bg-gradient-to-r from-transparent via-white/20 to-transparent bg-[length:20px_100%] animate-[progress-stripe_1s_linear_infinite]',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      striped: false,
    },
  }
);

interface ProgressProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof progressVariants> {
  value: number;
  max?: number;
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
  showLabel?: boolean;
  label?: string;
  striped?: boolean;
  animated?: boolean;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value, max = 100, variant, size, showLabel, label, striped, animated, ...props }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

    return (
      <div ref={ref} className={cn('w-full', className)} {...props}>
        {(showLabel || label) && (
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-medium text-neutral-700">{label || `Progress`}</span>
            <span className="text-sm font-mono tabular-nums text-neutral-500">{percentage.toFixed(0)}%</span>
          </div>
        )}
        <div
          className={cn(progressVariants({ size }), className)}
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={label}
        >
          <div
            className={cn(progressIndicatorVariants({ variant, striped: striped || animated }))}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  }
);
Progress.displayName = 'Progress';

const CircularProgress = React.forwardRef<
  SVGSVGElement,
  {
    value: number;
    max?: number;
    size?: number;
    strokeWidth?: number;
    variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
    showLabel?: boolean;
    className?: string;
  }
>(({ value, max = 100, size = 48, strokeWidth = 4, variant = 'primary', showLabel, className }, ref) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  const variantColors = {
    default: 'text-primary-600',
    primary: 'text-primary-600',
    secondary: 'text-secondary-600',
    success: 'text-success-600',
    warning: 'text-warning-600',
    danger: 'text-danger-600',
    info: 'text-info-600',
  };

  return (
    <svg
      ref={ref}
      width={size}
      height={size}
      className={cn(variantColors[variant], className)}
      viewBox={`0 0 ${size} ${size}`}
      role="progressbar"
      aria-valuenow={percentage}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <circle
        className="text-neutral-200"
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-300 ease-out"
        style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
      />
      {showLabel && (
        <text
          x={size / 2}
          y={size / 2}
          textAnchor="middle"
          dominantBaseline="central"
          className="font-mono font-semibold"
          fontSize={size / 4}
        >
          {percentage.toFixed(0)}%
        </text>
      )}
    </svg>
  );
});
CircularProgress.displayName = 'CircularProgress';

export { Progress, CircularProgress };