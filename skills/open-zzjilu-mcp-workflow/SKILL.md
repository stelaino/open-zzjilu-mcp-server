---
name: open-zzjilu-mcp-workflow
version: 1.1.0
description: >-
  智在记录 MCP Server 的 AI Agent 工作流编排技能。覆盖 9 个 MCP 工具的完整调用规范、
  参数约束、响应解析、错误恢复和场景编排策略。
  触发条件：当用户提到"智在记录"、"笔记"、"知识库"、"笔记集"、"知识卡"、
  "zzjilu"、"对话沉淀"、"知识检索"时自动触发。
---

# 智在记录 MCP Server — AI Agent 工作流编排

## 前置检查与安装引导

**本章节在 Skill 首次触发时必须执行，确认 MCP Server 可用后再进行后续工具调用。**

### 第一步：检测 MCP Server 是否可用

尝试调用 `list_scenes` 工具（无副作用的只读操作），根据返回结果判断：

```
调用 list_scenes(source="inner")
  ├─ 成功返回 → MCP Server 已就绪，跳到「按需加载子文件」继续
  ├─ 返回 CONFIG_MISSING → API Key 未配置，跳到「第三步：配置 API Key」
  ├─ 返回 AUTH_FAILED → API Key 无效，跳到「第三步：配置 API Key」
  └─ 工具不存在 / 连接失败 → MCP Server 未安装，跳到「第二步：安装 MCP Server」
```

### 第二步：安装 MCP Server

根据用户的 AI 客户端类型，引导对应的安装方式：

#### Cursor

编辑 MCP 配置文件（二选一）：
- 全局配置：`~/.cursor/mcp.json`
- 项目级配置：`.cursor/mcp.json`

添加以下配置（macOS / Linux）：

```json
{
  "mcpServers": {
    "open-zzjilu-mcp-server": {
      "command": "npx",
      "args": ["--yes", "github:stelaino/open-zzjilu-mcp-server", "open-zzjilu-mcp-server"],
      "env": {
        "ZZJL_API_KEY": "<替换为你的 API Key>"
      }
    }
  }
}
```

> Windows 用户需将 `command` 改为 `cmd`，`args` 前插入 `"/c", "npx"`。

#### Claude Desktop

