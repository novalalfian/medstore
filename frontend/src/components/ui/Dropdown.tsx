'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { Button, type ButtonProps } from './Button';

export type DropdownMenuItem = | {
  label?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
  disabled?: boolean;
  divider?: false;
  children?: DropdownMenuItem[];
} | {
  divider: true;
  label?: undefined;
  icon?: undefined;
  onClick?: undefined;
  danger?: undefined;
  disabled?: undefined;
  children?: undefined;
};

interface DropdownProps {
  trigger: React.ReactElement<ButtonProps>;
  items: DropdownMenuItem[];
  align?: 'left' | 'right';
  className?: string;
}

export function Dropdown({ trigger, items, align = 'right', className }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        if (triggerRef.current && !triggerRef.current.contains(e.target as Node)) {
          setOpen(false);
        }
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false);
      triggerRef.current?.focus();
    }
  };

  const renderItems = (items: DropdownMenuItem[], level = 0) => (
    <>
      {items.map((item, index) => {
        if (item.divider) {
          return (
            <div
              key={`divider-${index}`}
              className="border-t border-outline-variant my-1"
              role="separator"
            />
          );
        }

        if (item.divider) {
          return <hr key={`divider-${Math.random()}`} className="my-1 border-t border-outline" />;
        }

        if (item.children) {
          return (
            <div key={item.label} className="relative">
              <button
                className={cn(
                  'w-full px-3 py-2 text-left font-body-sm text-body-sm rounded transition-colors',
                  item.disabled ? 'opacity-50 pointer-events-none' : 'hover:bg-surface-container-high',
                  item.danger ? 'text-error' : 'text-on-surface'
                )}
                disabled={item.disabled}
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                <span className="flex items-center gap-2">
                  {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
                  <span className="flex-1">{item.label}</span>
                  <span className="material-symbols-outlined text-[16px] text-on-surface-variant">chevron_right</span>
                </span>
              </button>
              {renderItems(item.children, level + 1)}
            </div>
          );
        }

        return (
          <button
            key={item.label}
            onClick={() => {
              item.onClick?.();
              setOpen(false);
            }}
            disabled={item.disabled}
            className={cn(
              'w-full px-3 py-2 text-left font-body-sm text-body-sm rounded transition-colors',
              item.disabled ? 'opacity-50 pointer-events-none' : 'hover:bg-surface-container-high',
              item.danger ? 'text-error' : 'text-on-surface'
            )}
          >
            <span className="flex items-center gap-2">
              {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
              <span className="flex-1">{item.label}</span>
            </span>
          </button>
        );
      })}
    </>
  );

  const dropdownContent = (
    <div
      ref={dropdownRef}
      className={cn(
        'fixed z-50 mt-1 min-w-[180px] bg-surface-container-low border border-outline-variant rounded-xl shadow-xl py-1 animate-slide-down',
        align === 'right' ? 'right-0' : 'left-0',
        className
      )}
      role="menu"
      onKeyDown={handleKeyDown}
    >
      {renderItems(items)}
    </div>
  );

  const triggerWithRef = (
    <span
      ref={triggerRef}
      onClick={(e: React.MouseEvent) => {
        e.stopPropagation();
        setOpen(!open);
        trigger.props.onClick?.(e as React.MouseEvent<HTMLButtonElement>);
      }}
    >
      {trigger}
    </span>
  );

  return (
    <>
      {triggerWithRef}
      {open && typeof window !== 'undefined' && createPortal(dropdownContent, document.body)}
    </>
  );
}