'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const tabsVariants = cva('flex gap-1', {
  variants: {
    variant: {
      default: 'bg-neutral-100 rounded-lg p-1',
      underline: 'border-b border-neutral-200 -mb-px',
      pills: '',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

const tabTriggerVariants = cva(
  'inline-flex items-center justify-center gap-1.5 font-medium rounded-md transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap',
  {
    variants: {
      variant: {
        default: 'data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=inactive]:text-neutral-600 data-[state=inactive]:hover:text-neutral-900 data-[state=inactive]:hover:bg-neutral-50',
        underline: 'bg-transparent data-[state=active]:text-primary-600 data-[state=active]:border-b-2 data-[state=active]:border-primary-600 data-[state=inactive]:text-neutral-500 data-[state=inactive]:hover:text-neutral-700',
        pills: 'data-[state=active]:bg-primary-100 data-[state=active]:text-primary-700 data-[state=inactive]:text-neutral-600 data-[state=inactive]:hover:text-neutral-900 data-[state=inactive]:hover:bg-neutral-100',
      },
      size: {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2 text-sm',
        lg: 'px-6 py-3 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

interface TabsProps {
  defaultValue: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  variant?: 'default' | 'underline' | 'pills';
  className?: string;
}

interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'underline' | 'pills';
}

interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

const TabsContext = React.createContext<{ value: string; onChange: (v: string) => void; variant: 'default' | 'underline' | 'pills' } | null>(null);

const Tabs = ({ defaultValue, onValueChange, children, variant = 'default', className }: TabsProps) => {
  const [value, setValue] = React.useState(defaultValue);

  const handleChange = (v: string) => {
    setValue(v);
    onValueChange?.(v);
  };

  return (
    <TabsContext.Provider value={{ value, onChange: handleChange, variant }}>
      <div className={cn(className)}>{children}</div>
    </TabsContext.Provider>
  );
};

const TabsList = ({ children, variant = 'default', className, ...props }: TabsListProps) => {
  const context = React.useContext(TabsContext);
  return (
    <div
      role="tablist"
      className={cn(tabsVariants({ variant }), className)}
      {...props}
    >
      {children}
    </div>
  );
};

const TabsTrigger = ({ value, disabled, size = 'md', className, children, ...props }: TabsTriggerProps) => {
  const context = React.useContext(TabsContext);
  if (!context) throw new Error('TabsTrigger must be used within Tabs');

  const { value: currentValue, onChange, variant: tabsVariant } = context;
  const isActive = currentValue === value;

  return (
    <button
      role="tab"
      aria-selected={isActive}
      aria-controls={`panel-${value}`}
      id={`tab-${value}`}
      data-state={isActive ? 'active' : 'inactive'}
      disabled={disabled}
      onClick={() => !disabled && onChange(value)}
      className={cn(tabTriggerVariants({ variant: tabsVariant, size }), className)}
      {...props}
    >
      {children}
    </button>
  );
};

const TabsContent = ({ value, className, children, ...props }: TabsContentProps) => {
  const context = React.useContext(TabsContext);
  if (!context) throw new Error('TabsContent must be used within Tabs');

  const { value: currentValue } = context;
  const isActive = currentValue === value;

  if (!isActive) return null;

  return (
    <div
      role="tabpanel"
      id={`panel-${value}`}
      aria-labelledby={`tab-${value}`}
      className={cn('animate-in', className)}
      {...props}
    >
      {children}
    </div>
  );
};

Tabs.displayName = 'Tabs';
TabsList.displayName = 'TabsList';
TabsTrigger.displayName = 'TabsTrigger';
TabsContent.displayName = 'TabsContent';

export { Tabs, TabsList, TabsTrigger, TabsContent };