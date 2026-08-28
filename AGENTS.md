# AGENTS.md — 项目开发指南

## 架构概览

```
src/
├── index.ts          # 入口：加载配置 → 创建 Server → 连接 stdio transport
├── server.ts         # MCP Server：注册 9 个工具（Zod schema + handler）
├── config/env.ts     # Zod 校验环境变量，导出 EnvConfig 类型
├── api/
│   ├── registry.ts   # API_REGISTRY：映射 12 个上游 API 的元数据
│   ├── client.ts     # ZzjlApiClient：HTTP 调用 + 速率限制 + 错误分类
│   └── types.ts      # 公共类型：ZzjlApiResponse、PageInfo、ToolResult
└── tools/            # 每个文件导出 schema + handler
    ├── search-notes.ts
    ├── get-note.ts
    ├── get-note-status.ts
    ├── create-note.ts
    ├── update-note.ts
    ├── list-scenes.ts
    ├── list-knowledge-collections.ts
    ├── get-knowledge-collection.ts
    ├── list-knowledge-cards.ts
    └── index.ts      # 统一导出
```

## 关键设计决策

### API 注册表模式

所有上游 API 的元数据集中在 `src/api/registry.ts` 的 `API_REGISTRY` 中。新增 API 只需：

1. 在 `API_REGISTRY` 添加条目（method / path / contentType / paramMode）
2. 在 `src/tools/` 创建对应工具文件
3. 在 `src/server.ts` 注册工具

### 认证方式

API Key 直接放在 `Authorization` header 中，**不需要** `Bearer` 前缀。

### 速率限制

上游 API 限制每秒 2 次调用。`ZzjlApiClient` 内置 token bucket 机制（500ms 间隔），无需在工具层处理。

`callFireAndForget` 方法用于 `createTextNoteSummary` 等返回 SSE 流的接口，仅发起请求不解析响应体。

### 响应字段命名

上游 API 响应中笔记相关字段使用 **snake_case**（`note_type`、`note_state`、`create_time`），但部分接口（知识集、知识卡）混用 camelCase。每个工具的 handler 内部处理了这一差异，对外统一输出 snake_case。

### 笔记类型映射

API 返回的 `note_type` 可能是字符串（`voice`/`text`/`image`/`document`/`link`）或数字（`0`-`4`）。所有工具统一通过 `mapNoteType()` 函数处理兼容性。`note_state` 同理。

### 场景列表的结构差异

- `queryMySceneList` 返回 **简单数组** `SceneItem[]`
- `queryInnerSceneList` 返回 **Map 结构** `Record<groupCode, SceneItem[]>` + `groupInfo`

`list-scenes.ts` 中的 `parseSceneResponse` 同时处理两种格式。

### update_note 的先查后改

官方 API 要求 `updateNote` 的 `title`/`abstract`/`summary` 全部必传。`handleUpdateNote` 会先调用 `querySingleNoteDetail` 获取当前值，再将用户未指定的字段用原值填充。

### update_note 接口当前不可用

`updateNote` 接口在官方文档中已定义但返回 HTTP 404。代码预留了完整实现，当接口开放后自动生效。handler 中对 404 做了特殊处理，返回明确的提示信息。

## 添加新工具的步骤

1. **确认上游 API**：在 [智在记录开发者中心](https://zzjilu.com/pc/developer) 查看接口文档
2. **注册 API**：在 `src/api/registry.ts` 添加 `ApiRegistryEntry`
3. **创建工具文件**：在 `src/tools/` 下创建 `{tool-name}.ts`，导出 `{toolName}Schema` 和 `handle{ToolName}`
4. **注册到 Server**：在 `src/server.ts` 的 `createServer` 中添加 `server.tool(...)` 调用
5. **导出**：在 `src/tools/index.ts` 添加导出
6. **测试**：在 `tests/smoke/smoke-test.ts` 中添加测试用例
7. **更新 Skill**：在 `skills/open-zzjilu-mcp-workflow/` 中更新工具文档和工作流

## 工具返回值约定

所有工具 handler 返回 `ToolResult<T>`：

```typescript
// 成功
{ success: true, data: T, metadata?: { total, page, has_more, truncated } }

// 失败
{ success: false, error: { code: ErrorCode, message: string, retryable: boolean, suggested_action?: string } }
```

错误码定义在 `src/api/types.ts` 的 `ErrorCode` 类型中。

## 测试

```bash
# 冒烟测试（需要有效的 ZZJL_API_KEY）
ZZJL_API_KEY='your-key' node --import tsx/esm tests/smoke/smoke-test.ts
```

冒烟测试会按顺序调用所有 9 个工具，验证基本功能。`update_note` 预期返回 404 直到官方接口开放。

## 已知限制

- **仅支持创建** `text` 和 `link` 类型笔记，`voice`/`image`/`document` 需先上传文件（无对应 MCP 工具）
- **搜索为词法匹配**，非语义搜索
- **无删除、标签、团队管理**相关工具——受限于当前开放 API 范围
- **`createTextNoteSummary`** 返回 SSE 流，仅发起请求触发生成，不读取流结果
