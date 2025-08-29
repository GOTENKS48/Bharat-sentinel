// src/fetch/fetch.service.ts
import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import Parser from 'rss-parser';
import { SupabaseService } from 'src/supabase/supabase.service';
import * as crypto from 'crypto';
import { TextProcessingService } from '../text-processing.service';

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
  batch_id: string; // Add batch_id to interface
}

@Injectable()
export class FetchService {
  public logger = new Logger('FetchService');
  public rssParser: Parser;

  constructor(private supabaseService: SupabaseService,  private readonly textProcessingService: TextProcessingService) {
    this.rssParser = new Parser({ timeout: 10000 });
  }

  private get supabase() {
    return this.supabaseService.getClient();
  }
 
  // Generate a unique batch ID for each fetch operation
 private generateBatchId(): string {
  return `batch_${Date.now()}_${uuidv4().slice(0, 8)}`;
}

  // Helper function to deduplicate media URLs
  public deduplicateMediaUrls(urls: string[]): string[] {
    const seen = new Set();
    return urls.filter(url => {
      if (!url) return false;
      const normalizedUrl = url.split('?')[0].split('#')[0];
      if (seen.has(normalizedUrl)) {
        return false;
      }
      seen.add(normalizedUrl);
      return true;
    });
  }

  // Generate a content hash for duplicate detection
  private generateContentHash(text: string, author: string, source: string): string {
    const content = `${text}-${author}-${source}`;
    return crypto.createHash('md5').update(content).digest('hex');
  }

  // -------------------------
  // MOCK DATA GENERATORS
  // -------------------------
  // Update all mock data generators to use uuidv4()
public getMockXData(query: string, limit: number): any[] {
  const mocks = [
    `Breaking news about ${query} spreading on social media.`,
    `Controversial opinion: ${query} is harming India's image.`,
    `Supporters and critics clash online over ${query}.`,
    `Trending hashtag #${query.replace(/\s+/g, '')} gaining traction.`,
    `Analysis: How ${query} narratives are being pushed by bots.`
  ];

  return mocks.slice(0, limit).map((text, idx) => ({
    id: uuidv4(), // FIXED: Use uuidv4() instead of mock_tweet_1
    text,
    author: `mock_user_${idx + 1}`,
    link: `https://x.com/mock/status/${idx + 1}`,
    media_urls: [],
    created_at: new Date(Date.now() - idx * 60000).toISOString(),
    content_hash: this.generateContentHash(text, `mock_user_${idx + 1}`, 'X')
  }));
}

public getMockRedditData(query: string, limit: number): any[] {
  const mocks = [
    `Discussion: The rise of ${query} narratives on social media.`,
    `Why ${query} is being used for propaganda purposes.`,
    `Data shows ${query} is trending internationally.`,
    `Communities reacting to ${query} campaigns.`,
    `Long-term impact of ${query} on India's reputation.`
  ];

  return mocks.slice(0, limit).map((text, idx) => ({
    id: uuidv4(), // FIXED: Use uuidv4() instead of mock_reddit_1
    text,
    author: `mock_redditor_${idx + 1}`,
    link: `https://reddit.com/r/mock/comments/${idx + 1}`,
    media_urls: [],
    created_at: new Date(Date.now() - idx * 90000).toISOString(),
    content_hash: this.generateContentHash(text, `mock_redditor_${idx + 1}`, 'Reddit')
  }));
}

public getMockYouTubeData(query: string, limit: number): any[] {
  const mocks = [
    `Explainer video: What is ${query}?`,
    `The truth behind ${query} campaigns.`,
    `Is ${query} being exaggerated by media outlets?`,
    `Watch: Experts debate ${query}.`,
    `Documentary: Inside the ${query} movement.`
  ];

  return mocks.slice(0, limit).map((title, idx) => {
    return {
      id: uuidv4(), // FIXED: Use uuidv4() instead of mock_yt_1
      text: title,
      author: `MockChannel${idx + 1}`,
      link: `https://youtube.com/watch?v=mock${idx + 1}`,
      media_urls: [],
      created_at: new Date(Date.now() - idx * 120000).toISOString(),
      content_hash: this.generateContentHash(title, `MockChannel${idx + 1}`, 'YouTube')
    };
  });
}

