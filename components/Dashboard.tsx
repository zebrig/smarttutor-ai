import React, { useState, useRef, useEffect } from 'react';
import { StudyMaterial } from '../types';
import { PlusCircle, BookOpen, Trash2, Settings, Globe } from 'lucide-react';
import { useI18n, Language, languageNames } from '../i18n';

interface DashboardProps {
  materials: StudyMaterial[];
  onNewMaterial: () => void;
  onSelectMaterial: (material: StudyMaterial) => void;
  onDeleteMaterial: (id: string) => void;
  onOpenSettings: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  materials,
  onNewMaterial,
  onSelectMaterial,
  onDeleteMaterial,
  onOpenSettings
}) => {
  const { t, lang, setLang } = useI18n();
  const [showLangMenu, setShowLangMenu] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
        setShowLangMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-8">
      <header className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100 gap-4">
        <div className="flex-1 text-center md:text-left">
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center justify-center md:justify-start gap-3">
            {t('appTitle')}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Language Switcher */}
          <div className="relative" ref={langMenuRef}>
            <button
              onClick={() => setShowLangMenu(!showLangMenu)}
              className="p-3 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-700 rounded-xl transition-all border border-slate-200 flex items-center gap-2"
            >
              <Globe size={20} />
              <span className="text-xs font-bold uppercase">{lang}</span>
            </button>
            {showLangMenu && (
              <div className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-40 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-50">
                {(Object.keys(languageNames) as Language[]).map((code) => (
                  <button
                    key={code}
                    onClick={() => { setLang(code); setShowLangMenu(false); }}
                    className={`w-full text-left px-4 py-2 hover:bg-slate-50 text-sm ${lang === code ? 'font-bold text-indigo-600 bg-indigo-50' : 'text-slate-700'}`}
                  >
                    {languageNames[code]}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={onOpenSettings}
            className="p-3 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-700 rounded-xl transition-all border border-slate-200"
            title={t('apiSettings')}
          >
            <Settings size={20} />
          </button>

          <button
            onClick={onNewMaterial}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
          >
            <PlusCircle size={20} />
            <span className="hidden sm:inline">{t('uploadPhoto')}</span>
            <span className="sm:hidden">{t('uploadPhoto')}</span>
          </button>
        </div>
      </header>

      <div>
        {materials.length === 0 ? (
          <div
            onClick={onNewMaterial}
            className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/50 cursor-pointer transition-all"
          >
            <div className="inline-block p-4 bg-indigo-50 rounded-full text-indigo-300 mb-3">
              <BookOpen size={48} />
            </div>
            <p className="text-slate-500 text-lg">{t('noMaterials')}</p>
            <p className="text-slate-400 text-sm">{t('uploadFirst')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {materials.map((material) => (
              <div
                key={material.id}
                className="group bg-white rounded-2xl p-0 shadow-sm border border-slate-200 hover:shadow-md transition-all overflow-hidden flex flex-col cursor-pointer"
                onClick={() => onSelectMaterial(material)}
              >
                <div className="h-32 w-full bg-slate-100 relative overflow-hidden">
                   <img
                    src={material.imageBase64}
                    alt={material.title}
                    className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-2 right-2 bg-white/90 backdrop-blur px-2 py-1 rounded-md text-xs font-bold text-slate-700 shadow-sm">
                    {new Date(material.createdAt).toLocaleDateString()}
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="font-bold text-lg text-slate-800 leading-tight group-hover:text-indigo-600 transition-colors mb-2">
                    {material.title}
                  </h3>

                  <p className="text-slate-500 text-sm line-clamp-2 mb-4 flex-1">
                    {material.summary}
                  </p>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <span className="text-indigo-600 font-semibold text-sm">&rarr;</span>

                    <button
                      onClick={(e) => { e.stopPropagation(); onDeleteMaterial(material.id); }}
                      className="text-slate-400 hover:text-red-500 transition-colors p-2"
                      title={t('delete')}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="text-center text-xs text-slate-400 pt-8 pb-4">
        <p>
          © {new Date().getFullYear()} Egor Zaleski
          <span className="mx-2">·</span>
          <a href="https://github.com/zebrig/smarttutor-ai" target="_blank" rel="noreferrer" className="hover:text-slate-600 transition-colors">GitHub</a>
          <span className="mx-2">·</span>
          <a href="https://www.linkedin.com/in/y-zaleski/" target="_blank" rel="noreferrer" className="hover:text-slate-600 transition-colors">LinkedIn</a>
        </p>
        <p className="mt-1 text-slate-300">
          v{new Date(__BUILD_TIME__).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(',', '')}
        </p>
      </footer>
    </div>
  );
};
