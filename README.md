# Browser MCP

用于获取网页内容的 MCP 服务器，使用 Playwright 无头浏览器。

## 功能

- `fetch_url` - 获取指定 URL 的网页内容
  - 使用 Playwright 无头浏览器解析 JavaScript
  - 返回网页的 HTML 内容
  - 支持配置导航等待条件和超时时间

## 安装

### 安装依赖

```bash
npm install
```

### 安装 Playwright 浏览器

安装 Playwright 所需的浏览器：

```bash
npm run install-browser
```

### 构建服务器

```bash
npm run build
```

## 配置

在 Claude Desktop 中配置此 MCP 服务器:

在 MacOS 上: `~/Library/Application Support/Claude/claude_desktop_config.json`
在 Windows 上: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "browser-mcp": {
      "command": "/path/to/browser-mcp/build/index.js"
    }
  }
}
```

## 调试

使用 MCP Inspector 进行调试:

```bash
npm run inspector
```
