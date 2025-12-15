import React, { useState } from 'react';
import { StudyMaterial, QuizSession, QuizType, QuizStatus } from '../types';
import { Play, ArrowLeft, Clock, AlertCircle, CheckCircle, BarChart2, Plus, X, ZoomIn, FileText } from 'lucide-react';
import { useI18n } from '../i18n';

interface MaterialViewProps {
  material: StudyMaterial;
  sessions: QuizSession[];
  onBack: () => void;
  onStartQuiz: (type: QuizType) => void;
  onSelectQuiz: (quizId: string) => void;
}

export const MaterialView: React.FC<MaterialViewProps> = ({
  material,
  sessions,
  onBack,
  onStartQuiz,
  onSelectQuiz
}) => {
  const { t } = useI18n();
  const [showFullImage, setShowFullImage] = useState(false);
  const [showExtractedText, setShowExtractedText] = useState(false);

  // Sort sessions: In Progress first, then newest completed
  const sortedSessions = [...sessions].sort((a, b) => {
    if (a.status === QuizStatus.IN_PROGRESS && b.status !== QuizStatus.IN_PROGRESS) return -1;
    if (b.status === QuizStatus.IN_PROGRESS && a.status !== QuizStatus.IN_PROGRESS) return 1;
    return b.createdAt - a.createdAt;
  });

  const getAccuracy = (session: QuizSession) => {
    if (session.score.total === 0) return 0;
    return Math.round((session.score.correct / session.score.total) * 100);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Fullscreen Image Modal */}
      {showFullImage && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setShowFullImage(false)}
        >
          <button
            onClick={() => setShowFullImage(false)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
          >
            <X size={24} />
          </button>
          {material.extractedText && (
            <button
              onClick={(e) => { e.stopPropagation(); setShowExtractedText(true); }}
              className="absolute top-4 left-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
              title="OCR"
            >
              <FileText size={24} />
            </button>
          )}
          <img
            src={material.imageBase64}
            alt={material.title}
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Extracted Text Modal */}
      {showExtractedText && (
        <div
          className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setShowExtractedText(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">OCR</h3>
              <button
                onClick={() => setShowExtractedText(false)}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors text-slate-400"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              <pre className="whitespace-pre-wrap text-sm text-slate-700 font-mono leading-relaxed">
                {material.extractedText}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Header with Image and Info */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div
          className="relative h-48 bg-slate-100 cursor-pointer group"
          onClick={() => setShowFullImage(true)}
        >
          <img
            src={material.imageBase64}
            alt={material.title}
            className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
          />
          <div className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 backdrop-blur rounded-lg text-white opacity-0 group-hover:opacity-100 transition-opacity">
            <ZoomIn size={20} />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end pointer-events-none">
            <div className="p-6 text-white w-full pointer-events-auto">
              <button
                onClick={(e) => { e.stopPropagation(); onBack(); }}
                className="absolute top-4 left-4 p-2 bg-black/20 hover:bg-black/40 backdrop-blur rounded-lg transition-all text-white"
              >
                <ArrowLeft size={20} />
              </button>
              <h1 className="text-3xl font-bold mb-2">{material.title}</h1>
              <p className="text-white/90 text-sm line-clamp-2 max-w-2xl">{material.summary}</p>
            </div>
          </div>
        </div>
        
        <div className="p-6 flex flex-col md:flex-row gap-6 items-center justify-between bg-white">
          <div className="flex gap-4 text-sm text-slate-500">
             <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
               <Clock size={16} />
               <span>{t('uploaded')}: {new Date(material.createdAt).toLocaleDateString()}</span>
             </div>
             <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
               <BarChart2 size={16} />
               <span>{t('testsCompletedCount')}: {sessions.filter(s => s.status === QuizStatus.COMPLETED).length}</span>
             </div>
          </div>

          <button
            onClick={() => onStartQuiz(QuizType.STANDARD)}
            className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 transform hover:scale-105"
          >
            <Play size={20} fill="currentColor" />
            {t('startNewTest')}
          </button>
        </div>
      </div>

      {/* Sessions List */}
      <div>
        <h2 className="text-xl font-bold text-slate-800 mb-4 px-1">{t('testHistory')}</h2>

        {sortedSessions.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300">
            <p className="text-slate-500">{t('noTestsYet')}</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {sortedSessions.map(session => {
              const accuracy = getAccuracy(session);
              const isPerfect = accuracy >= 95;
              const isInProgress = session.status === QuizStatus.IN_PROGRESS;

              return (
                <div 
                  key={session.id}
                  onClick={() => onSelectQuiz(session.id)}
                  className={`group p-4 bg-white rounded-xl border transition-all cursor-pointer flex items-center justify-between
                    ${isInProgress ? 'border-indigo-200 ring-1 ring-indigo-50 shadow-md' : 'border-slate-100 hover:border-slate-300 hover:shadow-sm'}
                  `}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm
                      ${isInProgress ? 'bg-indigo-100 text-indigo-600 animate-pulse' : 
                        isPerfect ? 'bg-green-100 text-green-700' : 
                        accuracy < 50 ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}
                    `}>
                      {isInProgress ? <Play size={20} fill="currentColor" /> : `${accuracy}%`}
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-800">
                          {session.type === QuizType.MISTAKES_FIX ? t('mistakeReview') : t('standardTest')}
                        </h3>
                        {isInProgress && (
                          <span className="text-[10px] uppercase font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">{t('active')}</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        {new Date(session.createdAt).toLocaleString()} • {session.questions.length} {t('questions')}
                      </p>
                    </div>
                  </div>

                  <div className="text-slate-300 group-hover:text-indigo-600 transition-colors">
                    <ArrowLeft size={20} className="rotate-180" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
