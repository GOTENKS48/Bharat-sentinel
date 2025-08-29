import { Injectable } from '@nestjs/common';
import Sentiment from 'sentiment';
import compromise from 'compromise';

@Injectable()
export class NlpClassificationService {
  private sentiment: any;
  
  constructor() {
    this.sentiment = new Sentiment();
  }

  /**
   * Analyze sentiment of text
   */
  analyzeSentiment(text: string): { 
    score: number; 
    comparative: number; 
    label: 'positive' | 'negative' | 'neutral';
    confidence: number;
  } {
    const result = this.sentiment.analyze(text);
    
    let label: 'positive' | 'negative' | 'neutral' = 'neutral';
    if (result.score > 0) label = 'positive';
    else if (result.score < 0) label = 'negative';
    
    // Calculate confidence based on comparative score (normalized)
    const confidence = Math.min(Math.abs(result.comparative) * 2, 1);
    
    return {
      score: result.score,
      comparative: result.comparative,
      label,
      confidence: Math.round(confidence * 100) / 100
    };
  }

  /**
   * Classify content as anti-India, neutral, or pro-India
   */
  classifyIndiaNarrative(text: string, cleanText: string): {
    classification: 'anti-india' | 'neutral' | 'pro-india';
    confidence: number;
    keywords: string[];
  } {
    const lowerText = cleanText.toLowerCase();
    
    // Anti-India keywords and phrases
    const antiIndiaKeywords = [
      'boycott india', 'hate india', 'india bad', 'corrupt india', 'fascist india',
      'modi dictatorship', 'hindutva', 'islamophobia', 'persecution', 'genocide',
      'human rights violations', 'kashmir occupation', 'oppression', 'authoritarian',
      'propaganda state', 'fake democracy', 'religious intolerance'
    ];
    
    // Pro-India keywords and phrases
    const proIndiaKeywords = [
      'proud india', 'incredible india', 'love india', 'great india', 'strong india',
      'vibrant democracy', 'cultural heritage', 'unity in diversity', 'progress',
      'development', 'economic growth', 'innovation hub', 'spiritual land',
      'incredible culture', 'ancient wisdom', 'democratic values'
    ];
    
    let antiScore = 0;
    let proScore = 0;
    const foundKeywords: string[] = [];
    
    // Check for anti-India keywords
    antiIndiaKeywords.forEach(keyword => {
      if (lowerText.includes(keyword)) {
        antiScore += 1;
        foundKeywords.push(keyword);
      }
    });
    
    // Check for pro-India keywords  
    proIndiaKeywords.forEach(keyword => {
      if (lowerText.includes(keyword)) {
        proScore += 1;
        foundKeywords.push(keyword);
      }
    });
    
    // Determine classification
    let classification: 'anti-india' | 'neutral' | 'pro-india' = 'neutral';
    let confidence = 0.1; // Low confidence for neutral
    
    if (antiScore > proScore && antiScore > 0) {
      classification = 'anti-india';
      confidence = Math.min(antiScore * 0.3, 0.9);
    } else if (proScore > antiScore && proScore > 0) {
      classification = 'pro-india';
      confidence = Math.min(proScore * 0.3, 0.9);
    } else if (antiScore === 0 && proScore === 0) {
      confidence = 0.8; // High confidence it's neutral if no keywords found
    }
    
    return {
      classification,
      confidence: Math.round(confidence * 100) / 100,
      keywords: foundKeywords
    };
  }

  /**
   * Extract named entities (people, places, organizations)
   */
  extractEntities(text: string): {
    people: string[];
    places: string[];
    organizations: string[];
    topics: string[];
  } {
    const doc = compromise(text);
    
    return {
      people: doc.people().out('array') || [],
      places: doc.places().out('array') || [],
      organizations: doc.organizations().out('array') || [],
      topics: doc.topics().out('array') || []
    };
  }

  /**
   * Detect potential toxicity/hate speech
   */
  detectToxicity(text: string): {
    isToxic: boolean;
    confidence: number;
    reasons: string[];
  } {
    const lowerText = text.toLowerCase();
    
    const toxicKeywords = [
      'hate', 'kill', 'destroy', 'terrorist', 'enemy', 'scum', 'vermin',
      'traitor', 'betrayer', 'cancer', 'virus', 'plague', 'filth',
      'garbage', 'trash', 'worthless', 'inferior', 'subhuman'
    ];
    
    const foundToxic: string[] = [];
    let toxicScore = 0;
    
    toxicKeywords.forEach(keyword => {
      if (lowerText.includes(keyword)) {
        toxicScore += 1;
        foundToxic.push(keyword);
      }
    });
    
    const isToxic = toxicScore > 0;
    const confidence = isToxic ? Math.min(toxicScore * 0.4, 0.9) : 0.9;
    
    return {
      isToxic,
      confidence: Math.round(confidence * 100) / 100,
      reasons: foundToxic
    };
  }

  /**
   * Complete NLP analysis combining all methods
   */
  analyzeText(rawText: string, cleanText: string): {
    sentiment: any;
    indiaClassification: any;
    entities: any;
    toxicity: any;
  } {
    return {
      sentiment: this.analyzeSentiment(cleanText),
      indiaClassification: this.classifyIndiaNarrative(rawText, cleanText),
      entities: this.extractEntities(rawText),
      toxicity: this.detectToxicity(cleanText)
    };
  }
}