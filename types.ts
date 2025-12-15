
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
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

export interface QuizSession {
  id: string;
  materialId: string;
  createdAt: number;
  completedAt?: number;
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
}

export interface AnalysisResult {
  title: string;
  summary: string;
  mode: SessionMode;
  extractedText: string;
}
