'use client';

import React, { useState, useRef, useCallback } from 'react';
import clsx from 'clsx';
import { Upload, X, FileText } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSizeMB?: number;
  progress?: number;
  uploading?: boolean;
  className?: string;
}

const MAX_SIZE_DEFAULT = 100; // MB

export default function FileUpload({
  onFileSelect,
  accept,
  maxSizeMB = MAX_SIZE_DEFAULT,
  progress,
  uploading = false,
  className,
}: FileUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const maxBytes = maxSizeMB * 1024 * 1024;

  const validateAndSelect = useCallback(
    (file: File) => {
      setError(null);

      if (file.size > maxBytes) {
        setError(`Ukuran file melebihi ${maxSizeMB}MB`);
        return;
      }

      if (accept) {
        const allowedTypes = accept.split(',').map((t) => t.trim());
        const ext = '.' + file.name.split('.').pop()?.toLowerCase();
        const matches = allowedTypes.some(
          (t) => t === file.type || t === ext || (t.endsWith('/*') && file.type.startsWith(t.replace('/*', '/')))
        );
        if (!matches) {
          setError('Tipe file tidak didukung');
          return;
        }
      }

      setSelectedFile(file);
      onFileSelect(file);
    },
    [accept, maxBytes, maxSizeMB, onFileSelect]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) validateAndSelect(file);
    },
    [validateAndSelect]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) validateAndSelect(file);
  };

  const clearFile = () => {
    setSelectedFile(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className={className}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={clsx(
          'relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 cursor-pointer transition-colors',
          dragOver
            ? 'border-primary-500 bg-primary-50'
            : 'border-gray-300 bg-gray-50 hover:border-primary-400 hover:bg-primary-50/50'
        )}
        role="button"
        tabIndex={0}
        aria-label="Pilih atau seret file"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
        }}
      >
        <Upload
          className={clsx(
            'h-10 w-10',
            dragOver ? 'text-primary-500' : 'text-gray-400'
          )}
        />
        <div className="text-center">
          <p className="text-sm font-medium text-gray-700">
            Seret file ke sini atau{' '}
            <span className="text-primary-600">pilih file</span>
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Maksimal {maxSizeMB}MB
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleChange}
          className="hidden"
          aria-hidden="true"
        />
      </div>

      {error && (
        <p className="mt-2 text-sm text-danger-600">{error}</p>
      )}

      {selectedFile && !error && (
        <div className="mt-3 flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3">
          <FileText className="h-8 w-8 text-primary-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {selectedFile.name}
            </p>
            <p className="text-xs text-gray-500">
              {formatSize(selectedFile.size)}
            </p>
            {uploading && progress !== undefined && (
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </div>
          {!uploading && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearFile();
              }}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
              aria-label="Hapus file"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
