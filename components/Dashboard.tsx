import React, { useState, useRef, useEffect } from 'react';
import { StudyMaterial, QuizSession, QuizStatus, PendingUpload } from '../types';
import { PlusCircle, BookOpen, Trash2, Settings, Globe, Play, CheckCircle, Clock, Loader2, CheckSquare, Square, Sparkles, AlertTriangle, XCircle, RefreshCw, ExternalLink } from 'lucide-react';
import { useI18n, Language, languageNames } from '../i18n';

interface DashboardProps {
  materials: StudyMaterial[];
  sessions: QuizSession[];
  pendingUploads: PendingUpload[];
  onNewMaterial: () => void;
  onSelectMaterial: (material: StudyMaterial) => void;
  onDeleteMaterial: (id: string) => void;
  onOpenSettings: () => void;
  onGenerateQuiz: (materialIds: string[]) => void;
  onRetryUpload: (id: string) => void;
  onCancelUpload: (id: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  materials,
  sessions,
  pendingUploads,
  onNewMaterial,
  onSelectMaterial,
  onDeleteMaterial,
  onOpenSettings,
  onGenerateQuiz,
  onRetryUpload,
  onCancelUpload
}) => {
  const { t, lang, setLang } = useI18n();
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
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

  // Exit selection mode when all deselected
  useEffect(() => {
    if (selectionMode && selectedIds.size === 0) {
      setSelectionMode(false);
    }
  }, [selectedIds.size, selectionMode]);

  const getSessionStats = (materialId: string) => {
    const materialSessions = sessions.filter(s => s.materialId === materialId);
    const completed = materialSessions.filter(s => s.status === QuizStatus.COMPLETED).length;
    const inProgress = materialSessions.filter(s => s.status === QuizStatus.IN_PROGRESS).length;
    const generating = materialSessions.filter(s => s.status === QuizStatus.GENERATING).length;
    const unviewed = materialSessions.filter(s => !s.viewedAt).length;
    return { total: materialSessions.length, completed, inProgress, generating, unviewed };
  };

  const toggleSelection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
    if (newSelected.size > 0 && !selectionMode) {
      setSelectionMode(true);
    }
  };

  const handleGenerateSelected = () => {
    if (selectedIds.size > 0) {
      onGenerateQuiz(Array.from(selectedIds));
      setSelectedIds(new Set());
      setSelectionMode(false);
    }
  };

  const handleGenerateSingle = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onGenerateQuiz([id]);
  };

  const selectAll = () => {
    setSelectedIds(new Set(materials.map(m => m.id)));
    setSelectionMode(true);
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setSelectionMode(false);
  };

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

      {/* Selection Mode Bar */}
      {selectionMode && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-center justify-between animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-4">
            <span className="text-indigo-700 font-medium">
              {t('selectedMaterials', { count: selectedIds.size })}
            </span>
            <button
              onClick={selectAll}
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
            >
              {t('selectAll')}
            </button>
            <button
              onClick={clearSelection}
              className="text-sm text-slate-500 hover:text-slate-700 font-medium"
            >
              {t('clearSelection')}
            </button>
          </div>
          <button
            onClick={handleGenerateSelected}
            disabled={selectedIds.size === 0}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white px-4 py-2 rounded-lg font-medium transition-all"
          >
            <Sparkles size={18} />
            {t('generateForSelected')}
          </button>
        </div>
      )}

      <div>
        {materials.length === 0 && pendingUploads.length === 0 ? (
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
            {/* Pending uploads placeholders */}
            {pendingUploads.map((pending) => {
              const isFailed = pending.status === 'failed';
              const isRetrying = pending.status === 'retrying';
              const isRecitationError = pending.errorType === 'recitation';

              return (
                <div
                  key={pending.id}
                  className={`bg-white rounded-2xl p-0 shadow-sm border overflow-hidden flex flex-col
                    ${isFailed ? 'border-red-300 ring-2 ring-red-100' : 'border-indigo-200 ring-2 ring-indigo-100'}
                  `}
                >
                  {/* Preview area */}
                  <div className="h-32 w-full bg-slate-100 relative overflow-hidden">
                    {pending.preview ? (
                      <img
                        src={pending.preview}
                        alt={pending.fileName}
                        className="w-full h-full object-cover opacity-50"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-200">
                        <BookOpen size={32} className="text-slate-400" />
                      </div>
                    )}

                    {/* Status overlay */}
                    <div className={`absolute inset-0 flex items-center justify-center ${isFailed ? 'bg-red-500/20' : 'bg-indigo-500/20'}`}>
                      <div className={`rounded-lg px-3 py-2 flex items-center gap-2 shadow-lg ${isFailed ? 'bg-red-50' : 'bg-white'}`}>
                        {isFailed ? (
                          <>
                            <XCircle size={18} className="text-red-500" />
                            <span className="text-sm font-medium text-red-700">{t('uploadFailed')}</span>
                          </>
                        ) : (
                          <>
                            <Loader2 size={18} className="animate-spin text-indigo-600" />
                            <span className="text-sm font-medium text-slate-700">
                              {isRetrying ? t('retrying') : t('processing')}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="p-5 flex-1 flex flex-col">
                    <h3 className="font-bold text-lg text-slate-800 leading-tight mb-2 truncate">
                      {pending.fileName}
                    </h3>

                    {/* Status details */}
                    <div className="flex-1 space-y-2">
                      {!isFailed && pending.attempt > 1 && (
                        <p className="text-sm text-indigo-600">
                          {t('attempt')} {pending.attempt}/{pending.maxAttempts}
                        </p>
                      )}

                      {isFailed && (
                        <div className="space-y-1">
                          {isRecitationError ? (
                            <>
                              <p className="text-sm text-red-600 flex items-start gap-1.5">
                                <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                                {t('recitationError')}
                              </p>
                              {pending.citationUrls && pending.citationUrls.length > 0 && (
                                <div className="text-xs space-y-0.5">
                                  <p className="text-slate-500">{t('sources')}:</p>
                                  {pending.citationUrls.map((url, idx) => (
                                    <a
                                      key={idx}
                                      href={url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1 truncate"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <ExternalLink size={12} className="flex-shrink-0" />
                                      <span className="truncate">{new URL(url).hostname}</span>
                                    </a>
                                  ))}
                                </div>
                              )}
                            </>
                          ) : (
                            <>
                              <p className="text-sm text-red-600">
                                {pending.error || t('unknownError')}
                              </p>
                              <p className="text-xs text-slate-400">
                                {t('failedAfterAttempts', { count: pending.attempt })}
                              </p>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-3">
                      {isFailed ? (
                        <button
                          onClick={() => onRetryUpload(pending.id)}
                          className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 font-medium text-sm transition-colors"
                        >
                          <RefreshCw size={16} />
                          {t('retry')}
                        </button>
                      ) : (
                        <div className="text-sm text-slate-400">{t('pleaseWait')}</div>
                      )}
                      <button
                        onClick={() => onCancelUpload(pending.id)}
                        className="text-slate-400 hover:text-red-500 transition-colors p-2"
                        title={t('cancel')}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Existing materials */}
            {materials.map((material) => {
              const stats = getSessionStats(material.id);
              const isGenerating = stats.generating > 0;
              const isSelected = selectedIds.has(material.id);
              const isNewMaterial = !material.viewedAt;
              const hasUnviewedTests = stats.unviewed > 0;

              return (
                <div
                  key={material.id}
                  className={`group bg-white rounded-2xl p-0 shadow-sm border transition-all overflow-hidden flex flex-col cursor-pointer
                    ${isSelected ? 'border-indigo-400 ring-2 ring-indigo-100' : 'border-slate-200 hover:shadow-md'}
                    ${isGenerating ? 'ring-2 ring-amber-200' : ''}
                  `}
                  onClick={() => !selectionMode && onSelectMaterial(material)}
                >
                  <div className="h-32 w-full bg-slate-100 relative overflow-hidden">
                    <img
                      src={material.imageBase64}
                      alt={material.title}
                      className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-500"
                    />

                    {/* Selection checkbox */}
                    <button
                      onClick={(e) => toggleSelection(material.id, e)}
                      className={`absolute top-2 left-2 p-1.5 rounded-lg transition-all ${
                        isSelected
                          ? 'bg-indigo-500 text-white'
                          : 'bg-white/80 text-slate-400 hover:bg-white hover:text-slate-600'
                      }`}
                    >
                      {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                    </button>

                    <div className="absolute top-2 right-2 flex items-center gap-1.5">
                      {/* New material badge */}
                      {isNewMaterial && (
                        <div className="bg-emerald-500 text-white px-2 py-1 rounded-md text-xs font-bold shadow-sm">
                          {t('new')}
                        </div>
                      )}
                      {/* Unviewed tests badge */}
                      {!isNewMaterial && hasUnviewedTests && (
                        <div className="bg-amber-500 text-white px-2 py-1 rounded-md text-xs font-bold shadow-sm flex items-center gap-1">
                          <Sparkles size={12} />
                          {stats.unviewed}
                        </div>
                      )}
                      {/* Date/time */}
                      <div className="bg-white/90 backdrop-blur px-2 py-1 rounded-md text-xs font-bold text-slate-700 shadow-sm">
                        {(() => {
                          const date = new Date(material.createdAt);
                          const today = new Date();
                          const isToday = date.toDateString() === today.toDateString();
                          return isToday
                            ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : date.toLocaleDateString();
                        })()}
                      </div>
                    </div>

                    {/* Generating indicator */}
                    {isGenerating && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <div className="bg-white rounded-lg px-3 py-2 flex items-center gap-2 shadow-lg">
                          <Loader2 size={16} className="animate-spin text-indigo-600" />
                          <span className="text-sm font-medium text-slate-700">{t('generating')}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-5 flex-1 flex flex-col">
                    <h3 className="font-bold text-lg text-slate-800 leading-tight group-hover:text-indigo-600 transition-colors mb-2">
                      {material.title}
                    </h3>

                    <p className="text-slate-500 text-sm line-clamp-2 mb-3 flex-1">
                      {material.summary}
                    </p>

                    {/* Stats */}
                    <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
                      {stats.total > 0 ? (
                        <>
                          <span className="flex items-center gap-1">
                            <CheckCircle size={14} className="text-green-500" />
                            {stats.completed}
                          </span>
                          {stats.inProgress > 0 && (
                            <span className="flex items-center gap-1">
                              <Clock size={14} className="text-amber-500" />
                              {stats.inProgress}
                            </span>
                          )}
                          <span className="text-slate-400">
                            {t('testsTotal', { count: stats.total })}
                          </span>
                        </>
                      ) : (
                        <span className="text-slate-400">{t('noTests')}</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                      {/* Generate button */}
                      <button
                        onClick={(e) => handleGenerateSingle(material.id, e)}
                        disabled={isGenerating}
                        className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 disabled:text-slate-400 font-medium text-sm transition-colors"
                        title={t('generateQuiz')}
                      >
                        {isGenerating ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Play size={16} />
                        )}
                        {t('generate')}
                      </button>

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
              );
            })}
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
