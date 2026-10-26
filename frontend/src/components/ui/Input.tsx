'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const inputVariants = cva(
  'w-full bg-surface-container-lowest text-on-surface placeholder:text-outline border border-outline-variant rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variants: {
      inputSize: {
        sm: 'h-8 px-3 text-code-sm',
        md: 'h-9 px-space-md text-body-md',
        lg: 'h-10 px-space-lg text-body-lg',
      },
      state: {
        default: '',
        error: 'border-error focus:ring-2 focus:ring-error/20',
        success: 'border-success focus:ring-2 focus:ring-success/20',
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: {
      inputSize: 'md',
      state: 'default',
      fullWidth: true,
    },
  }
);

const labelVariants = cva(
  'block font-label-md text-label-md text-on-surface-variant mb-1',
  {
    variants: {
      required: {
        true: '',
        false: '',
      },
    },
    defaultVariants: {
      required: false,
    },
  }
);

const textareaVariants = cva(
  'w-full bg-surface-container-lowest text-on-surface placeholder:text-outline border border-outline-variant rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed resize-none',
  {
    variants: {
      size: {
        sm: 'h-24 px-3 text-code-sm',
        md: 'h-32 px-space-md text-body-md',
        lg: 'h-40 px-space-lg text-body-lg',
      },
      state: {
        default: '',
        error: 'border-error focus:ring-2 focus:ring-error/20',
        success: 'border-success focus:ring-2 focus:ring-success/20',
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: {
      size: 'md',
      state: 'default',
      fullWidth: true,
    },
  }
);

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof inputVariants> {
  label?: string;
  hint?: string;
  error?: string;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, inputSize, state, fullWidth, label, hint, error, iconLeft, iconRight, id, ...props }, ref) => {
    const inputId = id || React.useId();
    const errorId = error ? `${inputId}-error` : undefined;
    const hintId = hint && !error ? `${inputId}-hint` : undefined;

    return (
      <div className={cn('w-full', fullWidth && 'w-full')}>
        {label && (
          <label htmlFor={inputId} className="block font-label-md text-label-md text-on-surface-variant mb-1">
            {label}
            {props.required && <span className="text-error ml-0.5" aria-hidden="true">*</span>}
          </label>
        )}
        <div className="relative">
          {iconLeft && (
            <span className="absolute left-space-md top-1/2 -translate-y-1/2 text-outline text-[18px] pointer-events-none">
              {iconLeft}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(inputVariants({ inputSize, state, fullWidth }), className, iconLeft && 'pl-10', iconRight && 'pr-10')}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={errorId || hintId}
            {...props}
          />
          {iconRight && (
            <span className="absolute right-space-md top-1/2 -translate-y-1/2 text-outline text-[18px] pointer-events-none">
              {iconRight}
            </span>
          )}
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
);
Input.displayName = 'Input';

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, required, children, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(labelVariants({ required }), className)}
      {...props}
    >
      {children}
      {required && <span className="text-error ml-0.5" aria-hidden="true">*</span>}
    </label>
  )
);
Label.displayName = 'Label';

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    VariantProps<typeof textareaVariants> {
  label?: string;
  hint?: string;
  error?: string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, size, state, fullWidth, label, hint, error, id, ...props }, ref) => {
    const textareaId = id || React.useId();
    const errorId = error ? `${textareaId}-error` : undefined;
    const hintId = hint && !error ? `${textareaId}-hint` : undefined;

    return (
      <div className={cn('w-full', fullWidth && 'w-full')}>
        {label && (
          <label htmlFor={textareaId} className="block font-label-md text-label-md text-on-surface-variant mb-1">
            {label}
            {props.required && <span className="text-error ml-0.5" aria-hidden="true">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={cn(textareaVariants({ size, state, fullWidth }), className)}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={errorId || hintId}
          {...props}
        />
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
);
Textarea.displayName = 'Textarea';

export { Input, Textarea, Label, inputVariants, textareaVariants, labelVariants };