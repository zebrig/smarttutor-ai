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

// Retry helper with exponential backoff
const withRetry = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      // Don't retry on API key missing
      if (error.message === "API_KEY_MISSING") throw error;

      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 500;
        console.log(`Retry ${attempt + 1}/${maxRetries} after ${Math.round(delay)}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
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

  const ai = getAiClient();

  // First attempt: try exact OCR extraction
  const makeRequest = async (paraphrase: boolean) => {
    const prompt = paraphrase
      ? `You are helping a student study. Analyze this educational material image.
1. Create a descriptive TITLE for this learning topic (your own words)
2. Write a helpful SUMMARY explaining the key concepts (paraphrased)
3. For extractedText: Write detailed study notes covering ALL concepts, formulas, definitions shown. Paraphrase for learning.
4. Determine MODE: "THEORY" for explanatory content, "PRACTICE" for exercises

CRITICAL: Output in the SAME LANGUAGE as source. Paraphrase - do not copy verbatim.`
      : "Analyze this textbook page. 1. Extract the full text (OCR). 2. Determine topic and summary. 3. Decide mode. CRITICAL: Output language must match the page text.";

    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: imageBase64 } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema
      }
    });

    return response;
  };

  // Try exact OCR first
  let response = await makeRequest(false);
  let isParaphrased = false;

  // Check for RECITATION - if so, retry with paraphrasing
  const candidate = (response as any)?.candidates?.[0];
  if (candidate?.finishReason === 'RECITATION') {
    console.log('RECITATION detected, retrying with paraphrase prompt...');
    response = await makeRequest(true);
    isParaphrased = true;

    // Check if paraphrase also got RECITATION
    const paraphraseCandidate = (response as any)?.candidates?.[0];
    if (paraphraseCandidate?.finishReason === 'RECITATION') {
      // Extract citation URLs from both attempts - check multiple possible paths
      const extractCitations = (candidate: any): string[] => {
        const urls: string[] = [];

        // Try citationMetadata.citationSources (common path)
        const sources1 = candidate?.citationMetadata?.citationSources || [];
        for (const c of sources1) {
          if (c.uri) urls.push(c.uri);
          if (c.url) urls.push(c.url);
        }

        // Try citationMetadata.citations
        const sources2 = candidate?.citationMetadata?.citations || [];
        for (const c of sources2) {
          if (c.uri) urls.push(c.uri);
          if (c.url) urls.push(c.url);
        }

        // Try groundingMetadata
        const grounding = candidate?.groundingMetadata?.groundingChunks || [];
        for (const c of grounding) {
          if (c.web?.uri) urls.push(c.web.uri);
          if (c.web?.url) urls.push(c.web.url);
        }

        return urls;
      };

      console.log('[RECITATION] candidate1 full:', JSON.stringify(candidate, null, 2));
      console.log('[RECITATION] candidate2 full:', JSON.stringify(paraphraseCandidate, null, 2));

      const urls1 = extractCitations(candidate);
      const urls2 = extractCitations(paraphraseCandidate);
      console.log('[RECITATION] urls1:', urls1);
      console.log('[RECITATION] urls2:', urls2);

      const uniqueUrls = [...new Set([...urls1, ...urls2])];
      console.log('[RECITATION] uniqueUrls:', uniqueUrls);

      const error = new Error('RECITATION_BLOCKED');
      (error as any).isRecitation = true;
      (error as any).citationUrls = uniqueUrls;
      (error as any).noRetry = true; // Signal to not retry this error
      throw error;
    }
  }

  const text = extractTextFromResponse(response);
  const result = JSON.parse(text) as AnalysisResult;
  result.isParaphrased = isParaphrased;
  return result;
};

// Analyze pasted text (no image/OCR needed - text is provided by user)
export const analyzeTextContent = async (rawText: string): Promise<AnalysisResult> => {
  const model = getModel();

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: "Topic title based on the text content." },
      summary: { type: Type.STRING, description: "Brief summary of the text." },
      mode: {
        type: Type.STRING,
        enum: [SessionMode.THEORY, SessionMode.PRACTICE],
        description: "THEORY for explanatory/informational content, PRACTICE for exercises/problems."
      }
    },
    required: ["title", "summary", "mode"]
  };

  const ai = getAiClient();

  const prompt = `Analyze this educational text and provide:
1. A descriptive TITLE for this learning topic
2. A brief SUMMARY explaining the key concepts
3. Determine MODE: "THEORY" for explanatory content, "PRACTICE" for exercises/problems

TEXT TO ANALYZE:
"""
${rawText.substring(0, 15000)}
"""

CRITICAL: Output in the SAME LANGUAGE as the input text.`;

  const response = await ai.models.generateContent({
    model,
    contents: { parts: [{ text: prompt }] },
    config: {
      responseMimeType: "application/json",
      responseSchema: responseSchema
    }
  });

  const text = extractTextFromResponse(response);
  const parsed = JSON.parse(text);

  // Return with the original text as extractedText
  const result: AnalysisResult = {
    title: parsed.title,
    summary: parsed.summary,
    mode: parsed.mode,
    extractedText: rawText, // User's text is already the "OCR" result
    isParaphrased: false
  };

  return result;
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
