import { Injectable } from '@nestjs/common';
import * as francLib from 'franc';
const franc = francLib.franc;
import { removeStopwords, eng, hin } from 'stopword';
import { NlpClassificationService } from './nlp-classification.service';

@Injectable()
export class TextProcessingService {
  
  constructor(private readonly nlpClassification: NlpClassificationService) {}

  /**
   * Process text and extract all metadata + NLP analysis
   */
  processText(rawText: string): {
    cleanText: string;
    hashtags: string[];
    mentions: string[];
    urls: string[];
    language: string;
    languageConfidence: number;
    // NLP fields
    sentimentScore: number;
    sentimentLabel: string;
    sentimentConfidence: number;
    indiaClassification: string;
    indiaConfidence: number;
    indiaKeywords: string[];
    entitiesPeople: string[];
    entitiesPlaces: string[];
    entitiesOrganizations: string[];
    isToxic: boolean;
    toxicityConfidence: number;
    toxicityReasons: string[];
  } {
    // Extract metadata before cleaning
    const hashtags = this.extractHashtags(rawText);
    const mentions = this.extractMentions(rawText);
    const urls = this.extractUrls(rawText);
    
    // Clean the text
    const cleanText = this.cleanText(rawText);
    
    // Detect language
    const { language, confidence } = this.detectLanguage(cleanText);
    
    // NEW: Run NLP analysis
    const nlpAnalysis = this.nlpClassification.analyzeText(rawText, cleanText);
    
    return {
      cleanText,
      hashtags,
      mentions,
      urls,
      language,
      languageConfidence: confidence,
      // Add NLP results
      sentimentScore: nlpAnalysis.sentiment.score,
      sentimentLabel: nlpAnalysis.sentiment.label,
      sentimentConfidence: nlpAnalysis.sentiment.confidence,
      indiaClassification: nlpAnalysis.indiaClassification.classification,
      indiaConfidence: nlpAnalysis.indiaClassification.confidence,
      indiaKeywords: nlpAnalysis.indiaClassification.keywords,
      entitiesPeople: nlpAnalysis.entities.people,
      entitiesPlaces: nlpAnalysis.entities.places,
      entitiesOrganizations: nlpAnalysis.entities.organizations,
      isToxic: nlpAnalysis.toxicity.isToxic,
      toxicityConfidence: nlpAnalysis.toxicity.confidence,
      toxicityReasons: nlpAnalysis.toxicity.reasons
    };
  }

  /**
   * Clean text by removing URLs, hashtags, mentions, and normalizing
   */
  cleanText(text: string): string {
    return text
      .replace(/https?:\/\/[^\s]+/g, '') // Remove URLs
      .replace(/#\w+/g, '') // Remove hashtags completely
      .replace(/@\w+/g, '') // Remove mentions
      .replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '') // Remove emojis
      .replace(/[^\w\s]/g, ' ') // Remove special characters but keep alphanumeric and spaces
      .replace(/\s+/g, ' ') // Normalize whitespace
      .toLowerCase()
      .trim();
  }

  /**
   * Extract hashtags from text
   */
  private extractHashtags(text: string): string[] {
    const hashtagRegex = /#(\w+)/g;
    const hashtags: string[] = [];
    let match;
    
    while ((match = hashtagRegex.exec(text)) !== null) {
      hashtags.push(match[1].toLowerCase());
    }
    
    return [...new Set(hashtags)]; // Remove duplicates
  }

  /**
   * Extract mentions from text
   */
  private extractMentions(text: string): string[] {
    const mentionRegex = /@(\w+)/g;
    const mentions: string[] = [];
    let match;
    
    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[1].toLowerCase());
    }
    
    return [...new Set(mentions)]; // Remove duplicates
  }

  /**
   * Extract URLs from text
   */
  private extractUrls(text: string): string[] {
    const urlRegex = /https?:\/\/[^\s]+/g;
    const urls = text.match(urlRegex) || [];
    
    return [...new Set(urls)]; // Remove duplicates
  }

  /**
   * Detect language using franc
   */
  private detectLanguage(text: string): { language: string; confidence: number } {
    if (text.length < 10) {
      return { language: 'und', confidence: 0 }; // undefined for very short text
    }
    
    const detected = franc(text);
    
    // Franc returns ISO 639-3 codes, convert to more common codes
    const languageMap: { [key: string]: string } = {
      'eng': 'en',
      'hin': 'hi',
      'pan': 'pa', // Punjabi
      'urd': 'ur', // Urdu
      'ben': 'bn', // Bengali
      'und': 'unknown'
    };
    
    const language = languageMap[detected] || detected;
    
    // Calculate rough confidence based on text length and detection result
    const confidence = detected === 'und' ? 0 : Math.min(0.95, text.length / 100);
    
    return { language, confidence };
  }
}