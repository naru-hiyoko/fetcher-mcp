#!/usr/bin/env node

/**
 * MCP server based on Playwright headless browser
 * Provides functionality to fetch web page content
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { chromium } from "playwright";
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import TurndownService from "turndown";

// Parse command line arguments, check for debug flag
const isDebugMode = process.argv.includes("--debug");

interface FetchOptions {
  timeout: number;
  waitUntil: 'load' | 'domcontentloaded' | 'networkidle' | 'commit';
  extractContent: boolean;
  maxLength: number;
  returnHtml: boolean;
}

interface FetchResult {
  success: boolean;
  content: string;
  error?: string;
}

class WebContentProcessor {
  private options: FetchOptions;
  private logPrefix: string;

  constructor(options: FetchOptions, logPrefix: string = '') {
    this.options = options;
    this.logPrefix = logPrefix;
  }

  async processPageContent(page: any, url: string): Promise<FetchResult> {
    try {
      // Set timeout
      page.setDefaultTimeout(this.options.timeout);

      // Navigate to URL
      console.error(`${this.logPrefix} Navigating to URL: ${url}`);
      await page.goto(url, {
        timeout: this.options.timeout,
        waitUntil: this.options.waitUntil,
      });

      // Get page title
      const pageTitle = await page.title();
      console.error(`${this.logPrefix} Page title: ${pageTitle}`);

      // Get HTML content
      const html = await page.content();

      if (!html) {
        console.error(`${this.logPrefix} Browser returned empty content`);
        return {
          success: false,
          content: `Title: Error\nURL: ${url}\nContent:\n\n<error>Failed to retrieve web page content: Browser returned empty content</error>`,
          error: "Browser returned empty content"
        };
      }

      console.error(`${this.logPrefix} Successfully retrieved web page content, length: ${html.length}`);

      const processedContent = await this.processContent(html, url);
      
      // Format the response
      const formattedContent = `Title: ${pageTitle}\nURL: ${url}\nContent:\n\n${processedContent}`;

      return {
        success: true,
        content: formattedContent
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error(`${this.logPrefix} Error: ${errorMessage}`);
      
      return {
        success: false,
        content: `Title: Error\nURL: ${url}\nContent:\n\n<error>Failed to retrieve web page content: ${errorMessage}</error>`,
        error: errorMessage
      };
    }
  }

  private async processContent(html: string, url: string): Promise<string> {
    let contentToProcess = html;
    
    // Extract main content if needed
    if (this.options.extractContent) {
      console.error(`${this.logPrefix} Extracting main content`);
      const dom = new JSDOM(html, { url });
      const reader = new Readability(dom.window.document);
      const article = reader.parse();

      if (!article) {
        console.error(`${this.logPrefix} Could not extract main content, will use full HTML`);
      } else {
        contentToProcess = article.content;
        console.error(`${this.logPrefix} Successfully extracted main content, length: ${contentToProcess.length}`);
      }
    }

    // Convert to markdown if needed
    let processedContent = contentToProcess;
    if (!this.options.returnHtml) {
      console.error(`${this.logPrefix} Converting to Markdown`);
      const turndownService = new TurndownService();
      processedContent = turndownService.turndown(contentToProcess);
      console.error(`${this.logPrefix} Successfully converted to Markdown, length: ${processedContent.length}`);
    }

    // Truncate if needed
    if (this.options.maxLength > 0 && processedContent.length > this.options.maxLength) {
      console.error(`${this.logPrefix} Content exceeds maximum length, will truncate to ${this.options.maxLength} characters`);
      processedContent = processedContent.substring(0, this.options.maxLength);
    }

    return processedContent;
  }
}

/**
 * Create MCP server
 */
