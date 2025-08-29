import { Module } from '@nestjs/common';
import { FetchService } from './fetch.service';
import { FetchController } from './fetch.controller';
import { TextProcessingService } from '../text-processing.service'; // Add this import
import { SupabaseModule } from '../supabase/supabase.module';
import { NlpClassificationService } from 'src/nlp-classification.service';

@Module({
  imports: [SupabaseModule],
  controllers: [FetchController],
  providers: [
    FetchService,
    TextProcessingService,
    NlpClassificationService // Add this line
  ],
})
export class FetchModule {}