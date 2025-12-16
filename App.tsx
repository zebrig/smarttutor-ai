import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { Dashboard } from './components/Dashboard';
import { UploadView, QueuedFile } from './components/UploadView';
import { MaterialView } from './components/MaterialView';
import { SessionView } from './components/SessionView';
import { ApiKeyModal } from './components/ApiKeyModal';
import { StudyMaterial, QuizSession, AnalysisResult, QuizType, QuizStatus, PendingUpload } from './types';
import { generateQuestions, analyzePageContent, analyzeTextContent } from './services/geminiService';
import { extractPDFPages } from './services/pdfService';
import {
  getAllMaterials,
  getAllSessions,
  saveMaterial,
  saveSession,
  deleteMaterial,
  deleteSession,
  deleteSessionsByMaterial,
  migrateFromLocalStorage
} from './services/storageService';
import { useI18n } from './i18n';

// Inner app component that uses router hooks
const AppContent: React.FC = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  // Data State
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [quizSessions, setQuizSessions] = useState<QuizSession[]>([]);

  // UI State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Pending uploads queue
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const pendingUploadsRef = useRef<PendingUpload[]>([]);
  const uploadQueueRef = useRef<QueuedFile[]>([]);
  const isProcessingRef = useRef(false);

  // Keep ref in sync with state
  useEffect(() => {
    console.log(`[Ref Sync] pendingUploads changed, count=${pendingUploads.length}`,
      pendingUploads.map(p => `${p.fileName}: ${p.status} ${p.attempt}/${p.maxAttempts}`));
    pendingUploadsRef.current = pendingUploads;
  }, [pendingUploads]);

  // Check for API key on mount
  useEffect(() => {
    const hasKey = localStorage.getItem('gemini_api_key');
    if (!hasKey) {
      setIsSettingsOpen(true);
    }
  }, []);

  // Load from IndexedDB
  useEffect(() => {
    const loadData = async () => {
      try {
        // First, try to migrate from localStorage
        await migrateFromLocalStorage();

        // Then load from IndexedDB
        const [loadedMaterials, loadedSessions] = await Promise.all([
          getAllMaterials(),
          getAllSessions()
        ]);
        setMaterials(loadedMaterials);
        setQuizSessions(loadedSessions);
      } catch (e) {
        console.error("Failed to load data", e);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const handleCreateMaterial = useCallback(async (image: string, analysis: AnalysisResult) => {
    const newMaterial: StudyMaterial = {
      id: Date.now().toString() + '_' + Math.random().toString(36).slice(2, 7),
      title: analysis.title,
      summary: analysis.summary,
      mode: analysis.mode,
      extractedText: analysis.extractedText,
      createdAt: Date.now(),
      imageBase64: image,
      isParaphrased: analysis.isParaphrased,
    };

    try {
      await saveMaterial(newMaterial);
      setMaterials(prev => [newMaterial, ...prev]);
    } catch (e) {
      console.error("Failed to save material", e);
    }
  }, []);

  // Convert File to base64 data URL
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Generate preview thumbnail from file
  const generatePreview = async (file: QueuedFile): Promise<string | undefined> => {
    try {
      if (file.type === 'image') {
        // For images, create a small thumbnail
        const dataUrl = await fileToBase64(file.file);
        return dataUrl;
      } else if (file.type === 'pdf_page' && file.pageNumber) {
        // For PDF pages, extract a small thumbnail
        const pages = await extractPDFPages(file.file, [file.pageNumber]);
        if (pages.length > 0) {
          return pages[0].image;
        }
      } else if (file.type === 'text') {
        // For text, the file IS the placeholder image
        const dataUrl = await fileToBase64(file.file);
        return dataUrl;
      }
    } catch (e) {
      console.error('Failed to generate preview:', e);
    }
    return undefined;
  };

  // Process a single queued file
  const processQueuedFile = async (
    queuedFile: QueuedFile,
    pendingId: string,
    maxAttempts: number = 3
  ): Promise<boolean> => {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`[Process] ${queuedFile.fileName} - attempt ${attempt}/${maxAttempts}`);
      // Update status
      setPendingUploads(prev => {
        const updated = prev.map(p =>
          p.id === pendingId
            ? { ...p, status: attempt > 1 ? 'retrying' as const : 'processing' as const, attempt }
            : p
        );
        const found = updated.find(p => p.id === pendingId);
        console.log(`[State] Updated ${pendingId} to attempt=${found?.attempt}, status=${found?.status}`);
        return updated;
      });

      try {
        let imageBase64: string;
        let analysis: AnalysisResult;

        if (queuedFile.type === 'text' && queuedFile.rawText) {
          // Text type: use placeholder image and analyze text directly
          imageBase64 = await fileToBase64(queuedFile.file);
          analysis = await analyzeTextContent(queuedFile.rawText);
        } else {
          // Image/PDF type: extract image and analyze via OCR
          if (queuedFile.type === 'pdf_page' && queuedFile.pageNumber) {
            const pages = await extractPDFPages(queuedFile.file, [queuedFile.pageNumber]);
            if (pages.length === 0) throw new Error('Failed to extract PDF page');
            imageBase64 = pages[0].image;
          } else {
            imageBase64 = await fileToBase64(queuedFile.file);
          }

          // Analyze with Gemini OCR
          const base64Data = imageBase64.split(',')[1];
          analysis = await analyzePageContent(base64Data);
        }

        // Create material
        await handleCreateMaterial(imageBase64, analysis);

        // Remove from pending
        setPendingUploads(prev => prev.filter(p => p.id !== pendingId));
        return true;

      } catch (error: any) {
        console.error(`Attempt ${attempt}/${maxAttempts} failed for ${queuedFile.fileName}:`, error);

        const isRecitation = error.message === 'RECITATION_BLOCKED' || error.isRecitation;
        const citationUrls = error.citationUrls as string[] | undefined;
        console.log('[App] isRecitation:', isRecitation, 'citationUrls:', citationUrls);
        const shouldNotRetry = error.noRetry || isRecitation; // Don't retry RECITATION errors

        if (shouldNotRetry || attempt === maxAttempts) {
          // Final attempt failed or error that shouldn't be retried
          setPendingUploads(prev => prev.map(p =>
            p.id === pendingId
              ? {
                  ...p,
                  status: 'failed',
                  error: isRecitation ? undefined : error.message,
                  errorType: isRecitation ? 'recitation' : 'unknown',
                  citationUrls: isRecitation ? citationUrls : undefined
                }
              : p
          ));
          return false;
        }

        // Wait before retry (only for network errors)
        console.log(`[Process] ${queuedFile.fileName} - network error, retrying in ${2000 * attempt}ms...`);
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
      }
    }
    return false;
  };

  // Process the upload queue with parallel processing
  const PARALLEL_LIMIT = 5;

  const processQueue = useCallback(async () => {
    if (isProcessingRef.current || uploadQueueRef.current.length === 0) return;

    isProcessingRef.current = true;

    while (uploadQueueRef.current.length > 0) {
      // Take up to PARALLEL_LIMIT items from queue
      const batch: QueuedFile[] = [];
      while (batch.length < PARALLEL_LIMIT && uploadQueueRef.current.length > 0) {
        const queuedFile = uploadQueueRef.current.shift()!;
        // Check if still pending (not cancelled) - use ref for latest state
        const pending = pendingUploadsRef.current.find(p => p.id === queuedFile.id);
        if (pending && pending.status !== 'done') {
          batch.push(queuedFile);
        }
      }

      if (batch.length === 0) continue;

      // Process batch in parallel
      console.log(`[Queue] Starting batch of ${batch.length} items in parallel:`, batch.map(f => f.fileName));
      await Promise.all(
        batch.map(queuedFile => {
          const pending = pendingUploadsRef.current.find(p => p.id === queuedFile.id);
          console.log(`[Queue] Starting: ${queuedFile.fileName}`);
          return processQueuedFile(queuedFile, queuedFile.id, pending?.maxAttempts || 3);
        })
      );
      console.log(`[Queue] Batch completed`);
    }

    isProcessingRef.current = false;
  }, [handleCreateMaterial]);

  // Handle files selected from UploadView
  const handleFilesSelected = useCallback(async (files: QueuedFile[]) => {
    // Create pending entries with previews
    const newPending: PendingUpload[] = [];

    for (const file of files) {
      const preview = await generatePreview(file);
      newPending.push({
        id: file.id,
        fileName: file.fileName,
        preview,
        status: 'queued',
        attempt: 0,
        maxAttempts: 3,
        queuedFile: {
          type: file.type,
          file: file.file,
          pageNumber: file.pageNumber,
          rawText: file.rawText // For text type
        }
      });
    }

    // Add to pending state
    setPendingUploads(prev => [...newPending, ...prev]);

    // Add to queue
    uploadQueueRef.current.push(...files);

    // Navigate to dashboard
    navigate('/');

    // Use setTimeout to ensure state is updated before processing starts
    setTimeout(() => processQueue(), 100);
  }, [processQueue, navigate]);

  // Start processing when queue changes
  useEffect(() => {
    if (pendingUploadsRef.current.some(p => p.status === 'queued') && !isProcessingRef.current) {
      processQueue();
    }
  }, [pendingUploads, processQueue]);

  // Retry a failed upload
  const handleRetryUpload = useCallback((id: string) => {
    const pending = pendingUploadsRef.current.find(p => p.id === id);
    if (!pending || pending.status !== 'failed' || !pending.queuedFile) return;

    // Reset status
    setPendingUploads(prev => prev.map(p =>
      p.id === id ? { ...p, status: 'queued', attempt: 0, error: undefined, errorType: undefined, citationUrls: undefined } : p
    ));

    // Re-add to queue using stored file reference
    const queuedFile: QueuedFile = {
      id: pending.id,
      type: pending.queuedFile.type,
      file: pending.queuedFile.file,
      pageNumber: pending.queuedFile.pageNumber,
      fileName: pending.fileName,
      rawText: pending.queuedFile.rawText // For text type
    };
    uploadQueueRef.current.push(queuedFile);

    // Trigger processing
    setTimeout(() => processQueue(), 100);
  }, [processQueue]);

  // Cancel/remove a pending upload
  const handleCancelUpload = useCallback((id: string) => {
    setPendingUploads(prev => prev.filter(p => p.id !== id));
    uploadQueueRef.current = uploadQueueRef.current.filter(f => f.id !== id);
  }, []);

  const handleStartQuiz = useCallback(async (materialId: string, type: QuizType, baseSessionId?: string) => {
    const material = materials.find(m => m.id === materialId);
    if (!material) return;

    // If starting a mistakes quiz, gather mistakes from the baseSession
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

    if (type === QuizType.MISTAKES_FIX && (!previousMistakes || previousMistakes.length === 0)) {
       alert(t('noMistakesError'));
       return;
    }

    const newSessionId = Date.now().toString() + '_' + Math.random().toString(36).slice(2, 7);

    // Create session with GENERATING status (non-blocking)
    const newSession: QuizSession = {
      id: newSessionId,
      materialId: materialId,
      createdAt: Date.now(),
      type: type,
      status: QuizStatus.GENERATING,
      questions: [],
      userAnswers: {},
      score: { correct: 0, total: 0 }
    };

    try {
      await saveSession(newSession);
      setQuizSessions(prev => [...prev, newSession]);
    } catch (e) {
      console.error("Failed to save session", e);
      return;
    }

    // Generate questions in background
    generateQuestions({
      imageBase64: material.imageBase64.split(',')[1],
      extractedText: material.extractedText,
      mode: material.mode,
      quizType: type,
      previousMistakes
    }).then(async (questions) => {
      // Update session with questions
      const updatedSession: QuizSession = {
        ...newSession,
        status: QuizStatus.IN_PROGRESS,
        questions
      };
      await saveSession(updatedSession);
      setQuizSessions(prev => prev.map(s => s.id === newSessionId ? updatedSession : s));
    }).catch(async (e) => {
      console.error("Failed to generate quiz", e);
      // Mark session as failed by deleting it
      await deleteSession(newSessionId).catch(() => {});
      setQuizSessions(prev => prev.filter(s => s.id !== newSessionId));
    });
  }, [materials, quizSessions, t]);

  const handleUpdateSession = useCallback(async (updatedSession: QuizSession) => {
    try {
      await saveSession(updatedSession);
      setQuizSessions(prev => prev.map(s => s.id === updatedSession.id ? updatedSession : s));
    } catch (e) {
      console.error("Failed to update session", e);
    }
  }, []);

  const handleDeleteMaterial = useCallback(async (id: string) => {
    if (confirm(t('deleteConfirm'))) {
      try {
        await deleteMaterial(id);
        await deleteSessionsByMaterial(id);
        setMaterials(prev => prev.filter(m => m.id !== id));
        setQuizSessions(prev => prev.filter(s => s.materialId !== id));
        navigate('/');
      } catch (e) {
        console.error("Failed to delete material", e);
      }
    }
  }, [t, navigate]);

  // Background quiz generation (sequential for multiple materials)
  const handleBackgroundGenerate = useCallback(async (materialIds: string[]) => {
    // Create GENERATING sessions for all materials first
    const sessionsToGenerate: { session: QuizSession; material: StudyMaterial }[] = [];

    for (const materialId of materialIds) {
      const material = materials.find(m => m.id === materialId);
      if (!material) continue;

      const newSession: QuizSession = {
        id: Date.now().toString() + '_' + Math.random().toString(36).slice(2, 7) + '_' + materialId.slice(-4),
        materialId: materialId,
        createdAt: Date.now(),
        type: QuizType.STANDARD,
        status: QuizStatus.GENERATING,
        questions: [],
        userAnswers: {},
        score: { correct: 0, total: 0 }
      };

      try {
        await saveSession(newSession);
        setQuizSessions(prev => [...prev, newSession]);
        sessionsToGenerate.push({ session: newSession, material });
      } catch (e) {
        console.error(`Failed to create session for material ${materialId}:`, e);
      }
    }

    // Process sequentially
    for (const { session, material } of sessionsToGenerate) {
      try {
        const questions = await generateQuestions({
          imageBase64: material.imageBase64.split(',')[1],
          extractedText: material.extractedText,
          mode: material.mode,
          quizType: QuizType.STANDARD
        });

        const updatedSession: QuizSession = {
          ...session,
          status: QuizStatus.IN_PROGRESS,
          questions
        };

        await saveSession(updatedSession);
        setQuizSessions(prev => prev.map(s => s.id === session.id ? updatedSession : s));
      } catch (e) {
        console.error(`Failed to generate quiz for material ${material.id}:`, e);
        // Remove failed session
        await deleteSession(session.id).catch(() => {});
        setQuizSessions(prev => prev.filter(s => s.id !== session.id));
      }
    }
  }, [materials]);

  // Mark material as viewed
  const handleSelectMaterial = useCallback(async (material: StudyMaterial) => {
    if (!material.viewedAt) {
      const updated = { ...material, viewedAt: Date.now() };
      await saveMaterial(updated);
      setMaterials(prev => prev.map(mat => mat.id === material.id ? updated : mat));
    }
    navigate(`/material/${material.id}`);
  }, [navigate]);

  // Mark session as viewed
  const handleSelectSession = useCallback(async (materialId: string, sessionId: string) => {
    const session = quizSessions.find(s => s.id === sessionId);
    if (session && !session.viewedAt) {
      const updated = { ...session, viewedAt: Date.now() };
      await saveSession(updated);
      setQuizSessions(prev => prev.map(s => s.id === sessionId ? updated : s));
    }
    navigate(`/material/${materialId}/test/${sessionId}`);
  }, [quizSessions, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-pulse text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans text-slate-900 bg-slate-50">
      {isSettingsOpen && (
        <ApiKeyModal
          onClose={() => setIsSettingsOpen(false)}
          onSave={() => setIsSettingsOpen(false)}
          forceOpen={!localStorage.getItem('gemini_api_key')}
        />
      )}

      <Routes>
        <Route
          path="/"
          element={
            <Dashboard
              materials={materials}
              sessions={quizSessions}
              pendingUploads={pendingUploads}
              onNewMaterial={() => navigate('/upload')}
              onSelectMaterial={handleSelectMaterial}
              onDeleteMaterial={handleDeleteMaterial}
              onOpenSettings={() => setIsSettingsOpen(true)}
              onGenerateQuiz={handleBackgroundGenerate}
              onRetryUpload={handleRetryUpload}
              onCancelUpload={handleCancelUpload}
            />
          }
        />
        <Route
          path="/upload"
          element={
            <UploadView
              onCancel={() => navigate('/')}
              onFilesSelected={handleFilesSelected}
            />
          }
        />
        <Route
          path="/material/:materialId"
          element={
            <MaterialViewWrapper
              materials={materials}
              quizSessions={quizSessions}
              onStartQuiz={handleStartQuiz}
              onSelectSession={handleSelectSession}
            />
          }
        />
        <Route
          path="/material/:materialId/test/:sessionId"
          element={
            <SessionViewWrapper
              materials={materials}
              quizSessions={quizSessions}
              onUpdateSession={handleUpdateSession}
              onStartMistakesQuiz={handleStartQuiz}
            />
          }
        />
      </Routes>
    </div>
  );
};

// Wrapper component for MaterialView that extracts params
const MaterialViewWrapper: React.FC<{
  materials: StudyMaterial[];
  quizSessions: QuizSession[];
  onStartQuiz: (materialId: string, type: QuizType, baseSessionId?: string) => void;
  onSelectSession: (materialId: string, sessionId: string) => void;
}> = ({ materials, quizSessions, onStartQuiz, onSelectSession }) => {
  const { materialId } = useParams<{ materialId: string }>();
  const navigate = useNavigate();

  const material = materials.find(m => m.id === materialId);
  const sessions = quizSessions.filter(s => s.materialId === materialId);

  // Redirect if material not found
  useEffect(() => {
    if (!material) {
      navigate('/');
    }
  }, [material, navigate]);

  if (!material) {
    return null;
  }

  return (
    <MaterialView
      material={material}
      sessions={sessions}
      onBack={() => navigate('/')}
      onStartQuiz={(type) => onStartQuiz(material.id, type)}
      onSelectQuiz={(sessionId) => onSelectSession(material.id, sessionId)}
    />
  );
};

// Wrapper component for SessionView that extracts params
const SessionViewWrapper: React.FC<{
  materials: StudyMaterial[];
  quizSessions: QuizSession[];
  onUpdateSession: (session: QuizSession) => void;
  onStartMistakesQuiz: (materialId: string, type: QuizType, baseSessionId?: string) => void;
}> = ({ materials, quizSessions, onUpdateSession, onStartMistakesQuiz }) => {
  const { materialId, sessionId } = useParams<{ materialId: string; sessionId: string }>();
  const navigate = useNavigate();

  const material = materials.find(m => m.id === materialId);
  const session = quizSessions.find(s => s.id === sessionId);

  // Redirect if material or session not found
  useEffect(() => {
    if (!material) {
      navigate('/');
    } else if (!session) {
      navigate(`/material/${materialId}`);
    }
  }, [material, session, materialId, navigate]);

  if (!material || !session) {
    return null;
  }

  return (
    <SessionView
      material={material}
      session={session}
      onUpdateSession={onUpdateSession}
      onBack={() => navigate(`/material/${materialId}`)}
      onStartMistakesQuiz={() => onStartMistakesQuiz(materialId!, QuizType.MISTAKES_FIX, session.id)}
    />
  );
};

// Main App component with BrowserRouter
const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
};

export default App;
