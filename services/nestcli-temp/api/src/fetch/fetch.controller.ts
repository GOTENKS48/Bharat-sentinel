import { Controller, Get, Query, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { FetchService } from './fetch.service';
import { Post } from '@nestjs/common';

// Define the Post interface locally to avoid import issues
interface Post {
  id: string;
  source: string;
  text: string;
  author: string;
  link: string;
  media_urls: string[];
  created_at: string;
  is_mock: boolean;
  query: string;
  content_hash: string;
  updated_at: string;
  batch_id: string;
}

@Controller('fetch')
export class FetchController {
  private readonly logger = new Logger(FetchController.name);

  constructor(private readonly fetchService: FetchService) {}

  @Get('db')
  async getPostsFromDB(
    @Query('query') query?: string,
    @Query('limit') limit = 50
  ): Promise<{ success: boolean; data: Post[]; count: number; source: string; }> {
    try {
      this.logger.log(`Fetching posts from database${query ? ` for query: ${query}` : ''}`);
      const posts = await this.fetchService.getPostsFromDB(query, Number(limit));
      
      return {
        success: true,
        data: posts,
        count: posts.length,
        source: 'database'
      };
    } catch (error) {
      this.logger.error('Error fetching posts from database', error);
      throw new HttpException(
        'Failed to fetch posts from database',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('x')
  async getX(
    @Query('query') query: string, 
    @Query('limit') limit = 5,
    @Query('save') save = true
  ): Promise<{ success: boolean; data: any[]; count: number; platform: string; saved_to_db: boolean; batch_id?: string; }> {
    try {
      this.logger.log(`Fetching X posts for query: ${query || 'India'}`);
      
      if (Boolean(save)) {
        // Use the fetch-and-save method (saves to DB and returns structured data)
        const result = await this.fetchService.fetchAndSaveXPosts(query || 'India', Number(limit));
        
        return {
          success: true,
          data: result.dbPosts, // Use dbPosts from database
          count: result.dbPosts.length,
          platform: 'X',
          saved_to_db: true,
          batch_id: result.batchId
        };
      } else {
        // Use the fetch-only method (without saving to DB)
        const posts = await this.fetchService.fetchXPosts(query || 'India', Number(limit));
        
        return {
          success: true,
          data: posts,
          count: posts.length,
          platform: 'X',
          saved_to_db: false
        };
      }
    } catch (error) {
      this.logger.error('Error fetching X posts', error);
      throw new HttpException(
        'Failed to fetch X posts', 
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('reddit')
  async getReddit(
    @Query('query') query: string, 
    @Query('limit') limit = 5,
    @Query('save') save = true
  ): Promise<{ success: boolean; data: any[]; count: number; platform: string; saved_to_db: boolean; batch_id?: string; }> {
    try {
      this.logger.log(`Fetching Reddit posts for query: ${query || 'India'}`);
      
      if (Boolean(save)) {
        // Use the fetch-and-save method (saves to DB and returns structured data)
        const result = await this.fetchService.fetchAndSaveRedditPosts(query || 'India', Number(limit));
        
        return {
          success: true,
          data: result.dbPosts, // Use dbPosts from database
          count: result.dbPosts.length,
          platform: 'Reddit',
          saved_to_db: true,
          batch_id: result.batchId
        };
      } else {
        // Use the fetch-only method (without saving to DB)
        const posts = await this.fetchService.fetchRedditPosts(query || 'India', Number(limit));
        
        return {
          success: true,
          data: posts,
          count: posts.length,
          platform: 'Reddit',
          saved_to_db: false
        };
      }
    } catch (error) {
      this.logger.error('Error fetching Reddit posts', error);
      throw new HttpException(
        'Failed to fetch Reddit posts', 
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('youtube')
  async getYouTube(
    @Query('query') query: string, 
    @Query('limit') limit = 5,
    @Query('save') save = true
  ): Promise<{ success: boolean; data: any[]; count: number; platform: string; saved_to_db: boolean; batch_id?: string; }> {
    try {
      this.logger.log(`Fetching YouTube videos for query: ${query || 'India'}`);
      
      if (Boolean(save)) {
        // Use the fetch-and-save method (saves to DB and returns structured data)
        const result = await this.fetchService.fetchAndSaveYouTubePosts(query || 'India', Number(limit));
        
        return {
          success: true,
          data: result.dbPosts, // Use dbPosts from database
          count: result.dbPosts.length,
          platform: 'YouTube',
          saved_to_db: true,
          batch_id: result.batchId
        };
      } else {
        // Use the fetch-only method (without saving to DB)
        const posts = await this.fetchService.fetchYouTubeVideos(query || 'India', Number(limit));
        
        return {
          success: true,
          data: posts,
          count: posts.length,
          platform: 'YouTube',
          saved_to_db: false
        };
      }
    } catch (error) {
      this.logger.error('Error fetching YouTube videos', error);
      throw new HttpException(
        'Failed to fetch YouTube videos', 
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('all')
  async getAll(
    @Query('query') query: string,
    @Query('limit') limit = 5,
    @Query('save') save = true
  ): Promise<{ success: boolean; data: any[]; count: number; platforms: string[]; saved_to_db: boolean; batch_id?: string; }> {
    try {
      this.logger.log(`Fetching all platform posts for query: ${query || 'India'}`);
      
      if (Boolean(save)) {
        // Use the fetchAndSaveAllPosts method
        const result = await this.fetchService.fetchAndSaveAllPosts(query || 'India', Number(limit));
        
        return {
          success: true,
          data: result.dbPosts, // Use dbPosts from database
          count: result.dbPosts.length,
          platforms: ['X', 'Reddit', 'YouTube'],
          saved_to_db: true,
          batch_id: result.batchId
        };
      } else {
        // Fetch from all platforms without saving
        const [xPosts, redditPosts, ytPosts] = await Promise.all([
          this.fetchService.fetchXPosts(query || 'India', Number(limit)),
          this.fetchService.fetchRedditPosts(query || 'India', Number(limit)),
          this.fetchService.fetchYouTubeVideos(query || 'India', Number(limit))
        ]);
        
        const posts = [
          ...xPosts.map(p => ({ ...p, source: 'X' })),
          ...redditPosts.map(p => ({ ...p, source: 'Reddit' })),
          ...ytPosts.map(p => ({ ...p, source: 'YouTube' }))
        ];
        
        return {
          success: true,
          data: posts,
          count: posts.length,
          platforms: ['X', 'Reddit', 'YouTube'],
          saved_to_db: false
        };
      }
    } catch (error) {
      this.logger.error('Error fetching all platform posts', error);
      throw new HttpException(
        'Failed to fetch posts from all platforms', 
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('batches')
  async getAllBatches(): Promise<{ success: boolean; data: Array<{batchId: string, count: number, sources: string[], latestUpdate: string, query: string}>; total: number; }> {
    try {
      this.logger.log('Fetching all batch metadata');
      const result = await this.fetchService.getAllBatches();
      
      return {
        success: true,
        data: result.batches,
        total: result.total
      };
    } catch (error) {
      this.logger.error('Error fetching all batches', error);
      throw new HttpException(
        'Failed to fetch batches',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

@Get('batch/latest')
async getLatestBatchPosts(): Promise<{ success: boolean; data: Post[]; count: number; batch_id: string | null; }> {
  try {
    this.logger.log('Fetching posts from latest batch');
    const result = await this.fetchService.getLatestBatchPosts();
    
    return {
      success: true,
      data: result.posts,
      count: result.posts.length,
      batch_id: result.batchId
    };
  } catch (error) {
    this.logger.error('Error fetching latest batch posts', error);
    throw new HttpException(
      'Failed to fetch latest batch posts',
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}

  @Get('batch/:batchId')
  async getPostsByBatchId(
    @Query('batchId') batchId: string
  ): Promise<{ success: boolean; data: Post[]; count: number; batch_id: string; }> {
    try {
      this.logger.log(`Fetching posts for batch ID: ${batchId}`);
      const posts = await this.fetchService.getPostsByBatchId(batchId);
      
      return {
        success: true,
        data: posts,
        count: posts.length,
        batch_id: batchId
      };
    } catch (error) {
      this.logger.error('Error fetching posts by batch ID', error);
      throw new HttpException(
        'Failed to fetch posts by batch ID',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  @Post('process/unprocessed')
async processUnprocessedPosts() {
  try {
    const result = await this.fetchService.processUnprocessedPosts();
    return {
      success: true,
      message: `Processing complete: ${result.processed} posts processed, ${result.errors} errors`,
      data: result
    };
  } catch (error) {
    return {
      success: false,
      message: 'Processing failed',
      error: error.message
    };
  }
}
  
}