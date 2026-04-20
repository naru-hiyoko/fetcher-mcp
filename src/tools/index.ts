import { fetchUrlTool, fetchUrl } from './fetchUrl.js';
import { fetchUrlsTool, fetchUrls } from './fetchUrls.js';
import { closeBrowserTool, closeBrowser } from './closeBrowser.js';
import { openBrowserForLoginTool, openBrowserForLogin } from './openBrowserForLogin.js';

// Export tool definitions
export const tools = [
  fetchUrlTool,
  fetchUrlsTool,
  closeBrowserTool,
  openBrowserForLoginTool
];

// Export tool implementations
export const toolHandlers = {
  [fetchUrlTool.name]: fetchUrl,
  [fetchUrlsTool.name]: fetchUrls,
  [closeBrowserTool.name]: closeBrowser,
  [openBrowserForLoginTool.name]: openBrowserForLogin
};
