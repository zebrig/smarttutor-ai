
export enum SessionMode {
  THEORY = 'THEORY',
  PRACTICE = 'PRACTICE',
}

export interface Question {
  id: string;
  text: string;
  options: string[]; 
  correctAnswer: string; 
  explanation: string;
  type: 'multiple_choice';
}

export interface UserAnswer {
  questionId: string;
  selectedOption: string;
  isCorrect: boolean;
  timestamp: number;
}

export enum QuizType {
  STANDARD = 'STANDARD',
  MISTAKES_FIX = 'MISTAKES_FIX',
}

export enum QuizStatus {
  GENERATING = 'GENERATING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

export interface QuizSession {
  id: string;
  materialId: string;
  createdAt: number;
  completedAt?: number;
  viewedAt?: number; // Last time user opened this session
  type: QuizType;
  status: QuizStatus;
  questions: Question[];
  userAnswers: Record<string, UserAnswer>; // Map questionId -> Answer
  score: {
    correct: number;
    total: number;
  };
}

export interface StudyMaterial {
  id: string;
  title: string;
  summary: string;
  extractedText: string; // OCR content for cheaper re-generation
  createdAt: number;
  imageBase64: string;
  mode: SessionMode;
  isParaphrased?: boolean; // True if OCR was blocked and content was paraphrased
  viewedAt?: number; // Last time user opened this material
}

export interface AnalysisResult {
  title: string;
  summary: string;
  mode: SessionMode;
  extractedText: string;
  isParaphrased?: boolean; // True if RECITATION occurred and fallback was used
}

// Pending upload tracking
export type PendingUploadStatus = 'queued' | 'processing' | 'retrying' | 'done' | 'failed';

export interface PendingUploadFile {
  type: 'image' | 'pdf_page';
  file: File;
  pageNumber?: number;
}

export interface PendingUpload {
  id: string;
  fileName: string;
  preview?: string; // Thumbnail for display
  status: PendingUploadStatus;
  attempt: number;
  maxAttempts: number;
  error?: string;
  errorType?: 'recitation' | 'network' | 'unknown';
  citationUrls?: string[]; // URLs from RECITATION error
  queuedFile?: PendingUploadFile; // Keep reference for retry
}