  // -------------------------
  // API FETCHERS (RETURN RAW DATA WITHOUT DB SAVING)
  // -------------------------
  public async fetchXPosts(query: string, limit = 5): Promise<any[]> {
    if (!process.env.X_BEARER_TOKEN) return this.getMockXData(query, limit);

    try {
      const response = await axios.get('https://api.twitter.com/2/tweets/search/recent', {
        params: {
          query,
          max_results: limit,
          'tweet.fields': 'created_at,author_id,attachments',
          expansions: 'author_id,attachments.media_keys',
          'media.fields': 'url,type,preview_image_url,variants'
        },
        headers: { 'Authorization': `Bearer ${process.env.X_BEARER_TOKEN}` },
        timeout: 15000
      });

      if (!response.data || !response.data.data) {
        return this.getMockXData(query, limit);
      }

      const users = response.data.includes?.users || [];
      const media = response.data.includes?.media || [];

      return response.data.data.map((tweet: any) => {
        const author = users.find((u: any) => u.id === tweet.author_id);
        const media_urls: string[] = [];
        
        if (tweet.attachments?.media_keys) {
          tweet.attachments.media_keys.forEach((key: string) => {
            const mediaItem = media.find((m: any) => m.media_key === key);
            if (mediaItem) {
              if (mediaItem.url) media_urls.push(mediaItem.url);
              if (mediaItem.type === 'video' || mediaItem.type === 'animated_gif') {
                if (mediaItem.variants && mediaItem.variants.length > 0) {
                  const videoVariants = mediaItem.variants
                    .filter((v: any) => v.content_type === 'video/mp4')
                    .sort((a: any, b: any) => (b.bit_rate || 0) - (a.bit_rate || 0));
                  if (videoVariants.length > 0) media_urls.push(videoVariants[0].url);
                }
                if (mediaItem.preview_image_url && mediaItem.preview_image_url !== mediaItem.url) {
                  media_urls.push(mediaItem.preview_image_url);
                }
              }
            }
          });
        }

        const uniqueMediaUrls = this.deduplicateMediaUrls(media_urls);
        const authorName = author ? author.username : 'unknown';
        const contentHash = this.generateContentHash(tweet.text, authorName, 'X');

        return {
          id: tweet.id,
          text: tweet.text,
          author: authorName,
          link: `https://x.com/${authorName}/status/${tweet.id}`,
          media_urls: uniqueMediaUrls,
          created_at: tweet.created_at,
          content_hash: contentHash
        };
      });
    } catch (err) {
      this.logger.error('Error fetching X posts, using mock', err);
      return this.getMockXData(query, limit);
    }
  }

