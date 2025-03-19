#!/usr/bin/env node

/**
 * 基于Lightpanda无头浏览器的MCP服务器
 * 提供获取网页内容的功能
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { promisify } from "util";
import { exec as execCallback } from "child_process";
import * as path from "path";
import * as fs from "fs";

const exec = promisify(execCallback);

// 获取lightpanda路径
const getBrowserPath = () => {
  // 首先尝试在当前目录查找
  const localPath = path.join(process.cwd(), "lightpanda");
  if (fs.existsSync(localPath)) {
    console.error(`[Setup] 找到本地Lightpanda: ${localPath}`);
    return localPath;
  }
  
  console.error(`[Setup] 未找到本地Lightpanda，将尝试使用PATH中的版本`);
  // 否则尝试在PATH中查找
  return "lightpanda";
};

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
              description: "要获取的URL"
            },
            timeout: {
              type: "number",
              description: "命令执行超时时间（毫秒），默认为30000（30秒）"
            }
          },
          required: ["url"]
        }
      }
    ]
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
      
      try {
        // 获取浏览器路径
        const browserPath = getBrowserPath();
        console.error(`[FetchURL] 使用浏览器: ${browserPath}`);
        
        // 执行lightpanda命令获取网页内容
        const { stdout, stderr } = await exec(`${browserPath} fetch --dump "${url}"`, { 
          timeout,
          maxBuffer: 10 * 1024 * 1024 // 10MB缓冲区
        });
        
        // 如果有错误日志，输出到控制台
        if (stderr) {
          console.error(`[FetchURL] 浏览器输出: ${stderr}`);
        }
        
        if (!stdout) {
          console.error(`[Warning] 浏览器返回了空内容`);
          return {
            content: [
              {
                type: "text",
                text: "获取网页内容失败: 浏览器返回了空内容"
              }
            ]
          };
        }
        
        console.error(`[FetchURL] 成功获取网页内容，长度: ${stdout.length}`);
        return {
          content: [
            {
              type: "text",
              text: stdout
            }
          ]
        };
      } catch (error) {
        let errorMessage = "未知错误";
        
        if (error instanceof Error) {
          errorMessage = error.message;
          
          // 检查是否是超时错误
          if (errorMessage.includes("ETIMEDOUT") || errorMessage.includes("timeout")) {
            console.error(`[Error] 获取URL超时: ${timeout}ms已过`);
            return {
              content: [
                {
                  type: "text",
                  text: `获取网页内容超时: 操作在${timeout}ms内未完成`
                }
              ]
            };
          }
        }
        
        console.error(`[Error] 获取URL失败: ${errorMessage}`);
        return {
          content: [
            {
              type: "text",
              text: `获取网页内容失败: ${errorMessage}`
            }
          ]
        };
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