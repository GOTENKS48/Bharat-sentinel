// src/types/rss-parser.d.ts
declare module 'rss-parser' {
  interface ParserOptions {
    timeout?: number;
    customFields?: {
      item?: string[];
    };
  }

  interface Parser {
    new (options?: ParserOptions): Parser;
    parseURL(url: string): Promise<{
      items: Array<{
        title: string;
        link: string;
        pubDate: string;
        content: string;
        guid: string;
        [key: string]: any;
      }>;
    }>;
  }

  const Parser: Parser;
  export = Parser;
}