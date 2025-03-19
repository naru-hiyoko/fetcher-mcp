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
          },
          required: ["url"],
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

        // Get HTML content
        const html = await page.content();

        if (!html) {
          console.error(`[Warning] Browser returned empty content`);
          return {
            content: [
              {
                type: "text",
                text: "Failed to retrieve web page content: Browser returned empty content",
              },
            ],
          };
        }

        console.error(
          `[FetchURL] Successfully retrieved web page content, length: ${html.length}`
        );

        // Process content based on parameters
        let processedContent;

        if (extractContent) {
          // Extract main content and convert to Markdown
          console.error(
            `[FetchURL] Extracting main content and converting to Markdown`
          );
          const dom = new JSDOM(html, { url });
          const reader = new Readability(dom.window.document);
          const article = reader.parse();

          if (!article) {
            console.error(
              `[Warning] Could not extract main content, will return original HTML`
            );
            processedContent = html;
          } else {
            const turndownService = new TurndownService();
            processedContent = turndownService.turndown(article.content);
            console.error(
              `[FetchURL] Successfully extracted main content and converted to Markdown, length: ${processedContent.length}`
            );
          }
        } else {
          // Convert entire HTML to Markdown
          console.error(`[FetchURL] Converting entire HTML to Markdown`);
          const turndownService = new TurndownService();
          processedContent = turndownService.turndown(html);
          console.error(
            `[FetchURL] Successfully converted HTML to Markdown, length: ${processedContent.length}`
          );
        }

        // If maximum length is set, truncate content
        if (maxLength > 0 && processedContent.length > maxLength) {
          console.error(
            `[FetchURL] Content exceeds maximum length, will truncate to ${maxLength} characters`
          );
          processedContent = processedContent.substring(0, maxLength);
        }

        return {
          content: [
            {
              type: "text",
              text: processedContent,
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
                  text: `Web page content fetch timeout: Operation did not complete within ${timeout}ms`,
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
              text: `Failed to retrieve web page content: ${errorMessage}`,
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
