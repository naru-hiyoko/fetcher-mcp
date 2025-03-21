<div align="center">
  <img src="https://raw.githubusercontent.com/jae-jae/fetcher-mcp/refs/heads/main/icon.svg" width="100" height="100" alt="Fetcher MCP Icon" />
</div>

# Fetcher MCP

MCP server for fetch web page content using Playwright headless browser.

## Advantages

- **JavaScript Support**: Unlike traditional web scrapers, Fetcher MCP uses Playwright to execute JavaScript, making it capable of handling dynamic web content and modern web applications.

- **Intelligent Content Extraction**: Built-in Readability algorithm automatically extracts the main content from web pages, removing ads, navigation, and other non-essential elements.

- **Flexible Output Format**: Supports both HTML and Markdown output formats, making it easy to integrate with various downstream applications.

- **Parallel Processing**: The `fetch_urls` tool enables concurrent fetching of multiple URLs, significantly improving efficiency for batch operations.

- **Resource Optimization**: Automatically blocks unnecessary resources (images, stylesheets, fonts, media) to reduce bandwidth usage and improve performance.

- **Robust Error Handling**: Comprehensive error handling and logging ensure reliable operation even when dealing with problematic web pages.

- **Configurable Parameters**: Fine-grained control over timeouts, content extraction, and output formatting to suit different use cases.

## Quick Start

Run directly with npx:

```bash
npx -y fetcher-mcp
```

### Debug Mode

Run with the `--debug` option to show the browser window for debugging:

```bash
npx -y fetcher-mcp --debug
```

## Configuration MCP

Configure this MCP server in Claude Desktop:

On MacOS: `~/Library/Application Support/Claude/claude_desktop_config.json`

On Windows: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "fetcher": {
      "command": "npx",
      "args": ["-y", "fetcher-mcp"]
    }
  }
}
```

## Features

- `fetch_url` - Retrieve web page content from a specified URL
  - Uses Playwright headless browser to parse JavaScript
  - Supports intelligent extraction of main content and conversion to Markdown
  - Supports the following parameters:
    - `url`: The URL of the web page to fetch (required parameter)
    - `timeout`: Page loading timeout in milliseconds, default is 30000 (30 seconds)
    - `waitUntil`: Specifies when navigation is considered complete, options: 'load', 'domcontentloaded', 'networkidle', 'commit', default is 'load'
    - `extractContent`: Whether to intelligently extract the main content, default is true
    - `maxLength`: Maximum length of returned content (in characters), default is no limit
    - `returnHtml`: Whether to return HTML content instead of Markdown, default is false
    - `waitForNavigation`: Whether to wait for additional navigation after initial page load (useful for sites with anti-bot verification), default is false
    - `navigationTimeout`: Maximum time to wait for additional navigation in milliseconds, default is 10000 (10 seconds)
    - `disableMedia`: Whether to disable media resources (images, stylesheets, fonts, media), default is true
    - `debug`: Whether to enable debug mode (showing browser window), overrides the --debug command line flag if specified

- `fetch_urls` - Batch retrieve web page content from multiple URLs in parallel
  - Uses multi-tab parallel fetching for improved performance
  - Returns combined results with clear separation between webpages
  - Supports the following parameters:
    - `urls`: Array of URLs to fetch (required parameter)
    - Other parameters are the same as `fetch_url`

## Tips

### Handling Websites with Anti-Crawler Mechanisms

When dealing with websites that have anti-bot or anti-crawler protections:

- **Wait for Complete Page Loading**: For websites that implement CAPTCHA, redirects, or other verification mechanisms, include in your prompt:
  ```
  Please wait for the page to fully load
  ```
  This will signal the AI to use the `waitForNavigation: true` parameter when calling the MCP tool.

- **Increase Timeouts**: If a website takes longer to load or has delayed verification screens:
  ```
  Please set the page loading timeout to 60 seconds
  ```
  This will adjust the `timeout` and `navigationTimeout` parameters accordingly.

- **Preserve HTML Structure**: For websites where content extraction might fail:
  ```
  Please preserve the original HTML content
  ```
  This will set the `extractContent: false` and potentially `returnHtml: true` parameters.

- **Fetch Complete Page Content**: If the extracted content is too limited or missing important information:
  ```
  Please fetch the complete webpage content instead of just the main content
  ```
  This will signal the AI to set `extractContent: false` to retrieve the full HTML content.

- **Return Content as HTML**: When you need HTML instead of the default Markdown format:
  ```
  Please return the content in HTML format
  ```
  This will set the `returnHtml: true` parameter.

- **Enable Debug Mode Dynamically**: To show the browser window for debugging during a specific fetch operation:
  ```
  Please enable debug mode for this fetch operation
  ```
  This will set the `debug: true` parameter, showing the browser window even if you started the server without the `--debug` flag.

### Using Custom Cookies for Authentication

For websites that require login or authentication:

- **Enable Debug Mode for Manual Login**: To log in with your own credentials and use those cookies:
  ```
  Please run in debug mode so I can manually log in to the website
  ```
  This will set the `debug: true` parameter or use the `--debug` flag, keeping the browser window open so you can manually log in before content is fetched.

- **Interact with Debug Browser**: When debug mode is enabled (either through the parameter or command line flag):
  1. The browser window will remain open
  2. You can manually log into the website using your credentials
  3. After login is complete, the content will be fetched with your authenticated session
  4. This allows accessing content that requires authentication without sharing credentials

- **Dynamic Debug Mode**: If the server is already running without the `--debug` flag, you can still enable debug mode for a specific request:
  ```
  Please enable debug mode for this authentication step
  ```
  This will set the `debug: true` parameter for this specific request only, opening the browser window for manual login.

## Development

### Install Dependencies

```bash
npm install
```

### Install Playwright Browser

Install the browsers needed for Playwright:

```bash
npm run install-browser
```

### Build the Server

```bash
npm run build
```

## Debugging

Use MCP Inspector for debugging:

```bash
npm run inspector
```

You can also enable visible browser mode for debugging:

```bash
node build/index.js --debug
```

## License

Licensed under the [MIT License](https://choosealicense.com/licenses/mit/)
