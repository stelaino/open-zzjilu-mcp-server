# open-zzjilu-mcp-server

[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![MCP](https://img.shields.io/badge/MCP-compatible-8A2BE2)](https://modelcontextprotocol.io/)

[English](./README_EN.md)

基于智在记录开放 API 的非官方 MCP Server，为 AI Agent 提供笔记知识库读写能力。

> **声明**：本项目为个人开源项目，非智在记录官方产品。"智在记录"及相关商标归浩鲸云计算科技股份有限公司所有。

---

## 功能

提供 9 个 MCP 工具：

| 工具 | 功能 |
|------|------|
| `search_notes` | 按主题/时间/类型检索笔记 |
| `get_note` | 读取笔记完整内容 |
| `get_note_status` | 查询笔记异步处理状态 |
| `create_note` | 创建文字或链接笔记 |
| `update_note` | 修改笔记标题/摘要/总结 * |
| `list_scenes` | 列出可用的场景模板 |
| `list_knowledge_collections` | 浏览个人和共享笔记集 |
| `get_knowledge_collection` | 读取笔记集详情 |
| `list_knowledge_cards` | 列出知识卡 |

> \* `update_note` 依赖的 `updateNote` 接口在官方文档中已定义，但当前尚未开放。工具代码已预留，待接口开放后自动生效。受此影响，「笔记元数据维护」工作流暂时无法使用。

---

## 快速开始

### 前置条件

- **Node.js** >= 20 LTS（MCP SDK v2 要求 Node.js 20+）
- **智在记录 API Key**：在 [智在记录开发者中心](https://zzjilu.com/pc/developer) 获取

### 安装

**方式一：npx 直接使用（推荐）**

无需安装，在 MCP 客户端配置中直接使用 npx：

```bash
npx -y github:stelaino/open-zzjilu-mcp-server
```

**方式二：本地构建**

```bash
git clone https://github.com/stelaino/open-zzjilu-mcp-server.git
cd open-zzjilu-mcp-server
npm install && npm run build
```

---

## 配置 MCP 客户端

### Cursor

编辑 `~/.cursor/mcp.json` 或项目级 `.cursor/mcp.json`：

#### macOS / Linux

```json
{
  "mcpServers": {
    "zzjilu": {
      "command": "npx",
      "args": ["--yes", "github:stelaino/open-zzjilu-mcp-server", "open-zzjilu-mcp-server"],
      "env": {
        "ZZJL_API_KEY": "<你的 API Key>"
      }
    }
  }
}
```

#### Windows

```json
{
  "mcpServers": {
    "zzjilu": {
      "command": "cmd",
      "args": ["/c", "npx", "--yes", "github:stelaino/open-zzjilu-mcp-server", "open-zzjilu-mcp-server"],
      "env": {
        "ZZJL_API_KEY": "<你的 API Key>"
      }
    }
  }
}
```

#### 本地构建方式（跨平台）

```json
{
  "mcpServers": {
    "zzjilu": {
      "command": "node",
      "args": ["/absolute/path/to/open-zzjilu-mcp-server/dist/index.js"],
      "env": {
        "ZZJL_API_KEY": "<你的 API Key>"
      }
    }
  }
}
```

### Claude Desktop

编辑配置文件：
- **macOS**：`~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**：`%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "zzjilu": {
      "command": "npx",
      "args": ["--yes", "github:stelaino/open-zzjilu-mcp-server", "open-zzjilu-mcp-server"],
      "env": {
        "ZZJL_API_KEY": "<你的 API Key>"
      }
    }
  }
}
```

> Windows 上如果 npx 无法启动，将 `command` 改为 `cmd`，`args` 前插入 `"/c", "npx"`。

### Claude Code (CLI)

```bash
claude mcp add zzjilu -- npx --yes github:stelaino/open-zzjilu-mcp-server open-zzjilu-mcp-server
```

### 其他 MCP 客户端

VS Code + Cline、Windsurf 等支持 MCP stdio transport 的客户端均可使用相同配置。

---

## 环境变量

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `ZZJL_API_KEY` | **是** | — | 在 [开发者中心](https://zzjilu.com/pc/developer) 获取 |
| `ZZJL_API_BASE_URL` | 否 | `https://openapi.zzjilu.com` | API 基础地址（仅 HTTPS） |
| `ZZJL_REQUEST_TIMEOUT_MS` | 否 | `10000` | 请求超时（毫秒） |
| `ZZJL_LOG_LEVEL` | 否 | `info` | debug / info / warn / error |

### API 限流

智在记录开放 API 限制最高调用频率为 **每秒 2 次**。MCP Server 已内置速率控制（token bucket），自动在请求间保持 500ms 间隔，无需额外配置。

---

## AI Skill（可选）

项目附带 AI Skill，安装后 AI 可获得更精准的工具编排能力。

### 一键安装

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/stelaino/open-zzjilu-mcp-server/main/scripts/install-skill.sh)
```

### 手动安装

将 `skills/open-zzjilu-mcp-workflow/` 复制到 AI 客户端 skills 目录：

```bash
cp -r skills/open-zzjilu-mcp-workflow ~/.agents/skills/       # 通用（推荐）
cp -r skills/open-zzjilu-mcp-workflow ~/.cursor/skills/       # Cursor
cp -r skills/open-zzjilu-mcp-workflow ~/.claude/skills/        # Claude Code
```

---

## 项目结构

```
open-zzjilu-mcp-server/
├── src/
│   ├── index.ts              # CLI 入口
│   ├── server.ts             # MCP Server 注册 + stdio transport
│   ├── config/env.ts         # 环境变量校验（Zod）
│   ├── api/                  # ApiRegistry + HTTP 客户端（含限流）
│   └── tools/                # 9 个 MCP 工具实现
├── skills/                   # AI Skill（可选安装）
├── scripts/                  # 安装脚本
├── tests/                    # 冒烟测试
├── package.json
├── tsconfig.json
└── README.md
```

---

## 开发

```bash
npm install                                                   # 安装依赖
npm run dev                                                   # 开发模式（watch）
npm run build                                                 # 编译构建
npm test                                                      # 运行测试
npx @modelcontextprotocol/inspector node dist/index.js        # MCP Inspector 调试
```

---

## 贡献

欢迎提交 Issue 和 Pull Request。

1. Fork 本仓库
2. 创建分支 (`git checkout -b feature/your-feature`)
3. 提交更改 (`git commit -m 'Add some feature'`)
4. 推送分支 (`git push origin feature/your-feature`)
5. 提交 Pull Request

---

## 许可证

[MIT](./LICENSE)
