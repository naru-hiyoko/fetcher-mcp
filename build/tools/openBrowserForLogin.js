import { BrowserService } from "../services/browserService.js";
import { logger } from "../utils/logger.js";
/**
 * Tool definition for open_browser_for_login
 */
export const openBrowserForLoginTool = {
    name: "open_browser_for_login",
    description: "Open a visible browser window so the user can manually log in to a site. Closes any existing browser instance first, then launches a new headful browser with media enabled and keeps the page open. After completing the login, call the close_browser tool to persist cookies/storage state.",
    inputSchema: {
        type: "object",
        properties: {
            url: {
                type: "string",
                description: "URL to open for login. Make sure to include the schema (http:// or https://)",
            },
            timeout: {
                type: "number",
                description: "Page loading timeout in milliseconds, default is 30000 (30 seconds)",
            },
            waitUntil: {
                type: "string",
                description: "Specifies when navigation is considered complete, options: 'load', 'domcontentloaded', 'networkidle', 'commit', default is 'load'",
            },
        },
        required: ["url"],
    },
};
/**
 * Implementation of the open_browser_for_login tool
 */
export async function openBrowserForLogin(args) {
    const url = String(args?.url || "");
    if (!url) {
        logger.error(`URL parameter missing`);
        throw new Error("URL parameter is required");
    }
    const timeout = Number(args?.timeout) || 30000;
    const waitUntil = String(args?.waitUntil || "load");
    // Close any existing active browser instance first.
    const existing = BrowserService.getInstance();
    if (existing) {
        logger.debug("Closing existing browser instance before opening login browser...");
        await existing.cleanup();
    }
    // Open a new browser in headful mode with media enabled, and keep the page open.
    const options = {
        timeout,
        waitUntil,
        extractContent: false,
        maxLength: 0,
        returnHtml: false,
        waitForNavigation: false,
        navigationTimeout: 10000,
        disableMedia: false,
        closePage: false,
    };
    const browserService = BrowserService.createOrGetInstance(options);
    let page = null;
    const browser = await browserService.getOrCreateBrowser();
    const { context, viewport } = await browserService.getOrCreateContext(browser);
    page = await browserService.createPage(context, viewport);
    await page.goto(url, { timeout, waitUntil });
    return {
        content: [
            {
                type: "text",
                text: `Browser opened at ${url}. Please complete the login manually, then call the close_browser tool to save cookies.`,
            },
        ],
    };
}
