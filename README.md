# Fetch MCP

MCP server for fetch web page content using Playwright headless browser.

## Quick Start

Run directly with npx:

```bash
npx -y github:jae-jae/fetch-mcp
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

## Installation

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

## Configuration

Configure this MCP server in Claude Desktop:

On MacOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
On Windows: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "fetch": {
      "command": "npx",
      "args": ["-y", "github:jae-jae/fetch-mcp"]
    }
  }
}
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
