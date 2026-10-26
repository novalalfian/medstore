'use client';

import React, { useState, useRef, useCallback } from 'react';
import clsx from 'clsx';
import { Upload, X, FileText, CheckCircle, Loader2, Trash2 } from 'lucide-react';

interface FileItem {
  file: File;
  id: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

interface MultiFileUploadProps {
  patientId: string;
  category: string;
  onUploadComplete: (results: { uploaded: any[]; failed: any[] }) => void;
  onUploadProgress?: (overallProgress: number) => void;
  maxFiles?: number;
  maxSizeMB?: number;
  accept?: string;
  className?: string;
}

export default function MultiFileUpload({
  patientId,
  category,
  onUploadComplete,
  onUploadProgress,
  maxFiles = 10,
  maxSizeMB = 100,
  accept = '.pdf,.jpg,.jpeg,.png,.dcm',
  className,
}: MultiFileUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const maxBytes = maxSizeMB * 1024 * 1024;

  const validateFile = useCallback((file: File): string | null => {
    if (file.size > maxBytes) {
      return `Ukuran file melebihi ${maxSizeMB}MB`;
    }
    if (accept) {
      const allowedTypes = accept.split(',').map((t) => t.trim());
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      const matches = allowedTypes.some(
        (t) => t === file.type || t === ext || (t.endsWith('/*') && file.type.startsWith(t.replace('/*', '/')))
      );
      if (!matches) {
        return 'Tipe file tidak didukung';
      }
    }
    return null;
  }, [accept, maxBytes, maxSizeMB]);

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);
    const validFiles: FileItem[] = [];
    let hasError = false;