编辑配置文件：
- macOS：`~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows：`%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "open-zzjilu-mcp-server": {
      "command": "npx",
      "args": ["--yes", "github:stelaino/open-zzjilu-mcp-server", "open-zzjilu-mcp-server"],
      "env": {
        "ZZJL_API_KEY": "<替换为你的 API Key>"
      }
    }
  }
}
```

#### Claude Code (CLI)

```bash
claude mcp add open-zzjilu-mcp-server -- npx --yes github:stelaino/open-zzjilu-mcp-server open-zzjilu-mcp-server
```

添加后需设置环境变量 `ZZJL_API_KEY`。

#### 其他客户端

VS Code + Cline、Windsurf 等支持 MCP stdio transport 的客户端均可使用相同的 npx 配置。

#### 安装前置条件

- **Node.js >= 20 LTS**（MCP SDK v2 要求）
- 可通过 `node -v` 检查版本，未安装请前往 [nodejs.org](https://nodejs.org/) 下载

### 第三步：配置 API Key

1. 前往 [智在记录开发者中心](https://zzjilu.com/pc/developer) 注册/登录
2. 在开发者中心页面获取 API Key
3. 将 API Key 填入上述 MCP 配置中的 `ZZJL_API_KEY` 字段
4. 重启 AI 客户端使配置生效

### 第四步：验证安装

配置完成后，重新执行第一步的检测。若仍失败，检查以下常见问题：

| 症状 | 可能原因 | 解决方法 |
|------|---------|---------|
| 工具不存在 | MCP 配置文件路径错误 | 确认配置文件位置正确 |
| 连接超时 | npx 下载包失败 | 检查网络连接，或先运行 `npm install -g github:stelaino/open-zzjilu-mcp-server` |
| CONFIG_MISSING | 环境变量未传入 | 确认 `env.ZZJL_API_KEY` 已填写 |
| AUTH_FAILED | API Key 错误或过期 | 前往开发者中心重新获取 |

---

## 按需加载子文件

**在执行具体任务前，必须先 Read 加载对应子文件，未加载前不得编排工具调用。**

| 子文件 | 内容 | 何时加载 |
|--------|------|----------|
| `01-tools-reference.md` | 9 个工具的完整 Schema、参数约束、响应结构、字段含义 | 首次调用任何工具前 |
| `02-workflows.md` | 6 个典型场景的完整编排策略、决策树、异常分支处理 | 需要编排多步工具调用时 |

子文件路径：与本 `SKILL.md` 同目录下的 `{文件名}.md`

### 快速判断：用户需求 → 加载哪个子文件

| 用户需求关键词 | 加载文件 | 直达章节 |
|---------------|---------|---------|
| 找笔记、搜索、检索 | `01-tools-reference.md` | search_notes |
| 读取笔记、查看内容 | `01-tools-reference.md` | get_note |
| 笔记状态、处理进度 | `01-tools-reference.md` | get_note_status |
| 创建笔记、记录、保存 | `01-tools-reference.md` | create_note |
| 修改标题、改摘要、改总结 | `01-tools-reference.md` | update_note |
| 场景、模板 | `01-tools-reference.md` | list_scenes |
| 笔记集、知识库、知识空间 | `01-tools-reference.md` | list_knowledge_* / get_knowledge_* |
| 知识卡 | `01-tools-reference.md` | list_knowledge_cards |
| 对话沉淀、总结保存、知识问答 | `02-workflows.md` | 对应工作流章节 |
| 多步编排、工具组合 | `02-workflows.md` | 全部 |

---

## 核心约束（必须遵守）

### 1. 安全红线

- **绝不**尝试调用 delete、team、auth 类工具——它们不存在
- **绝不**在工具参数中传入 API Key、Authorization header 或 Base URL
- **绝不**将工具返回的内容中可能包含的敏感信息（如用户真实姓名、手机号）直接展示给第三方
- 若工具返回 `AUTH_FAILED`，**不要**重试——告知用户检查 API Key 配置

### 2. 速率限制

平台 API 限制 **每秒最多 2 次调用**。MCP Server 已内置速率控制（自动在请求间保持 500ms 间隔），正常使用不会触发限流。但需注意：

- **避免并发调用多个工具**——按顺序依次调用
- 若收到 `RATE_LIMITED` 错误，等待 2 秒后重试
- `search_notes` 内部可能发起多次 API 请求（多字段搜索），已自动限速

### 3. 上下文效率

- `search_notes` 单次最多返回 20 条，**默认只取 10 条**
- 检索结果**仅含摘要**，必须用 `get_note` 按需读取正文
- 一次对话中**最多读取 3 条笔记正文**，避免上下文膨胀
- 超过 8000 字符的正文会被截断，返回 `truncated: true`

### 4. 异步状态感知

录音/文档类笔记创建后需要平台异步处理，**不能立即读取正文**：

```
创建/发现笔记
  ↓
get_note_status(note_id)
  ├─ state=completed  → 可以 get_note 读取
  ├─ state=pending/recognizing/analyzing → 告知用户"正在处理，请稍后"
  └─ state=failed → 告知用户"处理失败"
