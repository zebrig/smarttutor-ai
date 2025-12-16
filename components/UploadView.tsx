import React, { useState, useRef } from 'react';
import { Upload, Camera, Loader2, ArrowLeft, FileText, Type } from 'lucide-react';
import { loadPDFInfo, PDFInfo } from '../services/pdfService';
import { useI18n } from '../i18n';
import { PageSelectorModal } from './PageSelectorModal';

export interface QueuedFile {
  id: string;
  type: 'image' | 'pdf_page' | 'text';
  file: File;
  pageNumber?: number;
  fileName: string;
  // For text type - the raw text and generated preview
  rawText?: string;
}

interface UploadViewProps {
  onCancel: () => void;
  onFilesSelected: (files: QueuedFile[]) => void;
}

const MAX_PDF_PAGES_AUTO = 20;

type InputMode = 'file' | 'text';

// Generate a placeholder image from text (canvas-based)
const generateTextPlaceholder = (text: string): string => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  canvas.width = 800;
  canvas.height = 600;

  // Background
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Border
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2;
  ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

  // Text icon at top
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 24px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText('📝 Text', canvas.width / 2, 50);

  // Draw text preview
  ctx.fillStyle = '#334155';
  ctx.font = '16px system-ui';
  ctx.textAlign = 'left';

  const lines = text.split('\n');
  const maxLines = 30;
  const lineHeight = 18;
  const startY = 80;
  const padding = 30;
  const maxWidth = canvas.width - padding * 2;

  let y = startY;
  let lineCount = 0;

  for (const line of lines) {
    if (lineCount >= maxLines) {
      ctx.fillStyle = '#64748b';
      ctx.fillText('...', padding, y);
      break;
    }

    // Word wrap
    const words = line.split(' ');
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine + (currentLine ? ' ' : '') + word;
      const metrics = ctx.measureText(testLine);

      if (metrics.width > maxWidth && currentLine) {
        ctx.fillText(currentLine, padding, y);
        currentLine = word;
        y += lineHeight;
        lineCount++;
        if (lineCount >= maxLines) break;
      } else {
        currentLine = testLine;
      }
    }

    if (lineCount < maxLines && currentLine) {
      ctx.fillText(currentLine, padding, y);
      y += lineHeight;
      lineCount++;
    }
  }

  return canvas.toDataURL('image/png');
};

export const UploadView: React.FC<UploadViewProps> = ({ onCancel, onFilesSelected }) => {
  const { t } = useI18n();
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [inputMode, setInputMode] = useState<InputMode>('file');
  const [pastedText, setPastedText] = useState('');

  // PDF page selector state
  const [pdfInfo, setPdfInfo] = useState<PDFInfo | null>(null);
  const [pendingPdfFile, setPendingPdfFile] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePdfFile = async (file: File) => {
    setIsLoadingPdf(true);

    try {
      const info = await loadPDFInfo(file);

      if (info.totalPages > MAX_PDF_PAGES_AUTO) {
        // Show page selector modal
        setPdfInfo(info);
        setPendingPdfFile(file);
        setIsLoadingPdf(false);
      } else {
        // Queue all pages automatically
        const queued: QueuedFile[] = info.pages.map(p => ({
          id: `${Date.now()}_${p.pageNumber}_${Math.random().toString(36).slice(2, 7)}`,
          type: 'pdf_page',
          file,
          pageNumber: p.pageNumber,
          fileName: `${file.name} - ${t('page')} ${p.pageNumber}`
        }));
        onFilesSelected(queued);
        onCancel();
      }
    } catch (err) {
      console.error('PDF error:', err);
      setIsLoadingPdf(false);
    }
  };

  const handlePageSelection = (selectedPages: number[]) => {
    setPdfInfo(null);
    if (pendingPdfFile && selectedPages.length > 0) {
      const queued: QueuedFile[] = selectedPages.map(pageNum => ({
        id: `${Date.now()}_${pageNum}_${Math.random().toString(36).slice(2, 7)}`,
        type: 'pdf_page',
        file: pendingPdfFile,
        pageNumber: pageNum,
        fileName: `${pendingPdfFile.name} - ${t('page')} ${pageNum}`
      }));
      onFilesSelected(queued);
      onCancel();
    }
    setPendingPdfFile(null);
  };

  const handleImageFiles = (files: File[]) => {
    const queued: QueuedFile[] = files.map(file => ({
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type: 'image',
      file,
      fileName: file.name
    }));
    onFilesSelected(queued);
    onCancel();
  };

  const handleTextSubmit = () => {
    const trimmedText = pastedText.trim();
    if (!trimmedText) return;

    // Generate placeholder image
    const placeholderDataUrl = generateTextPlaceholder(trimmedText);

    // Convert data URL to File for consistency
    const byteString = atob(placeholderDataUrl.split(',')[1]);
    const mimeString = placeholderDataUrl.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([ab], { type: mimeString });
    const placeholderFile = new File([blob], 'text-input.png', { type: 'image/png' });

    const queued: QueuedFile = {
      id: `${Date.now()}_text_${Math.random().toString(36).slice(2, 7)}`,
      type: 'text',
      file: placeholderFile,
      fileName: t('pastedText'),
      rawText: trimmedText
    };

    onFilesSelected([queued]);
    onCancel();
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
      handleImageFiles(imageFiles);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
          disabled={isLoadingPdf}
          className="absolute top-4 left-4 text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-30"
        >
          <ArrowLeft size={24} />
        </button>

        <div className="mb-6 flex justify-center">
          <div className="bg-indigo-50 p-6 rounded-full">
            <Camera size={48} className="text-indigo-500" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-slate-800 mb-2">{t('uploadTitle')}</h2>
        <p className="text-slate-500 mb-6">{t('uploadSubtitleMulti')}</p>

        {/* Mode toggle */}
        <div className="flex bg-slate-100 rounded-xl p-1 mb-6">
          <button
            onClick={() => setInputMode('file')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${
              inputMode === 'file'
                ? 'bg-white shadow-sm text-indigo-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Upload size={16} />
            {t('uploadFile')}
          </button>
          <button
            onClick={() => setInputMode('text')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${
              inputMode === 'text'
                ? 'bg-white shadow-sm text-indigo-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Type size={16} />
            {t('pasteText')}
          </button>
        </div>

        {isLoadingPdf ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Loader2 className="animate-spin text-indigo-600" size={40} />
            <p className="text-indigo-600 font-medium">{t('loadingPdf')}</p>
          </div>
        ) : inputMode === 'file' ? (
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
          </div>
        ) : (
          <div className="space-y-4">
            <textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder={t('pasteTextPlaceholder')}
              className="w-full h-48 p-4 border-2 border-slate-200 rounded-xl resize-none focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all text-slate-700 text-sm"
            />

            <button
              onClick={handleTextSubmit}
              disabled={!pastedText.trim()}
              className={`w-full font-bold py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-3 shadow-md active:scale-95 ${
                pastedText.trim()
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow-lg'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Type size={20} />
              {t('createFromText')}
            </button>

            <p className="text-slate-400 text-sm">
              {t('textWillBeAnalyzed')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
