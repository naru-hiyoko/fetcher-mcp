# Browser MCP

用于获取网页内容的 MCP 服务器，使用 Playwright 无头浏览器。

## 功能

- `fetch_url` - 获取指定 URL 的网页内容
  - 使用 Playwright 无头浏览器解析 JavaScript
  - 支持智能提取正文内容并转换为 Markdown
  - 支持以下参数:
    - `url`: 要获取的网页 URL（必需参数）
    - `timeout`: 页面加载超时时间（毫秒），默认为 30000（30 秒）
    - `waitUntil`: 指定何时认为导航完成，可选值: 'load', 'domcontentloaded', 'networkidle', 'commit'，默认为 'load'
    - `extractContent`: 是否智能提取正文内容，默认为 true
    - `maxLength`: 返回内容的最大长度（字符数），默认不限制

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

也可以启用浏览器可见模式进行调试:

```bash
node build/index.js --debug
```
