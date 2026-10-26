'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, X } from 'lucide-react';
import clsx from 'clsx';

interface SearchBarProps {
  placeholder?: string;
  onSearch: (query: string) => void;
  minChars?: number;
  debounceMs?: number;
  loading?: boolean;
  className?: string;
}

export default function SearchBar({
  placeholder = 'Cari...',
  onSearch,
  minChars = 3,
  debounceMs = 300,
  loading = false,
  className,
}: SearchBarProps) {
  const [value, setValue] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (value.length === 0) {
      onSearch('');
      return;
    }

    if (value.length >= minChars) {
      timerRef.current = setTimeout(() => {
        onSearch(value);
      }, debounceMs);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, minChars, debounceMs]);

  return (
    <div className={clsx('relative', className)}>
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Search className="h-5 w-5" />
        )}
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="block w-full rounded-lg border border-gray-300 pl-10 pr-10 py-2.5 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder:text-gray-400"
        aria-label={placeholder}
      />
      {value && (
        <button
          onClick={() => {
            setValue('');
            onSearch('');
          }}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
          aria-label="Hapus pencarian"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      {value.length > 0 && value.length < minChars && (
        <p className="absolute mt-1 text-xs text-gray-400">
          Ketik minimal {minChars} karakter
        </p>
      )}
    </div>
  );
}
