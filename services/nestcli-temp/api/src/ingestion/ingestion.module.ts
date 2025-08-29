import { Module } from '@nestjs/common';
import { IngestionService } from './ingestion.service';
import { IngestionController } from './ingestion.controller';
import { AiModule } from '../ai/ai.module';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [AiModule, SupabaseModule],
  providers: [IngestionService],
  controllers: [IngestionController],
})
export class IngestionModule {}
