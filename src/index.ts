#!/usr/bin/env node

/**
 * 基于Playwright无头浏览器的MCP服务器
 * 提供获取网页内容的功能
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

/**
 * 创建MCP服务器
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
 * 处理工具列表请求
 * 提供一个fetch_url工具用于获取网页内容
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  console.error("[Tools] 列出可用工具");
  return {
    tools: [
      {
        name: "fetch_url",
        description: "获取指定URL的网页内容",
        inputSchema: {
          type: "object",
          properties: {
            url: {
              type: "string",
              description: "要获取的URL",
            },
            timeout: {
              type: "number",
              description: "页面加载超时时间（毫秒），默认为30000（30秒）",
            },
            waitUntil: {
              type: "string",
              description:
                "指定何时认为导航完成，可选值: 'load', 'domcontentloaded', 'networkidle', 'commit'，默认为 'load'",
            },
            extractContent: {
              type: "boolean",
              description: "是否智能提取正文内容，默认为true",
            },
            maxLength: {
              type: "number",
              description: "返回内容的最大长度（字符数），默认不限制",
            },
          },
          required: ["url"],
        },
      },
    ],
  };
});

/**
 * 处理工具调用请求
 * 实现fetch_url工具的逻辑
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  switch (request.params.name) {
    case "fetch_url": {
      console.error(`[FetchURL] 正在获取: ${request.params.arguments?.url}`);

      const url = String(request.params.arguments?.url || "");
      if (!url) {
        console.error(`[Error] URL参数缺失`);
        throw new Error("URL参数是必需的");
      }

      // 默认超时30秒
      const timeout = Number(request.params.arguments?.timeout) || 30000;
      console.error(`[FetchURL] 设置超时: ${timeout}ms`);

      // 等待导航条件，默认为加载完成
      const waitUntil = String(
        request.params.arguments?.waitUntil || "load"
      ) as "load" | "domcontentloaded" | "networkidle" | "commit";
      console.error(`[FetchURL] 等待条件: ${waitUntil}`);

      // 是否提取正文，默认为true
      const extractContent = request.params.arguments?.extractContent !== false;
      console.error(`[FetchURL] 是否提取正文: ${extractContent}`);

      // 内容最大长度，默认不限制
      const maxLength = Number(request.params.arguments?.maxLength) || 0;
      console.error(`[FetchURL] 最大内容长度: ${maxLength || "不限制"}`);

      let browser = null;
      let page = null;

      try {
        // 启动浏览器
        console.error(`[FetchURL] 启动Playwright浏览器`);
        browser = await chromium.launch({
          headless: true,
        });

        // 创建新页面
        const context = await browser.newContext();
        page = await context.newPage();

        // 设置超时
        page.setDefaultTimeout(timeout);

        // 访问URL
        console.error(`[FetchURL] 导航到URL: ${url}`);
        await page.goto(url, {
          timeout: timeout,
          waitUntil: waitUntil,
        });

        // 获取HTML内容
        const html = await page.content();

        if (!html) {
          console.error(`[Warning] 浏览器返回了空内容`);
          return {
            content: [
              {
                type: "text",
                text: "获取网页内容失败: 浏览器返回了空内容",
              },
            ],
          };
        }

        console.error(`[FetchURL] 成功获取网页内容，长度: ${html.length}`);

        // 根据参数处理内容
        let processedContent;

        if (extractContent) {
          // 提取正文并转换为Markdown
          console.error(`[FetchURL] 正在提取正文并转换为Markdown`);
          const dom = new JSDOM(html, { url });
          const reader = new Readability(dom.window.document);
          const article = reader.parse();

          if (!article) {
            console.error(`[Warning] 无法提取正文，将返回原始HTML`);
            processedContent = html;
          } else {
            const turndownService = new TurndownService();
            processedContent = turndownService.turndown(article.content);
            console.error(
              `[FetchURL] 成功提取正文并转换为Markdown，长度: ${processedContent.length}`
            );
          }
        } else {
          // 将整个HTML转换为Markdown
          console.error(`[FetchURL] 正在将整个HTML转换为Markdown`);
          const turndownService = new TurndownService();
          processedContent = turndownService.turndown(html);
          console.error(
            `[FetchURL] 成功将HTML转换为Markdown，长度: ${processedContent.length}`
          );
        }

        // 如果设置了最大长度，截取内容
        if (maxLength > 0 && processedContent.length > maxLength) {
          console.error(
            `[FetchURL] 内容超过最大长度，将截取至${maxLength}字符`
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
        let errorMessage = "未知错误";

        if (error instanceof Error) {
          errorMessage = error.message;

          // 检查是否是超时错误
          if (
            errorMessage.includes("Timeout") ||
            errorMessage.includes("timeout")
          ) {
            console.error(`[Error] 获取URL超时: ${timeout}ms已过`);
            return {
              content: [
                {
                  type: "text",
                  text: `获取网页内容超时: 操作在${timeout}ms内未完成`,
                },
              ],
            };
          }
        }

        console.error(`[Error] 获取URL失败: ${errorMessage}`);
        return {
          content: [
            {
              type: "text",
              text: `获取网页内容失败: ${errorMessage}`,
            },
          ],
        };
      } finally {
        // 确保资源被释放
        if (page) {
          console.error(`[FetchURL] 关闭页面`);
          await page
            .close()
            .catch((e) => console.error(`[Error] 关闭页面失败: ${e.message}`));
        }
        if (browser) {
          console.error(`[FetchURL] 关闭浏览器`);
          await browser
            .close()
            .catch((e) =>
              console.error(`[Error] 关闭浏览器失败: ${e.message}`)
            );
        }
      }
    }

    default:
      console.error(`[Error] 未知工具: ${request.params.name}`);
      throw new Error(`未知工具: ${request.params.name}`);
  }
});

/**
 * 启动服务器
 */
async function main() {
  console.error("[Setup] 初始化浏览器MCP服务器...");
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[Setup] 服务器已启动");
}

main().catch((error) => {
  console.error("[Error] 服务器错误:", error);
  process.exit(1);
});
