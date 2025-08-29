// src/ingestion/ingestion.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { AiService } from '../ai/ai.service';
import { preprocessText } from '../utils/preprocess';
import { SupabaseService } from '../supabase/supabase.service';
import { v4 as uuidv4 } from 'uuid';


// Add interface for post data (adjust fields as needed)
export interface AnalyzedPost {
  id: string;
  source: string;
  original_text: string;
  preprocessed_text: string;
  ai_result: any;
  created_at: Date;
}

@Injectable()
export class IngestionService {
  private logger = new Logger('IngestionService');

  constructor(
    private readonly aiService: AiService,
    private readonly supabaseService: SupabaseService,
  ) {}

  async fetchAndAnalyzePosts() {
   const posts = [
  { id: uuidv4(), text: 'Some anti-India campaign text', source: 'X' },
  { id: uuidv4(), text: 'Another post example', source: 'Reddit' },
];
    // Add type annotation here
    const analyzedPosts: AnalyzedPost[] = [];

    for (const post of posts) {
      const cleanText = preprocessText(post.text);
      const analysis = await this.aiService.analyzeText(cleanText);

      // Save to Supabase
      const { data, error } = await this.supabaseService
        .getClient()
        .from('posts')
        .insert({
          id: post.id,
          source: post.source,
          original_text: post.text,
          preprocessed_text: cleanText,
          ai_result: analysis,
          created_at: new Date(),
        })
        .select(); // Make sure to include .select() to return inserted data

      if (error) {
        this.logger.error(error);
        continue;
      }

      // Check if data exists and has values
      if (data && data.length > 0) {
        analyzedPosts.push(data[0]);
      }
    }

    return analyzedPosts;
  }
}