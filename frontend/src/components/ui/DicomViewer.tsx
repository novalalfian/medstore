'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, RotateCw, FlipHorizontal, FlipVertical, Maximize, Minimize, Download, RefreshCw } from 'lucide-react';
import clsx from 'clsx';

interface DicomViewerProps {
  documentId: string;
  title: string;
  onClose: () => void;
  onDownload?: () => void;
}

export default function DicomViewer({ documentId, title, onClose, onDownload }: DicomViewerProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [windowLevel, setWindowLevel] = useState({ window: 400, level: 40 });
  const [metadata, setMetadata] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    let cornerstone: any = null;
    let cornerstoneTools: any = null;
    let dicomImageLoader: any = null;

    const initViewer = async () => {
      try {
        setLoading(true);
        
        // Dynamic imports for cornerstone
        cornerstone = await import('@cornerstonejs/core');
        cornerstoneTools = await import('@cornerstonejs/tools');
        dicomImageLoader = await import('@cornerstonejs/dicom-image-loader');

        // Initialize cornerstone
        await cornerstone.init();

        // Configure DICOM image loader
        const config = {
          maxWebWorkers: navigator.hardwareConcurrency || 4,
          useWebWorkers: true,
        };
        dicomImageLoader.webWorkerManager.initialize(config);

        // Add HTTP header for auth
        const token = localStorage.getItem('medstore-auth') 
          ? JSON.parse(localStorage.getItem('medstore-auth')!).state.token 
          : '';
        
        dicomImageLoader.configure({
          beforeSend: (xhr: XMLHttpRequest) => {
            if (token) {
              xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            }
          },
        });

        // Register image loader
        cornerstone.imageLoader.registerImageLoader(
          'wadouri',
          dicomImageLoader.instance
        );

        // Get metadata first
        const metadataUrl = `/api/documents/${documentId}/dicom/metadata`;
        const metaResponse = await fetch(metadataUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (!metaResponse.ok) {
          throw new Error('Gagal memuat metadata DICOM');
        }
        
        const meta = await metaResponse.json();
        if (mounted) setMetadata(meta);

        // Create viewport
        if (!viewportRef.current) return;

        const element = viewportRef.current;
        
        // Enable element
        const viewport = cornerstone.enable(element);

        // Set up tools
        cornerstoneTools.addTool(cornerstoneTools.WindowLevelTool);
        cornerstoneTools.addTool(cornerstoneTools.PanTool);
        cornerstoneTools.addTool(cornerstoneTools.ZoomTool);
        cornerstoneTools.addTool(cornerstoneTools.RotateTool);
        cornerstoneTools.addTool(cornerstoneTools.ProbeTool);

        cornerstoneTools.setToolActive('WindowLevelTool', { mouseButtonMask: 1 });
        cornerstoneTools.setToolActive('PanTool', { mouseButtonMask: 2 });
        cornerstoneTools.setToolActive('ZoomTool', { mouseButtonMask: 4 });

        // Load image
        const imageId = `wadouri:/api/documents/${documentId}/dicom/pixeldata`;
        
        const image = await cornerstone.loadImage(imageId);
        
        if (!mounted) return;

        // Set viewport
        viewport.setImage(image);
        viewport.reset();

        if (mounted) setLoading(false);

        // Cleanup function
        return () => {
          cornerstone.disable(element);
          cornerstoneTools.removeAllTools();
        };
      } catch (err: any) {
        console.error('DICOM viewer error:', err);
        if (mounted) {
          setError(err.message || 'Gagal memuat gambar DICOM');
          setLoading(false);
        }
      }
    };

    initViewer();

    return () => {
      mounted = false;
    };
  }, [documentId]);

  const handleZoomIn = () => setZoom((z) => Math.min(z * 1.2, 10));
  const handleZoomOut = () => setZoom((z) => Math.max(z / 1.2, 0.1));
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    // Reset viewport would need cornerstone reference
  };

  const handleRotateLeft = () => setRotation((r) => (r - 90) % 360);
  const handleRotateRight = () => setRotation((r) => (r + 90) % 360);

  const handleDownload = () => {
    if (onDownload) onDownload();
    else {
      window.open(`/api/documents/${documentId}/download`, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
        <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent mx-auto mb-4" />
          <p className="text-gray-600">Memuat gambar DICOM...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
        <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 text-center">
          <div className="w-16 h-16 rounded-full bg-danger-100 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-danger-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Gagal Memuat DICOM</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-neutral-800">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-white truncate max-w-xs">{title}</h2>
          {metadata && (
            <span className="px-2 py-1 text-xs bg-neutral-800 text-neutral-300 rounded">
              {metadata.modality} • {metadata.rows}×{metadata.columns} • {metadata.bitsAllocated}-bit
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onDownload && (
            <button
              onClick={handleDownload}
              className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
              title="Unduh"
            >
              <Download className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Viewport */}
      <div className="flex-1 flex items-center justify-center relative overflow-hidden">
        <div
          ref={viewportRef}
          className="w-full h-full"
          style={{
            transform: `
              scale(${zoom})
              rotate(${rotation}deg)
              scaleX(${flipH ? -1 : 1})
              scaleY(${flipV ? -1 : 1})
            `,
            transformOrigin: 'center center',
          }}
        />
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-center gap-2 p-4 border-t border-neutral-800 bg-neutral-950/50">
        <div className="flex items-center gap-1 p-1 bg-neutral-900 rounded-lg">
          <button
            onClick={handleZoomOut}
            className="p-2 text-neutral-400 hover:text-white rounded transition-colors"
            title="Zoom Out (-)"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
          <span className="px-2 text-neutral-300 text-sm font-mono min-w-[4rem] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="p-2 text-neutral-400 hover:text-white rounded transition-colors"
            title="Zoom In (+)"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
        </div>

        <div className="w-px h-8 bg-neutral-800 mx-2" />

        <div className="flex items-center gap-1 p-1 bg-neutral-900 rounded-lg">
          <button
            onClick={handleRotateLeft}
            className="p-2 text-neutral-400 hover:text-white rounded transition-colors"
            title="Putar Kiri (L)"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
          <button
            onClick={handleRotateRight}
            className="p-2 text-neutral-400 hover:text-white rounded transition-colors"
            title="Putar Kanan (R)"
          >
            <RotateCw className="w-5 h-5" />
          </button>
          <button
            onClick={() => setFlipH(!flipH)}
            className={clsx('p-2 rounded transition-colors', flipH ? 'text-primary-400' : 'text-neutral-400 hover:text-white')}
            title="Flip Horizontal (H)"
          >
            <FlipHorizontal className="w-5 h-5" />
          </button>
          <button
            onClick={() => setFlipV(!flipV)}
            className={clsx('p-2 rounded transition-colors', flipV ? 'text-primary-400' : 'text-neutral-400 hover:text-white')}
            title="Flip Vertical (V)"
          >
            <FlipVertical className="w-5 h-5" />
          </button>
        </div>

        <div className="w-px h-8 bg-neutral-800 mx-2" />

        <button
          onClick={handleReset}
          className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
          title="Reset Tampilan (0)"
        >
          <RefreshCw className="w-5 h-5" />
        </button>

        <div className="w-px h-8 bg-neutral-800 mx-2" />

        <div className="text-xs text-neutral-500 px-2">
          Scroll: Zoom | Drag: Pan | Shift+Drag: Window/Level
        </div>
      </div>

      {/* Metadata Panel (bottom) */}
      {metadata && (
        <div className="p-4 border-t border-neutral-800 bg-neutral-950/50 max-h-48 overflow-y-auto">
          <h3 className="text-sm font-medium text-neutral-300 mb-2">Metadata DICOM</h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div><span className="text-neutral-500">Study Instance UID:</span></div>
            <div className="text-neutral-300 font-mono truncate">{metadata.studyInstanceUID}</div>
            <div><span className="text-neutral-500">Series Instance UID:</span></div>
            <div className="text-neutral-300 font-mono truncate">{metadata.seriesInstanceUID}</div>
            <div><span className="text-neutral-500">SOP Instance UID:</span></div>
            <div className="text-neutral-300 font-mono truncate">{metadata.sopInstanceUID}</div>
            <div><span className="text-neutral-500">Patient Name:</span></div>
            <div className="text-neutral-300">{metadata.patientName}</div>
            <div><span className="text-neutral-500">Patient ID:</span></div>
            <div className="text-neutral-300">{metadata.patientID}</div>
            <div><span className="text-neutral-500">Study Date/Time:</span></div>
            <div className="text-neutral-300">{metadata.studyDate} {metadata.studyTime}</div>
            <div><span className="text-neutral-500">Modality:</span></div>
            <div className="text-neutral-300">{metadata.modality}</div>
            <div><span className="text-neutral-500">Dimensions:</span></div>
            <div className="text-neutral-300">{metadata.rows} × {metadata.columns}</div>
            <div><span className="text-neutral-500">Bit Depth:</span></div>
            <div className="text-neutral-300">{metadata.bitsStored} bits stored / {metadata.bitsAllocated} bits allocated</div>
            <div><span className="text-neutral-500">Photometric:</span></div>
            <div className="text-neutral-300">{metadata.photometricInterpretation}</div>
            <div><span className="text-neutral-500">Transfer Syntax:</span></div>
            <div className="text-neutral-300 font-mono truncate">{metadata.transferSyntaxUID}</div>
          </div>
        </div>
      )}
    </div>
  );
}

// Import AlertTriangle for error state
import { AlertTriangle } from 'lucide-react';