  public async fetchRedditPosts(query: string, limit = 5): Promise<any[]> {
    if (!process.env.REDDIT_CLIENT_ID || !process.env.REDDIT_CLIENT_SECRET) return this.getMockRedditData(query, limit);

    try {
      const tokenResponse = await axios.post(
        'https://www.reddit.com/api/v1/access_token',
        new URLSearchParams({
          grant_type: 'password',
          username: process.env.REDDIT_USERNAME || '',
          password: process.env.REDDIT_PASSWORD || ''
        }),
        {
          headers: {
            'Authorization': `Basic ${Buffer.from(`${process.env.REDDIT_CLIENT_ID}:${process.env.REDDIT_CLIENT_SECRET}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'BharatSentinel/1.0'
          }
        }
      );

      const token = tokenResponse.data.access_token;
      const response = await axios.get('https://oauth.reddit.com/search', {
        params: { q: query, limit, sort: 'relevance', type: 'link' },
        headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'BharatSentinel/1.0' }
      });

      if (!response.data || !response.data.data || !response.data.data.children) {
        return this.getMockRedditData(query, limit);
      }

      return response.data.data.children.map((c: any) => {
        const p = c.data;
        const media_urls: string[] = [];
        
        if (p.url && !p.url.includes('reddit.com')) media_urls.push(p.url);
        if (p.preview?.images?.length) {
          p.preview.images.forEach((img: any) => {
            try {
              const decodedUrl = decodeURIComponent(img.source.url.replace(/&amp;/g, '&'));
              media_urls.push(decodedUrl);
            } catch (e) {
              this.logger.warn('Failed to decode Reddit image URL', img.source.url);
            }
          });
        }
        if (p.media && p.media.reddit_video) media_urls.push(p.media.reddit_video.fallback_url);
        if (p.crosspost_parent_list && p.crosspost_parent_list.length > 0) {
          const crosspost = p.crosspost_parent_list[0];
          if (crosspost.media && crosspost.media.reddit_video) {
            media_urls.push(crosspost.media.reddit_video.fallback_url);
          }
        }

        const uniqueMediaUrls = this.deduplicateMediaUrls(media_urls);
        const contentText = `${p.title} ${p.selftext || ''}`.substring(0, 500);
        const contentHash = this.generateContentHash(contentText, p.author, 'Reddit');

        return {
          id: p.id,
          text: contentText,
          author: p.author,
          link: p.permalink.startsWith('http') ? p.permalink : `https://reddit.com${p.permalink}`,
          media_urls: uniqueMediaUrls,
          created_at: new Date((p.created_utc || 0) * 1000).toISOString(),
          content_hash: contentHash
        };
      });
    } catch (err) {
      this.logger.error('Error fetching Reddit posts, using mock', err);
      return this.getMockRedditData(query, limit);
    }
  }

  public async fetchYouTubeVideos(query: string, limit = 5): Promise<any[]> {
    if (!process.env.YOUTUBE_API_KEY) return this.getMockYouTubeData(query, limit);

    try {
      const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
        params: {
          part: 'snippet',
          maxResults: limit,
          q: query,
          type: 'video',
          key: process.env.YOUTUBE_API_KEY,
          order: 'relevance',
          regionCode: 'IN'
        }
      });

      if (!response.data || !response.data.items) {
        return this.getMockYouTubeData(query, limit);
      }

      return response.data.items.map((v: any) => {
        const videoUrl = `https://youtube.com/watch?v=${v.id.videoId}`;
        const thumbnailUrl = v.snippet.thumbnails?.high?.url || v.snippet.thumbnails?.default?.url;
        const media_urls: string[] = [videoUrl];
        
        if (thumbnailUrl && thumbnailUrl.startsWith('http') && thumbnailUrl !== videoUrl) {
          media_urls.push(thumbnailUrl);
        }

        const uniqueMediaUrls = this.deduplicateMediaUrls(media_urls);
        const contentText = `${v.snippet.title} ${v.snippet.description || ''}`.substring(0, 500);
        const contentHash = this.generateContentHash(contentText, v.snippet.channelTitle, 'YouTube');

        return {
          id: v.id.videoId,
          text: contentText,
          author: v.snippet.channelTitle,
          link: videoUrl,
          media_urls: uniqueMediaUrls,
          created_at: v.snippet.publishedAt,
          content_hash: contentHash
        };
      });
    } catch (err) {
      this.logger.error('Error fetching YouTube videos, using mock', err);
      return this.getMockYouTubeData(query, limit);
    }
  }

  // -------------------------
  // DATABASE OPERATIONS WITH BATCH ID
  // -------------------------
 public async upsertPostsToDB(posts: any[], batchId: string): Promise<void> {
  if (!posts || posts.length === 0) {
    this.logger.warn('No posts to save to database');
    return;
  }

  try {
    const postsData = posts.map(p => ({
      id: p.id,
      source: p.source,
      text: p.text,
      author: p.author,
      link: p.link,
      media_urls: p.media_urls,
      created_at: p.created_at,
      is_mock: p.is_mock || false,
      query: p.query,
      content_hash: p.content_hash,
      updated_at: new Date().toISOString(),
      batch_id: batchId
    }));

    const { error } = await this.supabase
      .from('posts')
      .upsert(postsData, {
        onConflict: 'content_hash',
        ignoreDuplicates: false
      });

    if (error) {
      this.logger.error('Error upserting posts to Supabase', error);
      throw error;
    }

    // AUTO-PROCESS THE POSTS WE JUST INSERTED
    try {
      this.logger.log('Auto-processing newly inserted posts...');
      
      for (const post of postsData) {
        try {
          const processedData = this.textProcessingService.processText(post.text);
          
          await this.supabase
            .from('posts')
            .update({
              clean_text: processedData.cleanText,
              hashtags: processedData.hashtags,
              mentions: processedData.mentions,
              urls: processedData.urls,
              language_detected: processedData.language,
              language_confidence: processedData.languageConfidence,
              // ADD ALL NLP FIELDS HERE:
              sentiment_score: processedData.sentimentScore,
              sentiment_label: processedData.sentimentLabel,
              sentiment_confidence: processedData.sentimentConfidence,
              india_classification: processedData.indiaClassification,
              india_confidence: processedData.indiaConfidence,
              india_keywords: processedData.indiaKeywords,
              entities_people: processedData.entitiesPeople,
              entities_places: processedData.entitiesPlaces,
              entities_organizations: processedData.entitiesOrganizations,
              is_toxic: processedData.isToxic,
              toxicity_confidence: processedData.toxicityConfidence,
              toxicity_reasons: processedData.toxicityReasons,
              processed_at: new Date().toISOString()
            })
            .eq('id', post.id);
            
        } catch (err) {
          this.logger.error(`Error auto-processing post ${post.id}:`, err);
        }
      }
      
      this.logger.log('Auto-processing complete');
    } catch (err) {
      this.logger.error('Error in auto-processing:', err);
    }

    this.logger.log(`Successfully upserted ${posts.length} posts to Supabase with batch ID: ${batchId}`);
  } catch (err) {
    this.logger.error('Unexpected error upserting posts to Supabase', err);
    throw err;
  }
}
  // -------------------------
  // PUBLIC METHODS FOR CONTROLLER (THESE SAVE TO DB WITH BATCH ID)
  // -------------------------
  public async fetchAndSaveXPosts(query: string, limit = 5): Promise<{savedPosts: any[], dbPosts: Post[], batchId: string}> {
  const batchId = this.generateBatchId();
  const posts = await this.fetchXPosts(query, limit);
  const postsForDb = posts.map(p => ({
    ...p,
    source: 'X',
    is_mock: p.id.startsWith('mock'),
    query: query
  }));
  
  await this.upsertPostsToDB(postsForDb, batchId);
  
  // Get all posts with this batch ID from database
  const dbPosts = await this.getPostsByBatchId(batchId);
  
  return {
    savedPosts: postsForDb,
    dbPosts: dbPosts,
    batchId: batchId
  };
}
public async fetchAndSaveRedditPosts(query: string, limit = 5): Promise<{savedPosts: any[], dbPosts: Post[], batchId: string}> {
  const batchId = this.generateBatchId();
  const posts = await this.fetchRedditPosts(query, limit);
  const postsForDb = posts.map(p => ({
    ...p,
    source: 'Reddit',
    is_mock: p.id.startsWith('mock'),
    query: query
  }));
  
  await this.upsertPostsToDB(postsForDb, batchId);
  
  // Get all posts with this batch ID from database
  const dbPosts = await this.getPostsByBatchId(batchId);
  
  return {
    savedPosts: postsForDb,
    dbPosts: dbPosts,
    batchId: batchId
  };
}

  public async fetchAndSaveYouTubePosts(query: string, limit = 5): Promise<{savedPosts: any[], dbPosts: Post[], batchId: string}> {
  const batchId = this.generateBatchId();
  const posts = await this.fetchYouTubeVideos(query, limit);
  const postsForDb = posts.map(p => ({
    ...p,
    source: 'Youtube',
    is_mock: p.id.startsWith('mock'),
    query: query
  }));
  
  await this.upsertPostsToDB(postsForDb, batchId);
  
  // Get all posts with this batch ID from database
  const dbPosts = await this.getPostsByBatchId(batchId);
  
  return {
    savedPosts: postsForDb,
    dbPosts: dbPosts,
    batchId: batchId
  };
}


  public async fetchAndSaveAllPosts(query: string, limitPerPlatform = 5): Promise<{savedPosts: any[], dbPosts: Post[], batchId: string}> {
    const batchId = this.generateBatchId();
    const [xPosts, redditPosts, ytPosts] = await Promise.all([
      this.fetchXPosts(query, limitPerPlatform),
      this.fetchRedditPosts(query, limitPerPlatform),
      this.fetchYouTubeVideos(query, limitPerPlatform)
    ]);

    const allPosts = [
      ...xPosts.map(p => ({ ...p, source: 'X', is_mock: p.id.startsWith('mock'), query })),
      ...redditPosts.map(p => ({ ...p, source: 'Reddit', is_mock: p.id.startsWith('mock'), query })),
      ...ytPosts.map(p => ({ ...p, source: 'YouTube', is_mock: p.id.startsWith('mock'), query }))
    ].map(p => ({
      ...p,
      id: uuidv4(),
      media_urls: this.deduplicateMediaUrls(p.media_urls || [])
    }));

    await this.upsertPostsToDB(allPosts, batchId);
    
    // Get all posts with this batch ID from database
    const dbPosts = await this.getPostsByBatchId(batchId);
    
    return {
      savedPosts: allPosts,
      dbPosts: dbPosts,
      batchId: batchId
    };
  }

  // Get posts by batch ID
  public async getPostsByBatchId(batchId: string): Promise<Post[]> {
    try {
      const { data, error } = await this.supabase
        .from('posts')
        .select('*')
        .eq('batch_id', batchId)
        .order('created_at', { ascending: false });

      if (error) {
        this.logger.error('Error fetching posts by batch ID from Supabase', error);
        return [];
      }

      this.logger.log(`Retrieved ${data?.length || 0} posts for batch ID: ${batchId}`);
      return data as Post[];
    } catch (err) {
      this.logger.error('Unexpected error fetching posts by batch ID from Supabase', err);
      return [];
    }
  }

  // Get posts from database sorted by creation date (newest first)
  public async getPostsFromDB(query?: string, limit = 50): Promise<Post[]> {
    try {
      let supabaseQuery = this.supabase
        .from('posts')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (query) {
        supabaseQuery = supabaseQuery.ilike('query', `%${query}%`);
      }

      const { data, error } = await supabaseQuery;

      if (error) {
        this.logger.error('Error fetching posts from Supabase', error);
        return [];
      }

      return data as Post[];
    } catch (err) {
      this.logger.error('Unexpected error fetching posts from Supabase', err);
      return [];
    }
  }
  // Add this method to your fetch.service.ts

