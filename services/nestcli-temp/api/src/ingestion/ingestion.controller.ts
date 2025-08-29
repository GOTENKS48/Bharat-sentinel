import { Controller, Get } from '@nestjs/common';
import { IngestionService, AnalyzedPost } from './ingestion.service';

@Controller('ingestion')
export class IngestionController {
  constructor(private readonly ingestionService: IngestionService) {}

  @Get('fetch-analyze')
  async fetchAnalyze(): Promise<AnalyzedPost[]> {
    return this.ingestionService.fetchAndAnalyzePosts();
  }
}