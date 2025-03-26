import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import TurndownService from "turndown";
import { FetchOptions, FetchResult } from "../types/index.js";
import { logger } from "../utils/logger.js";

export class WebContentProcessor {
  private options: FetchOptions;
  private logPrefix: string;

  constructor(options: FetchOptions, logPrefix: string = "") {
    this.options = options;
    this.logPrefix = logPrefix;
  }

  async processPageContent(page: any, url: string): Promise<FetchResult> {
    try {
      // Set timeout
      page.setDefaultTimeout(this.options.timeout);

      // Navigate to URL
      logger.info(`${this.logPrefix} Navigating to URL: ${url}`);
      await page.goto(url, {
        timeout: this.options.timeout,
        waitUntil: this.options.waitUntil,
      });

      // Handle possible anti-bot verification and redirection
      if (this.options.waitForNavigation) {
        logger.info(
          `${this.logPrefix} Waiting for possible navigation/redirection...`
        );

        try {
          // Create a promise to wait for page navigation events
          const navigationPromise = page.waitForNavigation({
            timeout: this.options.navigationTimeout,
            waitUntil: this.options.waitUntil,
          });

          // Set a timeout
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
              reject(new Error("Navigation timeout"));
            }, this.options.navigationTimeout);
          });

          // Wait for navigation event or timeout, whichever occurs first
          await Promise.race([navigationPromise, timeoutPromise])
            .then(() => {
              logger.info(
                `${this.logPrefix} Page navigated/redirected successfully`
              );
            })
            .catch((e) => {
              // If timeout occurs but page may have already loaded, we can continue
              logger.warn(
                `${this.logPrefix} No navigation occurred or navigation timeout: ${e.message}`
              );
            });
        } catch (navError: any) {
          logger.error(
            `${this.logPrefix} Error waiting for navigation: ${navError.message}`
          );
          // Continue processing the page even if there are navigation issues
        }
      }

      // Get page title
      const pageTitle = await page.title();
      logger.info(`${this.logPrefix} Page title: ${pageTitle}`);

      // Get HTML content
      const html = await page.content();

      if (!html) {
        logger.warn(`${this.logPrefix} Browser returned empty content`);
        return {
          success: false,
          content: `Title: Error\nURL: ${url}\nContent:\n\n<error>Failed to retrieve web page content: Browser returned empty content</error>`,
          error: "Browser returned empty content",
        };
      }

      logger.info(
        `${this.logPrefix} Successfully retrieved web page content, length: ${html.length}`
      );

      const processedContent = await this.processContent(html, url);

      // Format the response
      const formattedContent = `Title: ${pageTitle}\nURL: ${url}\nContent:\n\n${processedContent}`;

      return {
        success: true,
        content: formattedContent,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error(`${this.logPrefix} Error: ${errorMessage}`);

      return {
        success: false,
        content: `Title: Error\nURL: ${url}\nContent:\n\n<error>Failed to retrieve web page content: ${errorMessage}</error>`,
        error: errorMessage,
      };
    }
  }

  private async processContent(html: string, url: string): Promise<string> {
    let contentToProcess = html;

    // Extract main content if needed
    if (this.options.extractContent) {
      logger.info(`${this.logPrefix} Extracting main content`);
      const dom = new JSDOM(html, { url });
      const reader = new Readability(dom.window.document);
      const article = reader.parse();

      if (!article) {
        logger.warn(
          `${this.logPrefix} Could not extract main content, will use full HTML`
        );
      } else {
        contentToProcess = article.content;
        logger.info(
          `${this.logPrefix} Successfully extracted main content, length: ${contentToProcess.length}`
        );
      }
    }

    // Convert to markdown if needed
    let processedContent = contentToProcess;
    if (!this.options.returnHtml) {
      logger.info(`${this.logPrefix} Converting to Markdown`);
      const turndownService = new TurndownService();
      processedContent = turndownService.turndown(contentToProcess);
      logger.info(
        `${this.logPrefix} Successfully converted to Markdown, length: ${processedContent.length}`
      );
    }

    // Truncate if needed
    if (
      this.options.maxLength > 0 &&
      processedContent.length > this.options.maxLength
    ) {
      logger.info(
        `${this.logPrefix} Content exceeds maximum length, will truncate to ${this.options.maxLength} characters`
      );
      processedContent = processedContent.substring(0, this.options.maxLength);
    }

    return processedContent;
  }
}
