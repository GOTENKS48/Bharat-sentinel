// src/ai/ai.service.ts
import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class AiService {
  private logger = new Logger('AiService');
  private aiUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';

  async analyzeText(text: string) {
    try {
      // Call external AI service (Python/ML) to analyze the text
      const response = await axios.post(`${this.aiUrl}/analyze`, { text });

      // Expected output from AI service
      // {
      //   text: string,
      //   sentiment: 'positive' | 'neutral' | 'negative',
      //   flags: string[],
      //   confidence: number
      // }

      return response.data;
    } catch (error) {
      this.logger.error('AI service error: ' + error.message);
      return {
        text,
        sentiment: 'neutral',
        flags: [],
        confidence: 0,
        error: 'Failed to analyze text',
      };
    }
  }
}
