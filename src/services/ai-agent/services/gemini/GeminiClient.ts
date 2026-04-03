import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../../utils/logger';

interface GeminiResponse {
  success: boolean;
  content: string;
  tokensUsed: {
    input: number;
    output: number;
  };
  model: string;
  timestamp: Date;
}

interface GeminiRequestOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
}

/**
 * Gemini 2.5 Flash API Client
 * Handles all communication with Google's Generative AI API
 */
export class GeminiClient {
  private client: GoogleGenerativeAI;
  private model: string;
  private defaultOptions: GeminiRequestOptions;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }

    this.client = new GoogleGenerativeAI(apiKey);
    this.model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    this.defaultOptions = {
      temperature: parseFloat(process.env.GEMINI_TEMPERATURE || '0.7'),
      maxTokens: parseInt(process.env.GEMINI_MAX_TOKENS || '1000'),
    };

    logger.info('Gemini Client initialized', { model: this.model });
  }

  /**
   * Generate content using Gemini API
   */
  async generateContent(
    prompt: string,
    options: GeminiRequestOptions = {}
  ): Promise<GeminiResponse> {
    try {
      const startTime = Date.now();
      const mergedOptions = { ...this.defaultOptions, ...options };

      logger.debug('Calling Gemini API', { model: this.model, promptLength: prompt.length });

      const generativeModel = this.client.getGenerativeModel({
        model: this.model,
      });

      const response = await generativeModel.generateContent({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: mergedOptions.temperature,
          maxOutputTokens: mergedOptions.maxTokens,
          topP: mergedOptions.topP,
          topK: mergedOptions.topK,
        },
      });

      const content = response.response.text();
      const duration = Date.now() - startTime;

      // Extract token usage from response
      const tokensUsed = {
        input: response.response.usageMetadata?.promptTokenCount || 0,
        output: response.response.usageMetadata?.candidatesTokenCount || 0,
      };

      logger.info('Gemini API call successful', {
        model: this.model,
        duration,
        tokensUsed,
      });

      return {
        success: true,
        content,
        tokensUsed,
        model: this.model,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Gemini API call failed', {
        error: error instanceof Error ? error.message : String(error),
        model: this.model,
      });

      throw error;
    }
  }

  /**
   * Generate content with streaming
   */
  async generateContentStream(
    prompt: string,
    options: GeminiRequestOptions = {}
  ) {
    try {
      const mergedOptions = { ...this.defaultOptions, ...options };

      logger.debug('Calling Gemini API with streaming', {
        model: this.model,
        promptLength: prompt.length,
      });

      const generativeModel = this.client.getGenerativeModel({
        model: this.model,
      });

      const stream = await generativeModel.generateContentStream({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: mergedOptions.temperature,
          maxOutputTokens: mergedOptions.maxTokens,
          topP: mergedOptions.topP,
          topK: mergedOptions.topK,
        },
      });

      return stream;
    } catch (error) {
      logger.error('Gemini streaming API call failed', {
        error: error instanceof Error ? error.message : String(error),
        model: this.model,
      });

      throw error;
    }
  }

  /**
   * Count tokens for a given text
   */
  async countTokens(text: string): Promise<number> {
    try {
      const generativeModel = this.client.getGenerativeModel({
        model: this.model,
      });

      const result = await generativeModel.countTokens(text);
      return result.totalTokens;
    } catch (error) {
      logger.error('Token counting failed', {
        error: error instanceof Error ? error.message : String(error),
      });

      // Fallback: estimate tokens (roughly 4 characters per token)
      return Math.ceil(text.length / 4);
    }
  }

  /**
   * Get model information
   */
  getModelInfo() {
    return {
      model: this.model,
      defaultOptions: this.defaultOptions,
    };
  }
}

// Export singleton instance
export const geminiClient = new GeminiClient();

