export interface FetchOptions {
    timeout: number;
    waitUntil: 'load' | 'domcontentloaded' | 'networkidle' | 'commit';
    extractContent: boolean;
    maxLength: number;
    returnHtml: boolean;
    waitForNavigation: boolean;
    navigationTimeout: number;
  }
  
  export interface FetchResult {
    success: boolean;
    content: string;
    error?: string;
    index?: number;
  }