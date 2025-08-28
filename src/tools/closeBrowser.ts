import { BrowserService } from "../services/browserService.js";
import { logger } from "../utils/logger.js";

export const closeBrowserTool = {
  name: "close_browser",
  description: "Close the browser instance and clean up resources",
  inputSchema: {
    type: "object",
    properties: {},
    required: [],
  },
};

export async function closeBrowser(args: any) {
  logger.debug("Closing browser...");

  // Get the singleton browser service instance
  const browserService = await BrowserService.getInstance();

  if (!browserService) {
    return { content: [{ type: "text", text: "No active browser instance found." }] };
  }

  await browserService.cleanup();

  return { content: [{ type: "text", text: "Storage state saved and Browser closed successfully." }] };
}
