# 工具完整参考

## 1. search_notes — 知识检索

### 输入 Schema

```typescript
{
  query: string;          // 必填。搜索主题，同时匹配标题/摘要/总结/内容
  note_type?: 'voice' | 'text' | 'image' | 'document' | 'link';
  start_time?: string;    // yyyy-MM-dd 或 yyyy-MM-dd HH:mm:ss
  end_time?: string;
  max_results?: number;   // 默认 10，最大 20
}
```

### 响应结构

```typescript
{
  success: true;
  data: {
    notes: Array<{
      note_id: string;           // 雪花 ID
      title: string;
      abstract: string | null;
      note_type: 'voice' | 'text' | 'image' | 'document' | 'link';
      create_time: string;
      note_state: 'completed' | 'pending' | 'recognizing' | 'analyzing' | 'failed';
      scene_name: string | null;
    }>;
    metadata: {
      total: number;
      returned: number;
      search_mode: 'lexical';    // V1 仅词法匹配
      has_more: boolean;
    };
  };
}
```

### 使用要点

- 检索为**词法匹配**，非语义检索——表达不同但含义相近的查询可能找不到
- 返回仅含摘要，**不含正文**，需用 `get_note` 按需读取
- 结果按时间降序排列
- `note_state` 非 `completed` 的笔记内容可能不完整

---

## 2. get_note — 笔记读取

### 输入 Schema

```typescript
{
  note_id: string;                     // 必填。笔记 ID
  content_level?: 'summary' | 'full';  // 默认 'full'
}
```

### 响应结构

```typescript
{
  success: true;
  data: {
    note_id: string;
    title: string;
    abstract: string | null;
    summary: string | null;
    note_type: string;
    create_time: string;
    note_state: string;
    scene_name: string | null;
    content?: NoteContent;    // content_level='full' 时
    truncated: boolean;       // 超 8000 字符截断
  };
}

// content 按 note_type 区分
type NoteContent =
  | { type: 'text'; text: string }
  | { type: 'voice'; transcripts: Array<{
      start_ms: string; end_ms: string; text: string; speaker: string;
    }>; duration: string }
  | { type: 'image' | 'document' | 'link'; raw: unknown };
```

### 使用要点

- `content_level='summary'` 仅返回 title + abstract + summary，token 成本低
- 超长内容 `truncated=true`，告知用户仅显示部分
- voice 类型的 `transcripts` 含时间戳和说话人标记
- 若 `note_state !== 'completed'`，内容可能不完整

---

## 3. get_note_status — 笔记状态查询

### 输入 Schema

```typescript
{
  note_id: string;    // 必填
}
```

### 响应结构

```typescript
{
  success: true;
  data: {
    note_id: string;
    state: 'completed' | 'pending' | 'recognizing' | 'analyzing' | 'failed';
    readable: boolean;           // state === 'completed' 时为 true
    suggested_action: string;    // "可以读取" 或 "等待 5 秒后重试" 等
  };
}
```

### 状态说明

| state | 含义 | Agent 行为 |
|-------|------|-----------|
| `completed` | 处理完成 | 可调用 get_note 读取 |
| `pending` | 等待处理 | 建议等待 5 秒 |
| `recognizing` | 语音识别中 | 建议等待 10 秒 |
| `analyzing` | 分析/总结中 | 建议等待 5 秒 |
| `failed` | 处理失败 | 告知用户 |

### 特殊值

- 不存在的 noteId 返回 `NOT_FOUND` 错误（底层 `noteState === "null"` 字符串）

---

## 4. create_note — 创建笔记

### 输入 Schema

```typescript
{
  type: 'text' | 'link';      // 必填。V1 仅支持 text 和 link
  content: string;             // 必填。text=文字内容，link=URL
  title?: string;              // text 类型建议填写
  scene_id?: string;           // 可选。场景 ID（从 list_scenes 获取）
  generate_summary?: boolean;  // 可选。仅 text 类型有效，默认 false
}
```

### 响应结构

```typescript
{
  success: true;
  data: {
    note_id: string;
    title: string;
    note_type: string;
    create_time: string;
    note_state: string;
    scene_name: string | null;
    summary_requested: boolean;
  };
}
```

### 使用要点

- `type='text'` 时 `title` 建议必填，否则平台可能生成默认标题
- `scene_id` 类型为 string，内部自动转 int64
- `generate_summary=true` 时会异步生成总结，需用 `get_note_status` 轮询
- voice/image/document 类型需先上传文件获取 fileId，V1 不暴露上传工具

