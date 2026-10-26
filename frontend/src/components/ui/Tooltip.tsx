'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const tooltipVariants = cva(
  'absolute z-50 px-2.5 py-1.5 text-xs font-medium text-white bg-neutral-900 rounded-lg shadow-lg animate-in pointer-events-none',
  {
    variants: {
      side: {
        top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
        bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
        left: 'right-full top-1/2 -translate-y-1/2 mr-2',
        right: 'left-full top-1/2 -translate-y-1/2 ml-2',
      },
    },
    defaultVariants: {
      side: 'top',
    },
  }
);

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  side?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  className?: string;
}

const Tooltip = ({ content, children, side = 'top', delay = 200, className }: TooltipProps) => {
  const [visible, setVisible] = React.useState(false);
  const timeoutRef = React.useRef<NodeJS.Timeout>();
  const child = React.Children.only(children);

  const show = () => {
    timeoutRef.current = setTimeout(() => setVisible(true), delay);
  };
  const hide = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setVisible(false);
  };

  return (
    <div className="relative inline-block" onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}>
      {React.cloneElement(child, {
        ...child.props,
        'aria-describedby': visible ? 'tooltip' : undefined,
      })}
      {visible && (
        <div id="tooltip" role="tooltip" className={cn(tooltipVariants({ side }), className)}>
          {content}
        </div>
      )}
    </div>
  );
};

export { Tooltip };