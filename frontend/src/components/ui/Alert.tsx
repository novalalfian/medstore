'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

const alertVariants = cva(
  'relative flex items-start gap-3 rounded-lg border p-4',
  {
    variants: {
      variant: {
        default: 'bg-neutral-50 border-neutral-200 text-neutral-800',
        primary: 'bg-primary-50 border-primary-200 text-primary-800',
        secondary: 'bg-secondary-50 border-secondary-200 text-secondary-800',
        success: 'bg-success-50 border-success-200 text-success-800',
        warning: 'bg-warning-50 border-warning-200 text-warning-800',
        danger: 'bg-danger-50 border-danger-200 text-danger-800',
        info: 'bg-info-50 border-info-200 text-info-800',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

const icons = {
  default: AlertCircle,
  primary: Info,
  secondary: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  danger: AlertCircle,
  info: Info,
};

interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  title?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
  icon?: React.ReactNode;
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = 'default', title, dismissible, onDismiss, icon: customIcon, children, ...props }, ref) => {
    const Icon = icons[(variant || 'default') as keyof typeof icons] || AlertCircle;

    return (
      <div
        ref={ref}
        className={cn(alertVariants({ variant }), className)}
        role="alert"
        {...props}
      >
        <div className="flex-shrink-0 mt-0.5">
          {customIcon || <Icon className="h-5 w-5" />}
        </div>
        <div className="flex-1 min-w-0">
          {title && <h4 className="font-semibold mb-1">{title}</h4>}
          <div className="text-sm">{children}</div>
        </div>
        {dismissible && (
          <button
            type="button"
            onClick={onDismiss}
            className="flex-shrink-0 p-1 rounded hover:bg-neutral-200 text-neutral-400 transition-colors"
            aria-label="Tutup"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }
);
Alert.displayName = 'Alert';

export { Alert, alertVariants };