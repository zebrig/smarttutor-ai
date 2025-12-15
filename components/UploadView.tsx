import React, { useState, useRef } from 'react';
import { Upload, Camera, Loader2, ArrowLeft, Settings, RefreshCw } from 'lucide-react';
import { analyzePageContent } from '../services/geminiService';
import { AnalysisResult } from '../types';
import { useI18n } from '../i18n';
import { isHeic, heicTo } from 'heic-to';

interface UploadViewProps {
  onCancel: () => void;
  onAnalysisComplete: (image: string, analysis: AnalysisResult) => void;
  onOpenSettings: () => void;
}

export const UploadView: React.FC<UploadViewProps> = ({ onCancel, onAnalysisComplete, onOpenSettings }) => {
  const { t } = useI18n();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isKeyMissing, setIsKeyMissing] = useState(false);
  const [lastFile, setLastFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Returns { fullImage, preview } - fullImage for API (up to 4096px), preview for storage (800px)
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

  const processFile = async (file: File) => {
    setIsAnalyzing(true);
    setError(null);
    setIsKeyMissing(false);
    setLastFile(file);

    try {
      const { fullImage, preview } = await processImage(file);
      // Use full quality image for API analysis
      const analysis = await analyzePageContent(fullImage.split(',')[1]);
      // But store only the smaller preview in localStorage
      onAnalysisComplete(preview, analysis);
    } catch (err: any) {
      console.error(err);
      setIsAnalyzing(false);

      if (err.message === "API_KEY_MISSING") {
        setError(t('apiKeySetup'));
        setIsKeyMissing(true);
      } else {
        setError(t('processingError'));
      }
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    processFile(e.target.files[0]);
  };

  const handleRetry = () => {
    if (lastFile) {
      processFile(lastFile);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl p-8 text-center relative overflow-hidden">
        
        <button 
          onClick={onCancel}
          className="absolute top-4 left-4 text-slate-400 hover:text-slate-600 transition-colors"
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
          {t('uploadSubtitle')}
        </p>

        {isAnalyzing ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Loader2 className="animate-spin text-indigo-600" size={40} />
            <p className="text-indigo-600 font-medium animate-pulse">{t('analyzing')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-3 shadow-md hover:shadow-lg active:scale-95"
            >
              <Upload size={20} />
              {t('uploadPhoto')}
            </button>

            {error && (
              <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm mt-4 border border-red-100">
                <p>{error}</p>
                <div className="flex gap-2 mt-3">
                  {lastFile && (
                    <button
                      onClick={handleRetry}
                      className="flex-1 bg-white text-red-600 border border-red-200 px-4 py-2 rounded-lg text-xs font-bold hover:bg-red-50 flex items-center justify-center gap-2"
                    >
                      <RefreshCw size={14} />
                      {t('retry')}
                    </button>
                  )}
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
