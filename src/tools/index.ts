import { fetchUrlsTool, fetchUrls } from './fetchUrls.js';
import { closeBrowserTool, closeBrowser } from './closeBrowser.js';
import { openBrowserTool, openBrowser } from './openBrowser.js';

// Export tool definitions
export const tools = [
  fetchUrlsTool,
  closeBrowserTool,
  openBrowserTool
];

// Export tool implementations
export const toolHandlers = {
  [fetchUrlsTool.name]: fetchUrls,
  [closeBrowserTool.name]: closeBrowser,
  [openBrowserTool.name]: openBrowser
};
