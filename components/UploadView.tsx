import React, { useState, useRef } from 'react';
import { Upload, Camera, Loader2, ArrowLeft, FileText } from 'lucide-react';
import { loadPDFInfo, PDFInfo } from '../services/pdfService';
import { useI18n } from '../i18n';
import { PageSelectorModal } from './PageSelectorModal';

export interface QueuedFile {
  id: string;
  type: 'image' | 'pdf_page';
  file: File;
  pageNumber?: number;
  fileName: string;
}

interface UploadViewProps {
  onCancel: () => void;
  onFilesSelected: (files: QueuedFile[]) => void;
}

const MAX_PDF_PAGES_AUTO = 20;

export const UploadView: React.FC<UploadViewProps> = ({ onCancel, onFilesSelected }) => {
  const { t } = useI18n();
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);

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
        <p className="text-slate-500 mb-8">{t('uploadSubtitleMulti')}</p>

        {isLoadingPdf ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Loader2 className="animate-spin text-indigo-600" size={40} />
            <p className="text-indigo-600 font-medium">{t('loadingPdf')}</p>
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
          </div>
        )}
      </div>
    </div>
  );
};
