import React, { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { UploadView } from './components/UploadView';
import { MaterialView } from './components/MaterialView';
import { SessionView } from './components/SessionView';
import { ApiKeyModal } from './components/ApiKeyModal';
import { StudyMaterial, QuizSession, AnalysisResult, QuizType, QuizStatus } from './types';
import { generateQuestions } from './services/geminiService';
import { useI18n } from './i18n';

// Constants
const STORAGE_MATERIALS_KEY = 'smart_tutor_materials';
const STORAGE_SESSIONS_KEY = 'smart_tutor_sessions';

enum ViewState {
  DASHBOARD = 'DASHBOARD',
  UPLOAD = 'UPLOAD',
  MATERIAL_DETAIL = 'MATERIAL_DETAIL',
  SESSION = 'SESSION',
}

const App: React.FC = () => {
  const { t } = useI18n();
  const [view, setView] = useState<ViewState>(ViewState.DASHBOARD);
  
  // Data State
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [quizSessions, setQuizSessions] = useState<QuizSession[]>([]);
  
  // UI State
  const [activeMaterialId, setActiveMaterialId] = useState<string | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [storageError, setStorageError] = useState(false);

  // Check for API key on mount
  useEffect(() => {
    const hasKey = localStorage.getItem('gemini_api_key');
    if (!hasKey) {
      setIsSettingsOpen(true);
    }
  }, []);

  // Load from LocalStorage
  useEffect(() => {
    try {
      const storedMaterials = localStorage.getItem(STORAGE_MATERIALS_KEY);
      const storedSessions = localStorage.getItem(STORAGE_SESSIONS_KEY);
      if (storedMaterials) setMaterials(JSON.parse(storedMaterials));
      if (storedSessions) setQuizSessions(JSON.parse(storedSessions));
    } catch (e) {
      console.error("Failed to load data", e);
    }
  }, []);

  // Save to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_MATERIALS_KEY, JSON.stringify(materials));
      localStorage.setItem(STORAGE_SESSIONS_KEY, JSON.stringify(quizSessions));
      setStorageError(false);
    } catch (e) {
      console.error("Failed to save to localStorage", e);
      setStorageError(true);
    }
  }, [materials, quizSessions]);

  const handleCreateMaterial = (image: string, analysis: AnalysisResult) => {
    const newMaterial: StudyMaterial = {
      id: Date.now().toString(),
      title: analysis.title,
      summary: analysis.summary,
      mode: analysis.mode,
      extractedText: analysis.extractedText,
      createdAt: Date.now(),
      imageBase64: image,
    };

    setMaterials(prev => [newMaterial, ...prev]);
    setActiveMaterialId(newMaterial.id);
    setView(ViewState.MATERIAL_DETAIL);
  };

  const handleStartQuiz = async (type: QuizType, baseSessionId?: string) => {
    if (!activeMaterialId) return;
    
    // If starting a mistakes quiz, we need to gather mistakes from the baseSession
    let previousMistakes: { question: string, wrongAnswer: string, explanation: string }[] | undefined = undefined;
    
    if (type === QuizType.MISTAKES_FIX && baseSessionId) {
      const baseSession = quizSessions.find(s => s.id === baseSessionId);
      if (baseSession) {
        previousMistakes = baseSession.questions
          .filter(q => {
             const ans = baseSession.userAnswers[q.id];
             return ans && !ans.isCorrect;
          })
          .map(q => ({
            question: q.text,
            wrongAnswer: baseSession.userAnswers[q.id]?.selectedOption || "No Answer",
            explanation: q.explanation
          }));
      }
    }

    const newSessionId = Date.now().toString();
    let initialQuestions: any[] = [];
    
    // If this is a mistake fix quiz, we generate questions upfront to ensure context is passed
    if (type === QuizType.MISTAKES_FIX && previousMistakes && previousMistakes.length > 0) {
       const material = materials.find(m => m.id === activeMaterialId);
       if (material) {
         try {
           initialQuestions = await generateQuestions({
             imageBase64: material.imageBase64.split(',')[1],
             extractedText: material.extractedText,
             mode: material.mode,
             quizType: QuizType.MISTAKES_FIX,
             previousMistakes
           });
         } catch (e) {
           console.error("Failed to generate mistake quiz", e);
           alert(t('mistakeQuizError'));
           return;
         }
       }
    } else if (type === QuizType.MISTAKES_FIX && (!previousMistakes || previousMistakes.length === 0)) {
       alert(t('noMistakesError'));
       return;
    }

    const newSession: QuizSession = {
      id: newSessionId,
      materialId: activeMaterialId,
      createdAt: Date.now(),
      type: type,
      status: QuizStatus.IN_PROGRESS,
      questions: initialQuestions, // If empty (Standard mode), SessionView will generate them on mount
      userAnswers: {},
      score: { correct: 0, total: 0 }
    };

    setQuizSessions(prev => [...prev, newSession]);
    setActiveSessionId(newSessionId);
    setView(ViewState.SESSION);
  };

  const handleUpdateSession = (updatedSession: QuizSession) => {
    setQuizSessions(prev => prev.map(s => s.id === updatedSession.id ? updatedSession : s));
  };

  const handleDeleteMaterial = (id: string) => {
    if (confirm(t('deleteConfirm'))) {
      setMaterials(prev => prev.filter(m => m.id !== id));
      setQuizSessions(prev => prev.filter(s => s.materialId !== id));
      if (activeMaterialId === id) {
        setActiveMaterialId(null);
        setView(ViewState.DASHBOARD);
      }
    }
  };

  const activeMaterial = materials.find(m => m.id === activeMaterialId);
  const activeSession = quizSessions.find(s => s.id === activeSessionId);
  const materialSessions = activeMaterialId ? quizSessions.filter(s => s.materialId === activeMaterialId) : [];

  return (
    <div className="min-h-screen font-sans text-slate-900 bg-slate-50">
      
      {isSettingsOpen && (
        <ApiKeyModal 
          onClose={() => setIsSettingsOpen(false)} 
          onSave={() => setIsSettingsOpen(false)}
          forceOpen={!localStorage.getItem('gemini_api_key')}
        />
      )}

      {view === ViewState.DASHBOARD && (
        <Dashboard
          materials={materials}
          onNewMaterial={() => setView(ViewState.UPLOAD)}
          onSelectMaterial={(m) => { setActiveMaterialId(m.id); setView(ViewState.MATERIAL_DETAIL); }}
          onDeleteMaterial={handleDeleteMaterial}
          onOpenSettings={() => setIsSettingsOpen(true)}
          storageError={storageError}
        />
      )}

      {view === ViewState.UPLOAD && (
        <UploadView 
          onCancel={() => setView(ViewState.DASHBOARD)}
          onAnalysisComplete={handleCreateMaterial}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
      )}

      {view === ViewState.MATERIAL_DETAIL && activeMaterial && (
        <MaterialView 
          material={activeMaterial}
          sessions={materialSessions}
          onBack={() => { setActiveMaterialId(null); setView(ViewState.DASHBOARD); }}
          onStartQuiz={(type) => handleStartQuiz(type)}
          onSelectQuiz={(id) => { setActiveSessionId(id); setView(ViewState.SESSION); }}
        />
      )}

      {view === ViewState.SESSION && activeSession && activeMaterial && (
        <SessionView 
          material={activeMaterial}
          session={activeSession}
          onUpdateSession={handleUpdateSession}
          onBack={() => { setActiveSessionId(null); setView(ViewState.MATERIAL_DETAIL); }}
          onStartMistakesQuiz={() => handleStartQuiz(QuizType.MISTAKES_FIX, activeSession.id)}
        />
      )}
    </div>
  );
};

export default App;