const server = new Server(
  {
    name: "browser-mcp",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

/**
 * Handle tool list requests
 * Provides a fetch_url tool to retrieve web page content
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  console.error("[Tools] List available tools");
  return {
    tools: [
      {
        name: "fetch_url",
        description: "Retrieve web page content from a specified URL",
        inputSchema: {
          type: "object",
          properties: {
            url: {
              type: "string",
              description: "URL to fetch",
            },
            timeout: {
              type: "number",
              description:
                "Page loading timeout in milliseconds, default is 30000 (30 seconds)",
            },
            waitUntil: {
              type: "string",
              description:
                "Specifies when navigation is considered complete, options: 'load', 'domcontentloaded', 'networkidle', 'commit', default is 'load'",
            },
            extractContent: {
              type: "boolean",
              description:
                "Whether to intelligently extract the main content, default is true",
            },
            maxLength: {
              type: "number",
              description:
                "Maximum length of returned content (in characters), default is no limit",
            },
            returnHtml: {
              type: "boolean",
              description:
                "Whether to return HTML content instead of Markdown, default is false",
            },
          },
          required: ["url"],
        },
      },
      {
        name: "fetch_urls",
        description: "Retrieve web page content from multiple specified URLs",
        inputSchema: {
          type: "object",
          properties: {
            urls: {
              type: "array",
              items: {
                type: "string",
              },
              description: "Array of URLs to fetch",
            },
            timeout: {
              type: "number",
              description:
                "Page loading timeout in milliseconds, default is 30000 (30 seconds)",
            },
            waitUntil: {
              type: "string",
              description:
                "Specifies when navigation is considered complete, options: 'load', 'domcontentloaded', 'networkidle', 'commit', default is 'load'",
            },
            extractContent: {
              type: "boolean",
              description:
                "Whether to intelligently extract the main content, default is true",
            },
            maxLength: {
              type: "number",
              description:
                "Maximum length of returned content (in characters), default is no limit",
            },
            returnHtml: {
              type: "boolean",
              description:
                "Whether to return HTML content instead of Markdown, default is false",
            },
          },
          required: ["urls"],
        },
      },
    ],
  };
});

/**
 * Handle tool call requests
 * Implement the logic for the fetch_url tool
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  switch (request.params.name) {
    case "fetch_url": {
      const url = String(request.params.arguments?.url || "");
      if (!url) {
        console.error(`[Error] URL parameter missing`);
        throw new Error("URL parameter is required");
      }

      const options: FetchOptions = {
        timeout: Number(request.params.arguments?.timeout) || 30000,
        waitUntil: String(request.params.arguments?.waitUntil || "load") as 'load' | 'domcontentloaded' | 'networkidle' | 'commit',
        extractContent: request.params.arguments?.extractContent !== false,
        maxLength: Number(request.params.arguments?.maxLength) || 0,
        returnHtml: request.params.arguments?.returnHtml === true
      };

      const processor = new WebContentProcessor(options, '[FetchURL]');
      let browser = null;
      let page = null;

      try {
        browser = await chromium.launch({ headless: !isDebugMode });
        const context = await browser.newContext();
        page = await context.newPage();
        
        const result = await processor.processPageContent(page, url);
        
        return {
          content: [{ type: "text", text: result.content }]
        };
      } finally {
        if (page) await page.close().catch(e => console.error(`[Error] Failed to close page: ${e.message}`));
        if (browser) await browser.close().catch(e => console.error(`[Error] Failed to close browser: ${e.message}`));
      }
    }

    case "fetch_urls": {
      const urls = (request.params.arguments?.urls as string[]) || [];
      if (!urls || !Array.isArray(urls) || urls.length === 0) {
        throw new Error("URLs parameter is required and must be a non-empty array");
      }

      const options: FetchOptions = {
        timeout: Number(request.params.arguments?.timeout) || 30000,
        waitUntil: String(request.params.arguments?.waitUntil || "load") as 'load' | 'domcontentloaded' | 'networkidle' | 'commit',
        extractContent: request.params.arguments?.extractContent !== false,
        maxLength: Number(request.params.arguments?.maxLength) || 0,
        returnHtml: request.params.arguments?.returnHtml === true
      };

      let browser = null;
      try {
        browser = await chromium.launch({ headless: !isDebugMode });
        const context = await browser.newContext();
        const processor = new WebContentProcessor(options, '[FetchURLs]');
        
        const results = await Promise.all(
          urls.map(async (url, index) => {
            const page = await context.newPage();
            try {
              const result = await processor.processPageContent(page, url);
              return { index, ...result };
            } finally {
              await page.close().catch(e => console.error(`[Error] Failed to close page: ${e.message}`));
            }
          })
        );

        results.sort((a, b) => a.index - b.index);
        const combinedResults = results
          .map((result, i) => `[webpage ${i + 1} begin]\n${result.content}\n[webpage ${i + 1} end]`)
          .join('\n\n');

        return {
          content: [{ type: "text", text: combinedResults }]
        };
      } finally {
        if (browser) await browser.close().catch(e => console.error(`[Error] Failed to close browser: ${e.message}`));
      }
    }

    default:
      throw new Error(`Unknown tool: ${request.params.name}`);
  }
});

/**
 * Start the server
 */
async function main() {
  console.error("[Setup] Initializing browser MCP server...");

  if (isDebugMode) {
    console.error(
      "[Setup] Debug mode enabled, Chrome browser window will be visible"
    );
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[Setup] Server started");
}

main().catch((error) => {
  console.error("[Error] Server error:", error);
  process.exit(1);
});
