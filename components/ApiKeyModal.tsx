import React, { useState, useEffect } from 'react';
import { Key, Save, Trash2, X, ExternalLink } from 'lucide-react';
import { useI18n } from '../i18n';

interface ApiKeyModalProps {
  onClose: () => void;
  onSave: () => void;
  forceOpen?: boolean;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ onClose, onSave, forceOpen = false }) => {
  const { t } = useI18n();
  const [key, setKey] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('gemini_api_key');
    if (stored) setKey(stored);
  }, []);

  const handleSave = () => {
    if (key.trim()) {
      localStorage.setItem('gemini_api_key', key.trim());
      onSave();
      onClose();
    }
  };

  const handleClear = () => {
    localStorage.removeItem('gemini_api_key');
    setKey('');
    onSave();
    if (!forceOpen) onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden transform transition-all scale-100">
        <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center">
          <div className="flex items-center gap-2 text-slate-800 font-bold">
            <Key size={20} className="text-indigo-600" />
            <span>{t('apiKeySetup')}</span>
          </div>
          {!forceOpen && (
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
              <X size={20} />
            </button>
          )}
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-500 leading-relaxed">
            {t('apiKeyDescription')}
          </p>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-2">{t('yourApiKey')}</label>
            <input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-mono text-sm bg-slate-50 focus:bg-white"
            />
          </div>

          <div className="pt-2 flex gap-3">
            <button
              onClick={handleSave}
              disabled={!key.trim()}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all shadow-sm"
            >
              <Save size={18} />
              {t('save')}
            </button>

            {localStorage.getItem('gemini_api_key') && (
              <button
                onClick={handleClear}
                className="bg-red-50 hover:bg-red-100 text-red-600 px-4 rounded-xl transition-all border border-red-100"
                title={t('deleteKey')}
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 text-xs text-center text-slate-400">
            {t('noKey')}{' '}
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="text-indigo-500 hover:text-indigo-700 hover:underline inline-flex items-center gap-1 font-medium"
            >
              {t('getInStudio')}
              <ExternalLink size={10} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};