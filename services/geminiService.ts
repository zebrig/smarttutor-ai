import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AnalysisResult, SessionMode, Question, QuizType } from "../types";

const getModel = (): string => {
  return process.env.GEMINI_MODEL || 'gemini-3-pro-preview';
};

const getAiClient = (): GoogleGenAI => {
  const apiKey = localStorage.getItem('gemini_api_key');
  if (!apiKey) {
    throw new Error("API_KEY_MISSING");
  }
  return new GoogleGenAI({ apiKey });
};

// Extract text from Gemini response using SDK getter
const extractTextFromResponse = (response: any): string => {
  // SDK 1.x: response.text is a getter that concatenates all text parts
  const text = response?.text;
  if (!text) {
    throw new Error("Empty response from Gemini");
  }
  return text;
};

export const analyzePageContent = async (imageBase64: string): Promise<AnalysisResult> => {
  const model = getModel();

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: "Topic title." },
      summary: { type: Type.STRING, description: "Brief summary." },
      extractedText: { type: Type.STRING, description: "The full text content extracted from the page (OCR)." },
      mode: { 
        type: Type.STRING, 
        enum: [SessionMode.THEORY, SessionMode.PRACTICE],
        description: "THEORY for text/info, PRACTICE for exercises."
      }
    },
    required: ["title", "summary", "mode", "extractedText"]
  };

  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: imageBase64 } },
          { text: "Analyze this textbook page. 1. Extract the full text (OCR). 2. Determine topic and summary. 3. Decide mode. CRITICAL: Output languages must match the page text." }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema
      }
    });

    const text = extractTextFromResponse(response);
    return JSON.parse(text) as AnalysisResult;
  } catch (error: any) {
    console.error("Analysis failed:", error);
    throw error;
  }
};

interface GenerationParams {
  imageBase64: string;
  extractedText: string;
  mode: SessionMode;
  quizType: QuizType;
  previousMistakes?: { question: string, wrongAnswer: string, explanation: string }[];
}

export const generateQuestions = async (params: GenerationParams): Promise<Question[]> => {
  const model = getModel();
  const { imageBase64, extractedText, mode, quizType, previousMistakes } = params;
  
  const randomSeed = Math.random().toString(36).substring(7);
  const count = quizType === QuizType.MISTAKES_FIX ? 10 : 20;

  let prompt = "";
  
  if (quizType === QuizType.MISTAKES_FIX && previousMistakes) {
    prompt = `The student previously made mistakes on these specific concepts:
    ${JSON.stringify(previousMistakes)}
    
    Generate ${count} NEW questions that specifically target these weak points to help them understand. 
    Use the textbook content below as the knowledge base.
    Format as JSON.`;
  } else {
    // Standard generation
    if (mode === SessionMode.THEORY) {
      prompt = `Generate ${count} multiple-choice questions based on the text below. Focus on reading comprehension and details. Random Seed: ${randomSeed}. Format as JSON.`;
    } else {
      prompt = `Generate ${count} PRACTICE problems similar to the ones found in the text/image below, but change the numbers/context. Random Seed: ${randomSeed}. Format as JSON.`;
    }
  }

  // Add context
  prompt += `\n\nCONTEXT TEXT FROM PAGE: "${extractedText.substring(0, 10000)}..."`;
  prompt += `\n\nCRITICAL: Questions must be in the same language as the context text.`;

  const responseSchema: Schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.STRING },
        text: { type: Type.STRING },
        type: { type: Type.STRING, enum: ["multiple_choice"] },
        options: { type: Type.ARRAY, items: { type: Type.STRING } },
        correctAnswer: { type: Type.STRING },
        explanation: { type: Type.STRING }
      },
      required: ["id", "text", "type", "options", "correctAnswer", "explanation"]
    }
  };

  try {
    const ai = getAiClient();
    
    // We prefer using text for speed/cost if available, but for PRACTICE mode (math), we often need the image for formulas
    const parts: any[] = [{ text: prompt }];
    
    // Always attach image for Practice mode or if text is empty, otherwise text is enough for Theory
    if (mode === SessionMode.PRACTICE || !extractedText || extractedText.length < 50) {
       parts.unshift({ inlineData: { mimeType: "image/jpeg", data: imageBase64 } });
    }

    const response = await ai.models.generateContent({
      model,
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      }
    });

    const text = extractTextFromResponse(response);
    const questions = JSON.parse(text) as Question[];
    return questions.map(q => ({...q, id: Date.now().toString() + Math.random().toString(36).substr(2, 9)}));

  } catch (error: any) {
    console.error("Question generation failed:", error);
    if (error.message === "API_KEY_MISSING") throw error;
    throw new Error("GENERATION_FAILED");
  }
};
