# Browser MCP

用于获取网页内容的MCP服务器，使用Lightpanda无头浏览器。

## 功能

- `fetch_url` - 获取指定URL的网页内容
  - 使用Lightpanda无头浏览器解析JavaScript
  - 返回网页的HTML内容

## 安装

### 安装依赖

```bash
npm install
```

### 下载Lightpanda

对于MacOS:

```bash
curl -L -o lightpanda https://github.com/lightpanda-io/browser/releases/download/nightly/lightpanda-aarch64-macos && \
chmod a+x ./lightpanda
```

对于Linux:

```bash
curl -L -o lightpanda https://github.com/lightpanda-io/browser/releases/download/nightly/lightpanda-x86_64-linux && \
chmod a+x ./lightpanda
```

### 构建服务器

```bash
npm run build
```

## 配置

在Claude Desktop中配置此MCP服务器:

在MacOS上: `~/Library/Application Support/Claude/claude_desktop_config.json`
在Windows上: `%APPDATA%/Claude/claude_desktop_config.json`

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

使用MCP Inspector进行调试:

```bash
npm run inspector
``` 