// Get posts from the most recent batch (optionally filtered by query)
// Add this method to your fetch.service.ts

// Add this method to your fetch.service.ts

// Get posts from the most recent batch (optionally filtered by query)
public async getLatestBatchPosts(): Promise<{posts: Post[], batchId: string | null}> {
  try {
    // Get the most recent batch ID
    const { data: batchData, error } = await this.supabase
      .from('posts')
      .select('batch_id')
      .order('updated_at', { ascending: false })
      .limit(1);

    if (error || !batchData || batchData.length === 0) {
      this.logger.log('No batches found in database');
      return { posts: [], batchId: null };
    }

    const latestBatchId = batchData[0].batch_id;

    // Get all posts with this batch ID
    const { data: posts, error: postsError } = await this.supabase
      .from('posts')
      .select('*')
      .eq('batch_id', latestBatchId)
      .order('created_at', { ascending: false });

    if (postsError) {
      this.logger.error('Error fetching posts from latest batch', postsError);
      return { posts: [], batchId: latestBatchId };
    }

    this.logger.log(`Retrieved ${posts?.length || 0} posts from latest batch: ${latestBatchId}`);
    return { 
      posts: posts as Post[] || [], 
      batchId: latestBatchId 
    };
  } catch (err) {
    this.logger.error('Unexpected error fetching latest batch posts', err);
    return { posts: [], batchId: null };
  }
}