---

## 5. update_note — 修改笔记元数据

### 输入 Schema

```typescript
{
  note_id: string;       // 必填
  title?: string;        // 不传则不修改
  abstract?: string;     // 不传则不修改
  summary?: string;      // 不传则不修改
  // 至少传入一个修改字段，否则返回 INVALID_INPUT
}
```

### 响应结构

```typescript
{
  success: true;
  data: {
    note_id: string;
    updated_fields: string[];   // 如 ["title", "abstract"]
    success: boolean;
  };
}
```

### 关键限制

- **不支持正文更新**——仅 title/abstract/summary
- 若用户要求修改正文，告知不支持并建议创建新笔记
- 三个字段至少传一个，全不传返回错误

---

## 6. list_scenes — 场景列表

### 输入 Schema

```typescript
{
  source?: 'my' | 'inner' | 'all';    // 默认 'all'
  include_shared?: boolean;            // 仅 source=my/all 时有效，默认 true
}
```

### 响应结构

```typescript
{
  success: true;
  data: {
    scenes: Array<{
      scene_id: string;
      name: string;
      description: string | null;
      category: string;         // 分类名称
      source: 'my' | 'inner';
    }>;
    total: number;
  };
}
```

### 使用要点

- `scene_id` 可直接用于 `create_note` 的 `scene_id` 参数
- `category` 为场景分类名称，可帮助 AI 选择合适场景
- `source='inner'` 返回平台内置场景（如"通用会议"、"访谈纪要"等）

---

## 7. list_knowledge_collections — 笔记集列表

### 输入 Schema

```typescript
{
  scope?: 'owned' | 'received' | 'all';  // 默认 'all'
  page?: number;                          // 默认 1
  page_size?: number;                     // 默认 10，最大 20
}
```

### 响应结构

```typescript
{
  success: true;
  data: {
    collections: Array<{
      knowledge_id: string;
      name: string;
      description: string;
      attribute: 'private' | 'restricted' | 'public';
      type: 'person' | 'team';
      content_count: number;
      owner_name: string;
      source: 'owned' | 'received';
      editable?: boolean;
      latest_note?: { note_id: string; name: string; type: string; };
    }>;
    metadata: { total: number; page: number; has_more: boolean; };
  };
}
```

### scope 说明

| scope | 调用的底层接口 | 含义 |
|-------|--------------|------|
| `owned` | queryNoteKnowledge | 我创建的笔记集 |
| `received` | queryNoteKnowledgeEmpower | 别人授权给我的 |
| `all` | 并发调用两个接口 | 全部 |

---

## 8. get_knowledge_collection — 读取笔记集

### 输入 Schema

```typescript
{
  knowledge_id: string;    // 必填
  page?: number;           // 默认 1
  page_size?: number;      // 默认 10，最大 20
}
```

### 响应结构

```typescript
{
  success: true;
  data: {
    knowledge_id: string;
    name: string;
    description: string;
    attribute: string;
    note_count: number;
    file_count: number;
    editable: boolean;
    notes: Array<{
      note_id: string;
      name: string;
      summary: string | null;
      note_type: string;
      scene_name: string | null;
      update_time: string;
    }>;
    metadata: { total: number; page: number; has_more: boolean; };
  };
}
```

---

## 9. list_knowledge_cards — 知识卡列表

### 输入 Schema

```typescript
{
  page?: number;       // 默认 1
  page_size?: number;  // 默认 10，最大 20
}
```

### 响应结构

```typescript
{
  success: true;
  data: {
    knowledge_cards: Array<{
      id: string;
      name: string;
      summary: string;
      status: string;
      cards: Array<{
        id: string;
        title: string;       // 问题
        answer: string;      // 简要回答
        remarks: string;     // 深度解析（Markdown）
        summary: null;
      }>;
    }>;
    metadata: { total: number; page: number; has_more: boolean; };
  };
}
```

### 知识卡结构说明

每个知识卡笔记包含多张卡片（`cards`），每张卡片是一个 Q&A 对：
- `title` = 问题
- `answer` = 简要回答（1-2 句）
- `remarks` = 深度解析，Markdown 格式，含固定章节：核心结论、原文依据、深度解析、类比理解、注意事项

知识卡笔记的 `id` 可用于 `get_note` 读取完整内容。
