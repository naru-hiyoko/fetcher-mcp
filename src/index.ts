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
      console.error(`[FetchURL] Fetching: ${request.params.arguments?.url}`);

      const url = String(request.params.arguments?.url || "");
      if (!url) {
        console.error(`[Error] URL parameter missing`);
        throw new Error("URL parameter is required");
      }

      // Default timeout is 30 seconds
      const timeout = Number(request.params.arguments?.timeout) || 30000;
      console.error(`[FetchURL] Setting timeout: ${timeout}ms`);

      // Wait until navigation condition, default is load complete
      const waitUntil = String(
        request.params.arguments?.waitUntil || "load"
      ) as "load" | "domcontentloaded" | "networkidle" | "commit";
      console.error(`[FetchURL] Wait condition: ${waitUntil}`);

      // Whether to extract main content, default is true
      const extractContent = request.params.arguments?.extractContent !== false;
      console.error(`[FetchURL] Extract content: ${extractContent}`);

      // Maximum content length, default is no limit
      const maxLength = Number(request.params.arguments?.maxLength) || 0;
      console.error(
        `[FetchURL] Maximum content length: ${maxLength || "no limit"}`
      );

      // Whether to return HTML instead of Markdown, default is false
      const returnHtml = request.params.arguments?.returnHtml === true;
      console.error(`[FetchURL] Return HTML: ${returnHtml}`);

      let browser = null;
      let page = null;

      try {
        // Launch browser, decide whether to show browser window based on debug mode
        console.error(
          `[FetchURL] Launching Playwright browser${
            isDebugMode ? " (debug mode)" : ""
          }`
        );
        browser = await chromium.launch({
          headless: !isDebugMode, // In debug mode, don't use headless mode, show Chrome window
        });

        // Create new page
        const context = await browser.newContext();
        page = await context.newPage();

        // Set timeout
        page.setDefaultTimeout(timeout);

        // Navigate to URL
        console.error(`[FetchURL] Navigating to URL: ${url}`);
        await page.goto(url, {
          timeout: timeout,
          waitUntil: waitUntil,
        });

        // Get page title
        const pageTitle = await page.title();
        console.error(`[FetchURL] Page title: ${pageTitle}`);

        // Get HTML content
        const html = await page.content();

        if (!html) {
          console.error(`[Warning] Browser returned empty content`);
          return {
            content: [
              {
                type: "text",
                text: "<error>Failed to retrieve web page content: Browser returned empty content</error>",
              },
            ],
          };
        }

        console.error(
          `[FetchURL] Successfully retrieved web page content, length: ${html.length}`
        );

        // Process content based on parameters
        let processedContent;
        let contentToProcess;

        // First, decide what content to process: full page or extracted main content
        if (extractContent) {
          // Extract main content
          console.error(`[FetchURL] Extracting main content`);
          const dom = new JSDOM(html, { url });
          const reader = new Readability(dom.window.document);
          const article = reader.parse();

          if (!article) {
            console.error(
              `[Warning] Could not extract main content, will use full HTML`
            );
            contentToProcess = html;
          } else {
            contentToProcess = article.content;
            console.error(
              `[FetchURL] Successfully extracted main content, length: ${contentToProcess.length}`
            );
          }
        } else {
          // Use full HTML
          contentToProcess = html;
        }

        // Then, decide whether to return HTML or convert to Markdown
        if (returnHtml) {
          // Return as HTML
          console.error(`[FetchURL] Returning HTML content`);
          processedContent = contentToProcess;
        } else {
          // Convert to Markdown
          console.error(`[FetchURL] Converting to Markdown`);
          const turndownService = new TurndownService();
          processedContent = turndownService.turndown(contentToProcess);
          console.error(
            `[FetchURL] Successfully converted to Markdown, length: ${processedContent.length}`
          );
        }

        // If maximum length is set, truncate content
        if (maxLength > 0 && processedContent.length > maxLength) {
          console.error(
            `[FetchURL] Content exceeds maximum length, will truncate to ${maxLength} characters`
          );
          processedContent = processedContent.substring(0, maxLength);
        }

        // Format the response according to the requested format
        const formattedResponse = `Title: ${pageTitle}
URL: ${url}
Content:

${processedContent}`;

        return {
          content: [
            {
              type: "text",
              text: formattedResponse,
            },
          ],
        };
      } catch (error) {
        let errorMessage = "Unknown error";

        if (error instanceof Error) {
          errorMessage = error.message;

          // Check if it's a timeout error
          if (
            errorMessage.includes("Timeout") ||
            errorMessage.includes("timeout")
          ) {
            console.error(`[Error] URL fetch timeout: ${timeout}ms elapsed`);
            return {
              content: [
                {
                  type: "text",
                  text: `<error>Web page content fetch timeout: Operation did not complete within ${timeout}ms</error>`,
                },
              ],
            };
          }
        }

        console.error(`[Error] Failed to fetch URL: ${errorMessage}`);
        return {
          content: [
            {
              type: "text",
              text: `<error>Failed to retrieve web page content: ${errorMessage}</error>`,
            },
          ],
        };
      } finally {
        // Ensure resources are released
        if (page) {
          console.error(`[FetchURL] Closing page`);
          await page
            .close()
            .catch((e) =>
              console.error(`[Error] Failed to close page: ${e.message}`)
            );
        }
        if (browser) {
          console.error(`[FetchURL] Closing browser`);
          await browser
            .close()
            .catch((e) =>
              console.error(`[Error] Failed to close browser: ${e.message}`)
            );
        }
      }
    }

    case "fetch_urls": {
      console.error(`[FetchURLs] Batch fetching multiple URLs`);

      const urls = (request.params.arguments?.urls as string[]) || [];
      if (!urls || !Array.isArray(urls) || urls.length === 0) {
        console.error(`[Error] URLs parameter missing or empty`);
        throw new Error(
          "URLs parameter is required and must be a non-empty array"
        );
      }

      console.error(`[FetchURLs] Number of URLs to fetch: ${urls.length}`);

      // Get parameters with same defaults as fetch_url
      const timeout = Number(request.params.arguments?.timeout) || 30000;
      const waitUntil = String(
        request.params.arguments?.waitUntil || "load"
      ) as "load" | "domcontentloaded" | "networkidle" | "commit";
      const extractContent = request.params.arguments?.extractContent !== false;
      const maxLength = Number(request.params.arguments?.maxLength) || 0;
      const returnHtml = request.params.arguments?.returnHtml === true;

      console.error(
        `[FetchURLs] Settings: timeout=${timeout}ms, waitUntil=${waitUntil}, extractContent=${extractContent}, maxLength=${
          maxLength || "no limit"
        }, returnHtml=${returnHtml}`
      );

      try {
        // Use multiple tabs to fetch URLs in parallel
        console.error(`[FetchURLs] Using multi-tab parallel fetching`);

        // Create a single shared browser instance
        const browser = await chromium.launch({
          headless: !isDebugMode,
        });

        // Create browser context
        const context = await browser.newContext();

        // Store results for each URL
        const results: Array<{
          index: number;
          url: string;
          success: boolean;
          content: string;
          error?: string;
        }> = [];

        try {
          // Create a processing task for each URL
          const fetchTasks = urls.map(async (url, index) => {
            console.error(
              `[FetchURLs] Creating tab for URL ${index + 1}/${
                urls.length
              }: ${url}`
            );

            try {
              // Create a new page (tab)
              const page = await context.newPage();

              try {
                // Set timeout
                page.setDefaultTimeout(timeout);

                // Navigate to URL
                console.error(
                  `[FetchURLs][Tab ${index + 1}] Navigating to URL: ${url}`
                );
                await page.goto(url, {
                  timeout: timeout,
                  waitUntil: waitUntil,
                });

                // Get page title
                const pageTitle = await page.title();
                console.error(
                  `[FetchURLs][Tab ${index + 1}] Page title: ${pageTitle}`
                );

                // Get HTML content
                const html = await page.content();

                if (!html) {
                  console.error(
                    `[FetchURLs][Tab ${
                      index + 1
                    }] Browser returned empty content`
                  );
                  results.push({
                    index,
                    url,
                    success: false,
                    content: `Title: Error\nURL: ${url}\nContent:\n\n<error>Failed to retrieve web page content: Browser returned empty content</error>`,
                    error: "Browser returned empty content",
                  });
                  return;
                }

                console.error(
                  `[FetchURLs][Tab ${
                    index + 1
                  }] Successfully retrieved web page content, length: ${
                    html.length
                  }`
                );

                // Process content
                let processedContent;
                let contentToProcess;

                // Process content extraction
                if (extractContent) {
                  console.error(
                    `[FetchURLs][Tab ${index + 1}] Extracting main content`
                  );
                  const dom = new JSDOM(html, { url });
                  const reader = new Readability(dom.window.document);
                  const article = reader.parse();

                  if (!article) {
                    console.error(
                      `[FetchURLs][Tab ${
                        index + 1
                      }] Could not extract main content, will use full HTML`
                    );
                    contentToProcess = html;
                  } else {
                    contentToProcess = article.content;
                    console.error(
                      `[FetchURLs][Tab ${
                        index + 1
                      }] Successfully extracted main content, length: ${
                        contentToProcess.length
                      }`
                    );
                  }
                } else {
                  contentToProcess = html;
                }

                // Decide whether to return HTML or convert to Markdown
                if (returnHtml) {
                  console.error(
                    `[FetchURLs][Tab ${index + 1}] Returning HTML content`
                  );
                  processedContent = contentToProcess;
                } else {
                  console.error(
                    `[FetchURLs][Tab ${index + 1}] Converting to Markdown`
                  );
                  const turndownService = new TurndownService();
                  processedContent = turndownService.turndown(contentToProcess);
                  console.error(
                    `[FetchURLs][Tab ${
                      index + 1
                    }] Successfully converted to Markdown, length: ${
                      processedContent.length
                    }`
                  );
                }

                // If maximum length is set, truncate content
                if (maxLength > 0 && processedContent.length > maxLength) {
                  console.error(
                    `[FetchURLs][Tab ${
                      index + 1
                    }] Content exceeds maximum length, will truncate to ${maxLength} characters`
                  );
                  processedContent = processedContent.substring(0, maxLength);
                }

                // Format result
                const formattedResult = `Title: ${pageTitle}
URL: ${url}
Content:

${processedContent}`;

                // Add to results array
                results.push({
                  index,
                  url,
                  success: true,
                  content: formattedResult,
                });
              } catch (error) {
                // Handle single tab error
                const errorMessage =
                  error instanceof Error ? error.message : "Unknown error";
                console.error(
                  `[FetchURLs][Tab ${index + 1}] Error: ${errorMessage}`
                );

                results.push({
                  index,
                  url,
                  success: false,
                  content: `Title: Error\nURL: ${url}\nContent:\n\n<error>Failed to retrieve web page content: ${errorMessage}</error>`,
                  error: errorMessage,
                });
              } finally {
                // Close page
                console.error(`[FetchURLs][Tab ${index + 1}] Closing tab`);
                await page
                  .close()
                  .catch((e) =>
                    console.error(
                      `[FetchURLs][Tab ${index + 1}] Failed to close tab: ${
                        e.message
                      }`
                    )
                  );
              }
            } catch (error) {
              // Handle tab creation error
              const errorMessage =
                error instanceof Error ? error.message : "Unknown error";
              console.error(
                `[FetchURLs] Failed to create tab for URL ${
                  index + 1
                }: ${errorMessage}`
              );

              results.push({
                index,
                url,
                success: false,
                content: `Title: Error\nURL: ${url}\nContent:\n\n<error>Failed to create browser tab: ${errorMessage}</error>`,
                error: errorMessage,
              });
            }
          });

          // Wait for all fetch tasks to complete
          console.error(
            `[FetchURLs] Waiting for all ${urls.length} tabs to complete`
          );
          await Promise.all(fetchTasks);
          console.error(`[FetchURLs] All tabs completed`);
        } finally {
          // Close browser
          console.error(`[FetchURLs] Closing browser`);
          await browser
            .close()
            .catch((e) =>
              console.error(`[FetchURLs] Failed to close browser: ${e.message}`)
            );
        }

        // Combine results in original URL order
        let combinedResults = "";
        results.sort((a, b) => a.index - b.index);

        results.forEach((result, i) => {
          combinedResults += `[webpage ${i + 1} begin]\n${
            result.content
          }\n[webpage ${i + 1} end]\n\n`;
        });

        return {
          content: [
            {
              type: "text",
              text: combinedResults.trim(),
            },
          ],
        };
      } catch (error) {
        let errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        console.error(`[Error] Failed to fetch URLs: ${errorMessage}`);

        return {
          content: [
            {
              type: "text",
              text: `<error>Failed to retrieve web pages content: ${errorMessage}</error>`,
            },
          ],
        };
      }
    }

    default:
      console.error(`[Error] Unknown tool: ${request.params.name}`);
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
