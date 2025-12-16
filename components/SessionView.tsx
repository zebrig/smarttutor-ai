import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, CheckCircle, XCircle, RefreshCw, BarChart2, Check, AlertCircle, Eye, Play, Loader2, X } from 'lucide-react';
import { StudyMaterial, QuizSession, QuizStatus, QuizType, UserAnswer } from '../types';
import { generateQuestions } from '../services/geminiService';
import { useI18n } from '../i18n';

interface SessionViewProps {
  material: StudyMaterial;
  session: QuizSession;
  onUpdateSession: (updatedSession: QuizSession) => void;
  onStartMistakesQuiz: () => Promise<void>;
  onBack: () => void;
}

export const SessionView: React.FC<SessionViewProps> = ({
  material,
  session,
  onUpdateSession,
  onStartMistakesQuiz,
  onBack
}) => {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [creatingMistakeQuiz, setCreatingMistakeQuiz] = useState(false);
  const [mistakeQuizError, setMistakeQuizError] = useState<string | null>(null);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);

  // Determine mode
  const isReadOnly = session.status === QuizStatus.COMPLETED;

  // Show loading state for GENERATING sessions (shouldn't normally happen since they're not clickable)
  const isGenerating = session.status === QuizStatus.GENERATING;
  useEffect(() => {
    if (isGenerating) {
      setLoading(true);
    } else {
      setLoading(false);
    }
  }, [isGenerating]);

  // Sync internal state when switching questions or session changes
  useEffect(() => {
    const currentQ = session.questions[currentQIndex];
    if (currentQ) {
      const savedAnswer = session.userAnswers[currentQ.id];
      if (savedAnswer) {
        setSelectedOption(savedAnswer.selectedOption);
        setIsAnswered(true);
      } else {
        setSelectedOption(null);
        setIsAnswered(false);
      }
    }
  }, [currentQIndex, session.userAnswers, session.questions]);


  const handleSubmitAnswer = () => {
    if (!selectedOption || isAnswered || isReadOnly) return;
    
    const currentQ = session.questions[currentQIndex];
    const isCorrect = selectedOption === currentQ.correctAnswer;
    
    const newAnswer: UserAnswer = {
      questionId: currentQ.id,
      selectedOption: selectedOption,
      isCorrect,
      timestamp: Date.now()
    };

    const newScore = {
      correct: session.score.correct + (isCorrect ? 1 : 0),
      total: session.score.total + 1
    };

    const newAnswers = { ...session.userAnswers, [currentQ.id]: newAnswer };
    const allAnswered = Object.keys(newAnswers).length === session.questions.length;

    onUpdateSession({
      ...session,
      userAnswers: newAnswers,
      score: newScore,
      status: allAnswered ? QuizStatus.COMPLETED : QuizStatus.IN_PROGRESS,
      completedAt: allAnswered ? Date.now() : undefined
    });
    
    setIsAnswered(true);
  };

  const handleNext = () => {
    if (currentQIndex < session.questions.length) {
      setCurrentQIndex(prev => prev + 1);
    }
  };
  
  const handlePrev = () => {
    if (currentQIndex > 0) {
      setCurrentQIndex(prev => prev - 1);
    }
  };

  const handleMistakeQuizClick = async () => {
    setCreatingMistakeQuiz(true);
    setMistakeQuizError(null);
    try {
      await onStartMistakesQuiz();
    } catch (e) {
      console.error(e);
      setMistakeQuizError(t('failedToCreateTest'));
    } finally {
      setCreatingMistakeQuiz(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
        <h2 className="text-xl font-semibold text-slate-700">{t('generatingQuestions')}</h2>
        <p className="text-slate-500">{session.type === QuizType.MISTAKES_FIX ? t('analyzingMistakes') : t('aiStudying')}</p>
      </div>
    );
  }

  if (session.questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
           <AlertCircle className="mx-auto text-red-400 mb-4" size={48} />
           <p className="text-slate-600 mb-4">{t('failedToLoad')}</p>
           <button onClick={onBack} className="text-indigo-600 font-bold">{t('goBack')}</button>
        </div>
      </div>
    );
  }

  // Determine if we show the "Result" card.
  // Summary is shown when index equals the questions length (one past the last)
  const showSummary = currentQIndex === session.questions.length;

  // Get current question with bounds check
  const currentQ = session.questions[currentQIndex];
  const isLastQuestion = currentQIndex === session.questions.length - 1;

  // Safety check - if currentQ is undefined and we're not showing summary, reset
  if (!currentQ && !showSummary && session.questions.length > 0) {
    setCurrentQIndex(0);
    return null;
  }
  const accuracy = session.score.total > 0 ? Math.round((session.score.correct / session.score.total) * 100) : 0;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <main className="flex-1 max-w-2xl w-full mx-auto p-4 md:p-6 flex flex-col justify-center">

        {/* Back button */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={onBack}
            className="text-slate-400 hover:text-indigo-600 transition-colors flex items-center gap-1 text-sm"
          >
            <ArrowLeft size={16} />
            <span>{t('back')}</span>
          </button>
          {isReadOnly ? (
            <span className="text-xs text-slate-400 font-medium">{t('result')}: {accuracy}%</span>
          ) : session.score.total > 0 ? (
            <span className="flex items-center gap-1 text-xs font-medium">
              <span className="text-green-600">{session.score.correct}</span>
              <span className="text-slate-400">/</span>
              <span className="text-red-500">{session.score.total - session.score.correct}</span>
            </span>
          ) : null}
        </div>

        {/* Question navigation - only show during active test */}
        {!isReadOnly && (
          <div className="flex items-center justify-center gap-4 text-sm text-slate-500 mb-2">
            <button
              onClick={handlePrev}
              disabled={currentQIndex === 0}
              className="p-1.5 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="font-medium">
              {t('question')} {currentQIndex + 1} / {session.questions.length}
            </span>
            <button
              onClick={handleNext}
              disabled={currentQIndex === session.questions.length - 1 || !isAnswered}
              className="p-1.5 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}
        <div className="w-full bg-slate-200 h-1.5 rounded-full mb-4 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${isReadOnly || showSummary ? 'bg-slate-400' : 'bg-indigo-600'}`}
            style={{ width: showSummary ? '100%' : `${((currentQIndex + 1) / session.questions.length) * 100}%` }}
          ></div>
        </div>

        {/* Quick navigation in review mode */}
        {isReadOnly && (
          <div className="flex flex-wrap gap-1.5 mb-6 justify-center">
            {session.questions.map((q, idx) => {
              const answer = session.userAnswers[q.id];
              const isCorrect = answer?.isCorrect;
              const isCurrent = idx === currentQIndex;
              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentQIndex(idx)}
                  className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                    isCurrent
                      ? 'ring-2 ring-offset-2 ring-indigo-500'
                      : ''
                  } ${
                    isCorrect
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-red-100 text-red-700 hover:bg-red-200'
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
            {/* Results button */}
            <button
              onClick={() => setCurrentQIndex(session.questions.length)}
              className={`px-3 h-8 rounded-lg text-xs font-bold transition-all ${
                showSummary
                  ? 'ring-2 ring-offset-2 ring-indigo-500 bg-indigo-100 text-indigo-700'
                  : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
              }`}
            >
              {t('result')}
            </button>
          </div>
        )}

        {showSummary ? (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center animate-fade-in">
             <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-6 ${accuracy >= 95 ? 'bg-green-100 text-green-600' : 'bg-indigo-100 text-indigo-600'}`}>
                {accuracy >= 95 ? <CheckCircle size={40} /> : <BarChart2 size={40} />}
             </div>
             <h2 className="text-2xl font-bold text-slate-800 mb-2">
                {accuracy >= 95 ? t('excellent') : t('testCompleted')}
             </h2>
             <p className="text-slate-500 text-lg mb-6">{t('correctAnswers')}: <strong className="text-slate-800">{session.score.correct} {t('of')} {session.questions.length}</strong></p>

             {accuracy < 95 && (
               <div className="mb-6 p-4 bg-orange-50 border border-orange-100 rounded-xl text-orange-800 text-left">
                 <p className="font-bold flex items-center gap-2">
                   <AlertCircle size={16} /> {t('roomForImprovement')}
                 </p>
                 <p className="text-sm mt-1">
                   {t('mistakesInQuestions', { count: session.questions.length - session.score.correct })}
                 </p>
                 <button
                  onClick={handleMistakeQuizClick}
                  disabled={creatingMistakeQuiz}
                  className="mt-3 w-full bg-white border border-orange-200 text-orange-700 font-bold py-2 px-4 rounded-lg hover:bg-orange-100 transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                 >
                   {creatingMistakeQuiz ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
                   {creatingMistakeQuiz ? t('creatingTest') : t('createMistakeTest')}
                 </button>
                 {mistakeQuizError && (
                   <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between gap-2">
                     <div className="flex items-center gap-2 text-red-700 text-sm">
                       <AlertCircle size={16} />
                       {t('failedToCreateTest')}
                     </div>
                     <button
                       onClick={() => setMistakeQuizError(null)}
                       className="text-red-400 hover:text-red-600 transition-colors"
                     >
                       <X size={16} />
                     </button>
                   </div>
                 )}
               </div>
             )}

             <div className="flex gap-3">
               <button
                 onClick={() => setCurrentQIndex(0)}
                 className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-6 rounded-xl transition-all"
               >
                 <span className="flex items-center justify-center gap-2"><Eye size={18}/> {t('viewAnswers')}</span>
               </button>
               <button
                 onClick={onBack}
                 className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-md"
               >
                 {t('toTestList')}
               </button>
             </div>
          </div>
        ) : currentQ && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative">
            <div className="p-6 md:p-8">
              <h3 className="text-xl font-bold text-slate-800 leading-snug mb-6">
                {currentQ.text}
              </h3>

              <div className="space-y-3">
                {currentQ.options.map((option, idx) => {
                  const myAnswer = session.userAnswers[currentQ.id];
                  
                  // Style logic
                  let style = "border-slate-200 text-slate-700 hover:bg-indigo-50 hover:border-indigo-300";
                  let icon = null;

                  if (isAnswered || isReadOnly) {
                    // Reveal phase
                    style = "border-slate-100 text-slate-400 opacity-60"; // Default dimmed

                    if (option === currentQ.correctAnswer) {
                       style = "border-green-500 bg-green-50 text-green-900 font-medium opacity-100";
                       icon = <Check size={20} className="text-green-600" />;
                    }
                    
                    if (myAnswer?.selectedOption === option) {
                       if (option !== currentQ.correctAnswer) {
                         style = "border-red-500 bg-red-50 text-red-900 opacity-100";
                         icon = <XCircle size={20} className="text-red-600" />;
                       } else {
                         // Correctly selected
                         style = "border-green-500 bg-green-50 text-green-900 font-bold opacity-100 ring-1 ring-green-500";
                       }
                    }
                  } else if (selectedOption === option) {
                    // Selected but not submitted
                    style = "border-indigo-600 bg-indigo-50 text-indigo-900 ring-1 ring-indigo-600";
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => !isReadOnly && !isAnswered && setSelectedOption(option)}
                      disabled={isReadOnly || isAnswered}
                      className={`w-full text-left p-4 border-2 rounded-xl transition-all duration-200 flex items-center justify-between group ${style}`}
                    >
                      <span>{option}</span>
                      {icon}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="bg-slate-50 p-6 border-t border-slate-100">
              {(!isAnswered && !isReadOnly) ? (
                <button
                  onClick={handleSubmitAnswer}
                  disabled={!selectedOption}
                  className={`w-full py-3.5 rounded-xl font-bold text-lg transition-all shadow-sm ${
                    selectedOption
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {t('check')}
                </button>
              ) : (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {/* Explanation Block */}
                  <div className={`mb-4 p-4 rounded-xl text-sm ${
                    session.userAnswers[currentQ.id]?.isCorrect
                    ? 'bg-green-100 text-green-900'
                    : 'bg-red-50 text-red-900'
                  }`}>
                    <p className="font-bold mb-1">{t('explanation')}:</p>
                    {currentQ.explanation}
                  </div>

                  <div className="flex gap-3">
                    <button
                       onClick={handlePrev}
                       disabled={currentQIndex === 0}
                       className="px-4 py-3 rounded-xl border border-slate-200 text-slate-500 hover:bg-white disabled:opacity-30"
                    >
                      <ArrowLeft size={20} />
                    </button>
                    <button
                      onClick={handleNext}
                      className="flex-1 bg-slate-800 hover:bg-slate-900 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
                    >
                      {isLastQuestion ? t('toResults') : t('next')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};