// Get all batches with their metadata (for debugging)
public async getAllBatches(): Promise<{batches: Array<{batchId: string, count: number, sources: string[], latestUpdate: string, query: string}>, total: number}> {
  try {
    const { data: allPosts, error } = await this.supabase
      .from('posts')
      .select('batch_id, updated_at, source, query')
      .order('updated_at', { ascending: false });

    if (error) {
      this.logger.error('Error fetching all posts for batch analysis', error);
      return { batches: [], total: 0 };
    }

    if (!allPosts || allPosts.length === 0) {
      return { batches: [], total: 0 };
    }

    // Group by batch_id
    const batchMap = new Map<string, {
      count: number;
      sources: Set<string>;
      latestUpdate: Date;
      query: string;
    }>();

    allPosts.forEach(post => {
      const batchId = post.batch_id;
      const updatedAt = new Date(post.updated_at);
      
      if (!batchMap.has(batchId)) {
        batchMap.set(batchId, {
          count: 0,
          sources: new Set(),
          latestUpdate: updatedAt,
          query: post.query || ''
        });
      }
      
      const batch = batchMap.get(batchId)!;
      batch.count++;
      batch.sources.add(post.source);
      
      if (updatedAt > batch.latestUpdate) {
        batch.latestUpdate = updatedAt;
      }
    });

    // Convert to array and sort by latest update
    const batches = Array.from(batchMap.entries())
      .map(([batchId, data]) => ({
        batchId,
        count: data.count,
        sources: Array.from(data.sources),
        latestUpdate: data.latestUpdate.toISOString(),
        query: data.query
      }))
      .sort((a, b) => new Date(b.latestUpdate).getTime() - new Date(a.latestUpdate).getTime());

    return { batches, total: batches.length };

  } catch (err) {
    this.logger.error('Unexpected error fetching all batches', err);
    return { batches: [], total: 0 };
  }
}
// Process unprocessed posts
public async processUnprocessedPosts(): Promise<{ processed: number; errors: number }> {
  try {
    // Get all posts that haven't been processed yet
    const { data: unprocessedPosts, error } = await this.supabase
      .from('posts')
      .select('*')
      .is('processed_at', null)
      .limit(100); // Process 100 at a time

    if (error) throw error;

    let processed = 0;
    let errors = 0;

    for (const post of unprocessedPosts || []) {
      try {
        // Process the text
        const processedData = this.textProcessingService.processText(post.text);
        
        // Update the post in database
        const { error: updateError } = await this.supabase
          .from('posts')
          .update({
            clean_text: processedData.cleanText,
            hashtags: processedData.hashtags,
            mentions: processedData.mentions,
            urls: processedData.urls,
            language_detected: processedData.language,
            language_confidence: processedData.languageConfidence,
            processed_at: new Date().toISOString()
          })
          .eq('id', post.id);

        if (updateError) throw updateError;
        processed++;
        this.logger.log(`Processed post ${post.id}`);
      } catch (err) {
        this.logger.error(`Error processing post ${post.id}:`, err);
        errors++;
      }
    }

    this.logger.log(`Processing complete: ${processed} processed, ${errors} errors`);
    return { processed, errors };
  } catch (error) {
    this.logger.error('Error in processUnprocessedPosts:', error);
    throw error;
  }
}
}