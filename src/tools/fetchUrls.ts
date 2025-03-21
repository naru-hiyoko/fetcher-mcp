import { chromium } from "playwright";
import { WebContentProcessor } from "../services/webContentProcessor.js";
import { FetchOptions, FetchResult } from "../types/index.js";

// Parse command line arguments, check for debug flag
const isDebugMode = process.argv.includes("--debug");

/**
 * Tool definition for fetch_urls
 */
export const fetchUrlsTool = {
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
      waitForNavigation: {
        type: "boolean",
        description:
          "Whether to wait for additional navigation after initial page load (useful for sites with anti-bot verification), default is false",
      },
      navigationTimeout: {
        type: "number",
        description:
          "Maximum time to wait for additional navigation in milliseconds, default is 10000 (10 seconds)",
      },
      disableMedia: {
        type: "boolean",
        description:
          "Whether to disable media resources (images, stylesheets, fonts, media), default is true",
      },
    },
    required: ["urls"],
  }
};

/**
 * Implementation of the fetch_urls tool
 */
export async function fetchUrls(args: any) {
  const urls = (args?.urls as string[]) || [];
  if (!urls || !Array.isArray(urls) || urls.length === 0) {
    throw new Error("URLs parameter is required and must be a non-empty array");
  }

  const options: FetchOptions = {
    timeout: Number(args?.timeout) || 30000,
    waitUntil: String(args?.waitUntil || "load") as 'load' | 'domcontentloaded' | 'networkidle' | 'commit',
    extractContent: args?.extractContent !== false,
    maxLength: Number(args?.maxLength) || 0,
    returnHtml: args?.returnHtml === true,
    waitForNavigation: args?.waitForNavigation === true,
    navigationTimeout: Number(args?.navigationTimeout) || 10000,
    disableMedia: args?.disableMedia !== false
  };

  let browser = null;
  try {
    browser = await chromium.launch({ headless: !isDebugMode });
    const context = await browser.newContext({
      javaScriptEnabled: true,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    });

    await context.route('**/*', async (route) => {
      const resourceType = route.request().resourceType();
      if (options.disableMedia && ['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
        await route.abort();
      } else {
        await route.continue();
      }
    });

    const processor = new WebContentProcessor(options, '[FetchURLs]');
    
    const results = await Promise.all(
      urls.map(async (url, index) => {
        const page = await context.newPage();
        try {
          const result = await processor.processPageContent(page, url);
          return { index, ...result } as FetchResult;
        } finally {
          if (!isDebugMode) {
            await page.close().catch(e => console.error(`[Error] Failed to close page: ${e.message}`));
          } else {
            console.log(`[Debug] Page kept open for debugging. URL: ${url}`);
          }
        }
      })
    );

    results.sort((a, b) => (a.index || 0) - (b.index || 0));
    const combinedResults = results
      .map((result, i) => `[webpage ${i + 1} begin]\n${result.content}\n[webpage ${i + 1} end]`)
      .join('\n\n');

    return {
      content: [{ type: "text", text: combinedResults }]
    };
  } finally {
    if (!isDebugMode) {
      if (browser) await browser.close().catch(e => console.error(`[Error] Failed to close browser: ${e.message}`));
    } else {
      console.log(`[Debug] Browser kept open for debugging. URLs: ${urls.join(', ')}`);
    }
  }
}