    for (const file of fileArray) {
      if (files.length + validFiles.length >= maxFiles) {
        setError(`Maksimal ${maxFiles} file sekaligus`);
        hasError = true;
        break;
      }

      const validationError = validateFile(file);
      if (validationError) {
        setError(`${file.name}: ${validationError}`);
        hasError = true;
        continue;
      }

      validFiles.push({
        file,
        id: `${file.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        progress: 0,
        status: 'pending',
      });
    }

    if (validFiles.length > 0) {
      setFiles((prev) => [...prev, ...validFiles]);
      setError(null);
    }
  }, [files.length, maxFiles, validateFile]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (fileList) addFiles(fileList);
    if (inputRef.current) inputRef.current.value = '';
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const clearAll = () => {
    setFiles([]);
    setError(null);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleUpload = async () => {
    if (files.length === 0 || uploading) return;

    const pendingFiles = files.filter((f) => f.status === 'pending');
    if (pendingFiles.length === 0) return;

    setUploading(true);
    setError(null);

    // Update status to uploading
    setFiles((prev) =>
      prev.map((f) => (f.status === 'pending' ? { ...f, status: 'uploading' as const } : f))
    );

    try {
      const formData = new FormData();
      pendingFiles.forEach((item) => formData.append('files', item.file));
      formData.append('patient_id', patientId);
      formData.append('category', category);

      const response = await fetch('/api/documents/batch/upload', {
        method: 'POST',
        body: formData,
        headers: {
          Authorization: `Bearer ${localStorage.getItem('medstore-auth') ? JSON.parse(localStorage.getItem('medstore-auth')!).state.token : ''}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || 'Upload gagal');
      }

      // Mark uploaded files as completed
      setFiles((prev) =>
        prev.map((f) => {
          const uploaded = result.uploaded.find((u: any) => u.title === f.file.name);
          if (uploaded) return { ...f, status: 'completed' as const, progress: 100 };
          const failed = result.failed.find((u: any) => u.filename === f.file.name);
          if (failed) return { ...f, status: 'error' as const, error: failed.error };
          return f;
        })
      );

      onUploadComplete(result);
    } catch (err: any) {
      setError(err.message || 'Upload gagal');
      setFiles((prev) =>
        prev.map((f) => (f.status === 'uploading' ? { ...f, status: 'error' as const, error: err.message } : f))
      );
    } finally {
      setUploading(false);
    }
  };

  const overallProgress = files.length > 0
    ? Math.round(files.reduce((sum, f) => sum + f.progress, 0) / files.length)
    : 0;

  if (onUploadProgress) {
    onUploadProgress(overallProgress);
  }

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
          'relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 cursor-pointer transition-colors',
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
        <Upload className={clsx('h-12 w-12', dragOver ? 'text-primary-500' : 'text-gray-400')} />
        <div className="text-center">
          <p className="text-sm font-medium text-gray-700">
            Seret file ke sini atau{' '}
            <span className="text-primary-600">pilih file</span>
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Maksimal {maxFiles} file, {maxSizeMB}MB per file. Format: PDF, JPG, PNG, DICOM
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple
          onChange={handleChange}
          className="hidden"
          aria-hidden="true"
        />
      </div>

      {error && (
        <p className="mt-2 text-sm text-danger-600">{error}</p>
      )}

      {files.length > 0 && (
        <div className="mt-4 space-y-2 max-h-96 overflow-y-auto">
          <div className="flex items-center justify-between text-sm font-medium text-gray-700">
            <span>File yang dipilih ({files.length}/{maxFiles})</span>
            <button
              onClick={clearAll}
              disabled={uploading}
              className="text-xs text-gray-500 hover:text-gray-700 disabled:opacity-50"
            >
              Hapus semua
            </button>
          </div>

          {files.map((item) => (
            <div
              key={item.id}
              className={clsx(
                'flex items-center gap-3 rounded-lg border p-3',
                item.status === 'completed' && 'bg-success-50 border-success-200',
                item.status === 'error' && 'bg-danger-50 border-danger-200',
                item.status === 'uploading' && 'bg-primary-50 border-primary-200',
                item.status === 'pending' && 'bg-white border-gray-200'
              )}
            >
              <FileText className={clsx(
                'h-8 w-8 flex-shrink-0',
                item.status === 'completed' && 'text-success-500',
                item.status === 'error' && 'text-danger-500',
                item.status === 'uploading' && 'text-primary-500 animate-spin',
                item.status === 'pending' && 'text-primary-500'
              )} />

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{item.file.name}</p>
                <p className="text-xs text-gray-500 flex items-center gap-2">
                  <span>{formatSize(item.file.size)}</span>
                  {item.status === 'uploading' && (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin text-primary-500" />
                      <span>Mengunggah... {item.progress}%</span>
                    </>
                  )}
                  {item.status === 'completed' && (
                    <>
                      <CheckCircle className="h-3 w-3 text-success-500" />
                      <span className="text-success-600">Selesai</span>
                    </>
                  )}
                  {item.status === 'error' && (
                    <>
                      <span className="text-danger-600">Error: {item.error}</span>
                    </>
                  )}
                </p>

                {(item.status === 'uploading' || item.status === 'completed') && (
                  <div className="mt-1 w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className={clsx(
                        'h-1.5 rounded-full transition-all duration-300',
                        item.status === 'completed' ? 'bg-success-500' : 'bg-primary-500'
                      )}
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                )}
              </div>

              {!uploading && item.status !== 'completed' && (
                <button
                  onClick={() => removeFile(item.id)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded"
                  aria-label="Hapus file"
                >
                  <X className="h-4 w-4" />
                </button>
              )}

              {item.status === 'error' && !uploading && (
                <button
                  onClick={() => removeFile(item.id)}
                  className="p-1 text-danger-400 hover:text-danger-600 rounded"
                  aria-label="Hapus file error"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {files.some((f) => f.status === 'pending') && !uploading && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload className="w-4 h-4" />
            Mulai Upload ({files.filter((f) => f.status === 'pending').length} file)
          </button>
        </div>
      )}

      {files.every((f) => f.status === 'completed') && files.length > 0 && (
        <div className="mt-4 p-3 rounded-lg bg-success-50 border border-success-200 text-success-800 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span>Semua {files.length} file berhasil diunggah dan diverifikasi SHA-256</span>
          </div>
        </div>
      )}
    </div>
  );
}