```

### 5. 类型约束

| 约束 | 说明 |
|------|------|
| 笔记 ID | 雪花 ID 字符串（19 位），**全局使用 string 类型** |
| 场景 ID | `list_scenes` 返回 string，`create_note` 内部转为 int64 |
| 时间格式 | `yyyy-MM-dd` 或 `yyyy-MM-dd HH:mm:ss` |
| 分页 | `page` 从 1 开始，`page_size` 上限 20 |

### 6. create_note 类型限制

| 类型 | AI 可直接创建 | 说明 |
|------|-------------|------|
| `text` | **是** | 文字笔记，需 title + content |
| `link` | **是** | 链接笔记，content 为 URL |
| `voice` | 否 | 需先上传音频文件 |
| `image` | 否 | 需先上传图片文件 |
| `document` | 否 | 需先上传文档文件 |

### 7. update_note 字段限制

`update_note` **仅支持修改**：`title`、`abstract`、`summary`

**不支持**：正文内容更新。若用户要求修改正文，应告知"当前不支持正文更新，建议创建新笔记"。

---

## 错误处理策略

| error.code | 含义 | retryable | Agent 行为 |
|-----------|------|-----------|-----------|
| `CONFIG_MISSING` | API Key 未配置 | 否 | 告知用户需在环境变量中配置 `ZZJL_API_KEY` |
| `AUTH_FAILED` | API Key 无效或过期 | 否 | 告知用户检查 API Key |
| `NOT_FOUND` | 笔记/笔记集/知识卡不存在 | 否 | 提示 ID 可能有误，建议重新检索 |
| `PERMISSION_DENIED` | 无权访问 | 否 | 告知用户该资源无权限 |
| `PROCESSING` | 异步处理中 | 是 | 建议用户等待 5-10 秒后重试 |
| `TIMEOUT` | 请求超时 | 是 | 自动重试 1 次，仍失败则告知用户 |
| `INVALID_INPUT` | 参数不合法 | 否 | 检查参数格式后修正重试 |
| `UPSTREAM_ERROR` | 上游服务错误 | 是 | 自动重试 1 次 |
| `RATE_LIMITED` | 频率限制 | 是 | 等待 30 秒后重试 |

### 错误恢复决策树

```
工具调用失败
  ├─ retryable=true
  │   ├─ 首次失败 → 自动重试 1 次
  │   └─ 重试仍失败 → 告知用户，提供错误码和建议
  └─ retryable=false
      ├─ NOT_FOUND → 引导用户重新检索
      ├─ AUTH_FAILED → 告知检查配置
      ├─ INVALID_INPUT → 修正参数后重试
      └─ PERMISSION_DENIED → 告知无权限
```

---

## 工具概览

| # | 工具 | 映射接口 | 方法 | 用途 |
|---|------|---------|------|------|
| 1 | `search_notes` | queryNoteList | POST | 主题/时间/类型检索笔记 |
| 2 | `get_note` | querySingleNoteDetail | GET | 按 ID 读取笔记详情 |
| 3 | `get_note_status` | queryNoteStatus | GET | 查询异步处理状态 |
| 4 | `create_note` | createNote + createTextNoteSummary | POST | 创建文字/链接笔记 |
| 5 | `update_note` | updateNote | POST | 修改标题/摘要/总结 |
| 6 | `list_scenes` | queryMySceneList + queryInnerSceneList | GET | 列出场景模板 |
| 7 | `list_knowledge_collections` | queryNoteKnowledge + queryNoteKnowledgeEmpower | POST | 列出笔记集 |
| 8 | `get_knowledge_collection` | queryNoteKnowledgeDetail | POST | 读取笔记集详情 |
| 9 | `list_knowledge_cards` | queryKnowledgeCardByPage | POST | 列出知识卡 |

> 完整 Schema 和响应结构见 `01-tools-reference.md`

---

## 工作流速查

| # | 场景 | 工具编排 | 关键决策点 |
|---|------|---------|-----------|
| 1 | 知识问答 | search → get_note | 选最相关 1-3 条，正文超长时用 summary 级别 |
| 2 | 知识沉淀 | (list_scenes →) create_note (→ get_note_status) | 是否指定场景？是否生成总结？ |
| 3 | 元数据维护 | search → update_note (→ get_note) | 至少传一个修改字段，不支持正文 |
| 4 | 知识空间浏览 | list_collections → get_collection → get_note | scope 选择、分页控制 |
| 5 | 异步笔记处理 | create → get_status → (等待) → get_note | 状态轮询策略 |
| 6 | 对话沉淀 | AI 整理上下文 → list_scenes → create_note → get_note | AI 自编排，无需额外 Prompt |

> 完整编排策略、决策树和异常分支见 `02-workflows.md`
