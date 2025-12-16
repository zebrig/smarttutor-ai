import React, { useState, useRef } from 'react';
import { Upload, Camera, Loader2, ArrowLeft, Settings, FileText, AlertTriangle } from 'lucide-react';
import { analyzePageContent } from '../services/geminiService';
import { loadPDFInfo, extractPDFPages, PDFInfo } from '../services/pdfService';
import { AnalysisResult } from '../types';
import { useI18n } from '../i18n';
import { isHeic, heicTo } from 'heic-to';
import { PageSelectorModal } from './PageSelectorModal';

interface UploadViewProps {
  onCancel: () => void;
  onAnalysisComplete: (image: string, analysis: AnalysisResult) => void;
  onOpenSettings: () => void;
}

interface ProcessingState {
  isProcessing: boolean;
  completed: number;
  total: number;
  stage: 'idle' | 'loading_pdf' | 'analyzing';
}

const MAX_PDF_PAGES_AUTO = 20;
const CONCURRENT_REQUESTS = 3;

export const UploadView: React.FC<UploadViewProps> = ({ onCancel, onAnalysisComplete, onOpenSettings }) => {
  const { t } = useI18n();
  const [processing, setProcessing] = useState<ProcessingState>({
    isProcessing: false,
    completed: 0,
    total: 0,
    stage: 'idle'
  });
  const [error, setError] = useState<string | null>(null);
  const [isKeyMissing, setIsKeyMissing] = useState(false);

  // PDF page selector state
  const [pdfInfo, setPdfInfo] = useState<PDFInfo | null>(null);
  const [pendingPdfFile, setPendingPdfFile] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Returns { fullImage, preview } - fullImage for API (up to 4096px), preview for storage (500px)
  const processImage = async (file: File): Promise<{ fullImage: string; preview: string }> => {
    // Convert HEIC to JPEG if needed
    let imageBlob: Blob = file;
    if (await isHeic(file)) {
      imageBlob = await heicTo({
        blob: file,
        type: 'image/jpeg',
        quality: 0.9
      });
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(imageBlob);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          // Full quality image for API (up to 4096px)
          const fullCanvas = document.createElement('canvas');
          const MAX_DIM_FULL = 4096;
          let fullWidth = img.width;
          let fullHeight = img.height;
          if (fullWidth > MAX_DIM_FULL || fullHeight > MAX_DIM_FULL) {
            const scale = MAX_DIM_FULL / Math.max(fullWidth, fullHeight);
            fullWidth = Math.round(fullWidth * scale);
            fullHeight = Math.round(fullHeight * scale);
          }
          fullCanvas.width = fullWidth;
          fullCanvas.height = fullHeight;
          const fullCtx = fullCanvas.getContext('2d');

          // Preview image for storage (500px max, lower quality for Safari iOS)
          const previewCanvas = document.createElement('canvas');
          const MAX_DIM_PREVIEW = 500;
          let previewWidth = img.width;
          let previewHeight = img.height;
          if (previewWidth > MAX_DIM_PREVIEW || previewHeight > MAX_DIM_PREVIEW) {
            const scale = MAX_DIM_PREVIEW / Math.max(previewWidth, previewHeight);
            previewWidth = Math.round(previewWidth * scale);
            previewHeight = Math.round(previewHeight * scale);
          }
          previewCanvas.width = previewWidth;
          previewCanvas.height = previewHeight;
          const previewCtx = previewCanvas.getContext('2d');

          if (fullCtx && previewCtx) {
            fullCtx.drawImage(img, 0, 0, fullWidth, fullHeight);
            previewCtx.drawImage(img, 0, 0, previewWidth, previewHeight);
            resolve({
              fullImage: fullCanvas.toDataURL('image/jpeg', 0.9),
              preview: previewCanvas.toDataURL('image/jpeg', 0.5)
            });
          } else {
            reject(new Error("Canvas context failed"));
          }
        };
        img.onerror = () => reject(new Error("Failed to load image"));
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
    });
  };

  // Process a base64 image from PDF (already in correct format)
  const processBase64Image = (base64: string): Promise<{ fullImage: string; preview: string }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = base64;
      img.onload = () => {
        const previewCanvas = document.createElement('canvas');
        const MAX_DIM_PREVIEW = 500;
        let previewWidth = img.width;
        let previewHeight = img.height;
        if (previewWidth > MAX_DIM_PREVIEW || previewHeight > MAX_DIM_PREVIEW) {
          const scale = MAX_DIM_PREVIEW / Math.max(previewWidth, previewHeight);
          previewWidth = Math.round(previewWidth * scale);
          previewHeight = Math.round(previewHeight * scale);
        }
        previewCanvas.width = previewWidth;
        previewCanvas.height = previewHeight;
        const previewCtx = previewCanvas.getContext('2d');

        if (previewCtx) {
          previewCtx.drawImage(img, 0, 0, previewWidth, previewHeight);
          resolve({
            fullImage: base64,
            preview: previewCanvas.toDataURL('image/jpeg', 0.5)
          });
        } else {
          reject(new Error("Canvas context failed"));
        }
      };
      img.onerror = () => reject(new Error("Failed to load image"));
    });
  };

  // Analyze a single image and return result (don't call onAnalysisComplete yet)
  const analyzeImage = async (fullImage: string, preview: string): Promise<{ preview: string; analysis: AnalysisResult } | null> => {
    try {
      const analysis = await analyzePageContent(fullImage.split(',')[1]);
      return { preview, analysis };
    } catch (err: any) {
      if (err.message === "API_KEY_MISSING") {
        setError(t('apiKeySetup'));
        setIsKeyMissing(true);
      }
      return null;
    }
  };

  // Process items in parallel with concurrency limit
  async function processInParallel<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    concurrency: number,
    onProgress: (completed: number) => void
  ): Promise<{ results: R[]; hasError: boolean }> {
    const results: R[] = [];
    let hasError = false;
    let completed = 0;
    let currentIndex = 0;

    const processNext = async (): Promise<void> => {
      while (currentIndex < items.length && !hasError) {
        const index = currentIndex++;
        try {
          const result = await processor(items[index]);
          results[index] = result;
          completed++;
          onProgress(completed);
        } catch (err) {
          hasError = true;
          throw err;
        }
      }
    };

    // Start concurrent workers
    const workers = Array(Math.min(concurrency, items.length))
      .fill(null)
      .map(() => processNext());

    try {
      await Promise.all(workers);
    } catch (err) {
      // Error already handled
    }

    return { results, hasError };
  }

  // Handle PDF file
  const handlePdfFile = async (file: File) => {
    setProcessing({ isProcessing: true, completed: 0, total: 0, stage: 'loading_pdf' });
    setError(null);

    try {
      const info = await loadPDFInfo(file);

      if (info.totalPages > MAX_PDF_PAGES_AUTO) {
        // Show page selector modal
        setPdfInfo(info);
        setPendingPdfFile(file);
        setProcessing({ isProcessing: false, completed: 0, total: 0, stage: 'idle' });
      } else {
        // Process all pages automatically
        const pageNumbers = info.pages.map(p => p.pageNumber);
        await processPdfPages(file, pageNumbers);
      }
    } catch (err: any) {
      console.error('PDF error:', err);
      setError(t('processingError'));
      setProcessing({ isProcessing: false, completed: 0, total: 0, stage: 'idle' });
    }
  };

  // Process selected PDF pages
  const processPdfPages = async (file: File, pageNumbers: number[]) => {
    setProcessing({ isProcessing: true, completed: 0, total: pageNumbers.length, stage: 'analyzing' });

    try {
      const pages = await extractPDFPages(file, pageNumbers);

      // Process pages in parallel, collecting results
      const { results, hasError } = await processInParallel(
        pages,
        async (page) => {
          const { fullImage, preview } = await processBase64Image(page.image);
          const result = await analyzeImage(fullImage, preview);
          if (!result) throw new Error('Analysis failed');
          return result;
        },
        CONCURRENT_REQUESTS,
        (completed) => setProcessing(prev => ({ ...prev, completed }))
      );

      if (hasError) {
        setProcessing({ isProcessing: false, completed: 0, total: 0, stage: 'idle' });
        return;
      }

      // All done - save all materials in reverse order (so first page appears first in dashboard)
      for (let i = results.length - 1; i >= 0; i--) {
        const result = results[i];
        if (result) {
          onAnalysisComplete(result.preview, result.analysis);
        }
      }

      // Go back to dashboard
      onCancel();
    } catch (err: any) {
      console.error('PDF processing error:', err);
      setError(t('processingError'));
      setProcessing({ isProcessing: false, completed: 0, total: 0, stage: 'idle' });
    }
  };

  // Handle page selection from modal
  const handlePageSelection = async (selectedPages: number[]) => {
    setPdfInfo(null);
    if (pendingPdfFile && selectedPages.length > 0) {
      await processPdfPages(pendingPdfFile, selectedPages);
    }
    setPendingPdfFile(null);
  };

  // Handle multiple image files
  const handleImageFiles = async (files: File[]) => {
    setProcessing({ isProcessing: true, completed: 0, total: files.length, stage: 'analyzing' });
    setError(null);
    setIsKeyMissing(false);

    try {
      // Process images in parallel, collecting results
      const { results, hasError } = await processInParallel(
        files,
        async (file) => {
          const { fullImage, preview } = await processImage(file);
          const result = await analyzeImage(fullImage, preview);
          if (!result) throw new Error('Analysis failed');
          return result;
        },
        CONCURRENT_REQUESTS,
        (completed) => setProcessing(prev => ({ ...prev, completed }))
      );

      if (hasError) {
        setProcessing({ isProcessing: false, completed: 0, total: 0, stage: 'idle' });
        return;
      }

      // All done - save all materials in reverse order (so first image appears first in dashboard)
      for (let i = results.length - 1; i >= 0; i--) {
        const result = results[i];
        if (result) {
          onAnalysisComplete(result.preview, result.analysis);
        }
      }

      // Go back to dashboard
      onCancel();
    } catch (err: any) {
      console.error('Image processing error:', err);
      setError(t('processingError'));
      setProcessing({ isProcessing: false, completed: 0, total: 0, stage: 'idle' });
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const files = Array.from(e.target.files);

    // Separate PDFs from images
    const pdfFiles = files.filter(f => f.type === 'application/pdf');
    const imageFiles = files.filter(f => f.type !== 'application/pdf');

    // Process PDF first (only take the first one if multiple)
    if (pdfFiles.length > 0) {
      await handlePdfFile(pdfFiles[0]);
    } else if (imageFiles.length > 0) {
      await handleImageFiles(imageFiles);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getStatusText = () => {
    if (processing.stage === 'loading_pdf') {
      return t('loadingPdf');
    }
    if (processing.total > 1) {
      return t('processingProgress', { current: processing.completed, total: processing.total });
    }
    return t('analyzing');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {/* PDF Page Selector Modal */}
      {pdfInfo && (
        <PageSelectorModal
          pdfInfo={pdfInfo}
          onConfirm={handlePageSelection}
          onCancel={() => {
            setPdfInfo(null);
            setPendingPdfFile(null);
          }}
        />
      )}

      <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl p-8 text-center relative overflow-hidden">

        <button
          onClick={onCancel}
          disabled={processing.isProcessing}
          className="absolute top-4 left-4 text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ArrowLeft size={24} />
        </button>

        <div className="mb-6 flex justify-center">
          <div className="bg-indigo-50 p-6 rounded-full">
            <Camera size={48} className="text-indigo-500" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-slate-800 mb-2">{t('uploadTitle')}</h2>
        <p className="text-slate-500 mb-8">
          {t('uploadSubtitleMulti')}
        </p>

        {processing.isProcessing ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Loader2 className="animate-spin text-indigo-600" size={40} />
            <p className="text-indigo-600 font-medium animate-pulse">{getStatusText()}</p>
            {processing.total > 1 && (
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-600 transition-all duration-300"
                  style={{ width: `${(processing.completed / processing.total) * 100}%` }}
                />
              </div>
            )}
            {/* Warning not to close tab */}
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2 text-left">
              <AlertTriangle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-amber-700 text-sm">{t('doNotCloseTab')}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*,.pdf,application/pdf"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-3 shadow-md hover:shadow-lg active:scale-95"
            >
              <Upload size={20} />
              {t('uploadFiles')}
            </button>

            <p className="text-slate-400 text-sm flex items-center justify-center gap-2">
              <FileText size={16} />
              {t('supportsFormatsMulti')}
            </p>

            {error && (
              <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm mt-4 border border-red-100">
                <p>{error}</p>
                <div className="flex gap-2 mt-3">
                  {isKeyMissing && (
                    <button
                      onClick={onOpenSettings}
                      className="flex-1 bg-white text-red-600 border border-red-200 px-4 py-2 rounded-lg text-xs font-bold hover:bg-red-50 flex items-center justify-center gap-2"
                    >
                      <Settings size={14} />
                      {t('apiSettings')}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
