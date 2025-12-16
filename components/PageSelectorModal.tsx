import React, { useState } from 'react';
import { X, Check, AlertCircle } from 'lucide-react';
import { PDFInfo } from '../services/pdfService';
import { useI18n } from '../i18n';

interface PageSelectorModalProps {
  pdfInfo: PDFInfo;
  onConfirm: (selectedPages: number[]) => void;
  onCancel: () => void;
}

const MAX_PAGES = 20;

export const PageSelectorModal: React.FC<PageSelectorModalProps> = ({
  pdfInfo,
  onConfirm,
  onCancel
}) => {
  const { t } = useI18n();
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());

  const togglePage = (pageNum: number) => {
    const newSelected = new Set(selectedPages);
    if (newSelected.has(pageNum)) {
      newSelected.delete(pageNum);
    } else if (newSelected.size < MAX_PAGES) {
      newSelected.add(pageNum);
    }
    setSelectedPages(newSelected);
  };

  const selectAll = () => {
    const newSelected = new Set<number>();
    for (let i = 0; i < Math.min(pdfInfo.totalPages, MAX_PAGES); i++) {
      newSelected.add(pdfInfo.pages[i].pageNumber);
    }
    setSelectedPages(newSelected);
  };

  const selectNone = () => {
    setSelectedPages(new Set());
  };

  const handleConfirm = () => {
    const sorted = Array.from(selectedPages).sort((a, b) => a - b);
    onConfirm(sorted);
  };

  const isMaxReached = selectedPages.size >= MAX_PAGES;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800">{t('selectPages')}</h2>
            <p className="text-slate-500 text-sm mt-1">
              {t('pdfPageCount', { count: pdfInfo.totalPages })} · {t('maxPagesWarning', { max: MAX_PAGES })}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={24} className="text-slate-500" />
          </button>
        </div>

        {/* Selection info */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className={`font-semibold ${isMaxReached ? 'text-amber-600' : 'text-slate-700'}`}>
              {t('selectedCount', { count: selectedPages.size, max: MAX_PAGES })}
            </span>
            {isMaxReached && (
              <span className="flex items-center gap-1 text-amber-600 text-sm">
                <AlertCircle size={16} />
                {t('maxReached')}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={selectAll}
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
            >
              {t('selectFirst', { count: Math.min(pdfInfo.totalPages, MAX_PAGES) })}
            </button>
            <span className="text-slate-300">|</span>
            <button
              onClick={selectNone}
              className="text-sm text-slate-500 hover:text-slate-700 font-medium"
            >
              {t('clearSelection')}
            </button>
          </div>
        </div>

        {/* Page grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-3">
            {pdfInfo.pages.map((page) => {
              const isSelected = selectedPages.has(page.pageNumber);
              const isDisabled = !isSelected && isMaxReached;

              return (
                <button
                  key={page.pageNumber}
                  onClick={() => togglePage(page.pageNumber)}
                  disabled={isDisabled}
                  className={`relative aspect-[3/4] rounded-lg overflow-hidden border-2 transition-all ${
                    isSelected
                      ? 'border-indigo-500 ring-2 ring-indigo-200'
                      : isDisabled
                      ? 'border-slate-200 opacity-50 cursor-not-allowed'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <img
                    src={page.thumbnail}
                    alt={`Page ${page.pageNumber}`}
                    className="w-full h-full object-cover"
                  />
                  <div className={`absolute bottom-0 left-0 right-0 text-center py-1 text-xs font-bold ${
                    isSelected ? 'bg-indigo-500 text-white' : 'bg-black/50 text-white'
                  }`}>
                    {page.pageNumber}
                  </div>
                  {isSelected && (
                    <div className="absolute top-1 right-1 bg-indigo-500 rounded-full p-0.5">
                      <Check size={12} className="text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-6 py-3 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors"
          >
            {t('cancel')}
          </button>
          <button
            onClick={handleConfirm}
            disabled={selectedPages.size === 0}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-colors"
          >
            {t('processPages', { count: selectedPages.size })}
          </button>
        </div>
      </div>
    </div>
  );
};
