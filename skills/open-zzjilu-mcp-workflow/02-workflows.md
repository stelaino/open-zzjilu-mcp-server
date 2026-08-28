# 工作流编排策略

## 1. 知识问答工作流

**场景**：用户让 AI 基于智在记录中的笔记回答问题。

### 决策树

```
用户提问
  ↓
判断是否有明确 note_id
  ├─ 有 → 直接 get_note(note_id)
  └─ 无 → 进入检索流程
         ↓
search_notes(query, note_type?, start_time?, end_time?)
  ↓
返回结果
  ├─ notes 为空 → 告知"未找到相关笔记"，建议换关键词或扩大时间
  ├─ 1-3 条 → 逐条 get_note(content_level="full") 读取
  └─ >3 条 → 展示摘要列表，询问用户选哪几条深入阅读
         ↓
get_note(note_id, content_level)
  ├─ note_state=completed → 基于内容回答
  ├─ note_state≠completed → 告知"该笔记正在处理中"
  └─ truncated=true → 告知"内容已截断，仅显示部分"
```

### 参数选择策略

| 情况 | query 构造 | 其他参数 |
|------|-----------|---------|
| 用户说"找纺织的录音" | query="纺织" | note_type="voice" |
| 用户说"上周的会议" | query="会议" | start_time=上周一, end_time=上周日 |
| 用户说"关于 X 的笔记" | query="X" | 不加限制 |
| 用户说"最近 3 条" | query=上下文推断 | max_results=3 |

### 正文读取策略

| content_level | 使用场景 |
|--------------|---------|
| `summary` | 仅需摘要/总结时，token 成本低 |
| `full` | 需要完整内容回答时，注意截断 |

---

## 2. 知识沉淀工作流

**场景**：用户要求 AI 将信息保存到智在记录。

### 决策树

```
用户要求保存信息
  ↓
判断内容类型
  ├─ 纯文字内容 → type="text"
  │   ├─ 用户指定了标题 → 使用指定标题
  │   └─ 未指定标题 → AI 根据内容生成标题
  │
  └─ URL → type="link"
      └─ content 直接为 URL
  ↓
是否需要场景化总结？
  ├─ 用户要求 → list_scenes(source="all") → 选择匹配场景
  ├─ AI 判断有价值 → 询问用户是否使用场景
  └─ 不需要 → 跳过
  ↓
是否生成平台总结？
  ├─ 内容较长（>200字） → generate_summary=true
  └─ 短内容 → generate_summary=false
  ↓
create_note(type, title, content, scene_id?, generate_summary?)
  ↓
创建成功
  ├─ generate_summary=true → get_note_status 轮询
  │   ├─ completed → 告知"已保存，总结已生成"
  │   └─ 未完成 → 告知"已保存，总结正在生成中"
  └─ generate_summary=false → 告知"已保存"
```

### 场景选择策略

```
list_scenes 返回的场景列表
  ↓
按 category 和 name 与用户意图匹配
  ├─ 会议相关 → 优先"通用会议"或类似场景
  ├─ 访谈相关 → 优先"访谈纪要"
  ├─ 学习相关 → 优先"学习笔记"
  └─ 不确定 → 不指定场景，或询问用户
```

### 内容格式化建议

AI 创建笔记前应将内容整理为结构化 Markdown：

```markdown
## 核心结论
1. 结论一
2. 结论二

## 详细内容
...

## 行动项
- [ ] 待办 1
- [ ] 待办 2
```

---

## 3. 笔记元数据维护工作流

**场景**：用户要求修改笔记的标题、摘要或总结。

### 决策树

```
用户要求修改笔记
  ↓
判断修改目标
  ├─ 修改标题/摘要/总结 → 继续
  └─ 修改正文 → ⚠️ 告知"不支持正文更新，建议创建新笔记"
  ↓
是否有 note_id？
  ├─ 有 → 直接 update_note
  └─ 无 → search_notes 找到目标笔记
         ├─ 唯一匹配 → 使用该 note_id
         └─ 多条匹配 → 展示列表让用户选择
  ↓
update_note(note_id, title?, abstract?, summary?)
  ├─ 至少一个修改字段 → 继续
  └─ 无修改字段 → 返回 INVALID_INPUT
  ↓
成功 → get_note(note_id, content_level="summary") 确认修改
```

### 字段修改策略

| 用户需求 | 传入字段 |
|---------|---------|
| "把标题改成 X" | title="X" |
| "更新摘要为 Y" | abstract="Y" |
| "重新总结这条笔记" | summary="AI 生成的新总结" |
| "把标题和摘要都改一下" | title + abstract |

---

## 4. 知识空间浏览工作流

**场景**：用户要浏览自己的知识空间。

### 决策树

```
用户要求浏览知识空间
  ↓
list_knowledge_collections(scope)
  ├─ "我的笔记集" → scope="owned"
  ├─ "别人分享给我的" → scope="received"
  └─ "全部" / 未指定 → scope="all"
  ↓
返回笔记集列表
  ├─ 为空 → 告知"暂无笔记集"
  └─ 有内容 → 展示列表（名称、描述、笔记数量）
  ↓
用户选择某个笔记集
  ↓
get_knowledge_collection(knowledge_id, page, page_size)
  ↓
返回笔记列表
  ├─ has_more=true → 提示"还有更多笔记，是否继续查看"
  └─ has_more=false → 展示全部
  ↓
用户选择某条笔记
  ↓
get_note(note_id, content_level="full")
```

### 分页策略

- 首次查询使用 `page=1, page_size=10`
- 用户要看更多时递增 `page`
- **不要**一次性拉取所有页面

---

## 5. 异步笔记处理工作流

**场景**：创建笔记后需等待异步处理完成。

### 轮询策略

```
create_note 返回 note_id
  ↓
首次等待 3 秒
  ↓
get_note_status(note_id)
  ├─ completed → 成功，可读取
  ├─ pending → 等待 5 秒后重试
  ├─ recognizing → 等待 10 秒后重试（语音识别耗时较长）
  ├─ analyzing → 等待 5 秒后重试
  └─ failed → 告知用户处理失败
  ↓
最多轮询 3 次
  └─ 超过 3 次仍未完成 → 告知用户"正在处理中，请稍后查看"
```

### 重要约束

- **不要**无限轮询——最多 3 次
- 每次等待间隔逐步增加（3s → 5s → 10s）
- 若用户不急于使用，可跳过轮询直接告知 note_id

---

## 6. 对话沉淀到智在记录工作流

**场景**：AI 将当前对话的核心内容总结后保存到智在记录。

### 编排策略

此工作流**不需要额外 Prompt**——AI 天然具备对话总结能力，仅需 `create_note` 作为"写入端口"。

```
用户："把这次对话保存到智在记录"
  ↓
AI 自行整理当前对话上下文
  ├─ 提取核心结论
  ├─ 提取行动项
  ├─ 提取关键决策
  └─ 组织为结构化 Markdown
  ↓
list_scenes(source="all")                    ← 可选
  → 匹配合适场景（如"通用会议"、"工作汇报"）
  ↓
create_note(
  type="text",
  title="[日期] 对话主题",                   ← AI 自动生成标题
  content="## 核心结论\n...\n## 行动项\n...",
  scene_id="匹配的场景ID",                   ← 可选
  generate_summary=true                      ← 推荐
)
  ↓
get_note(note_id, content_level="summary")   ← 确认保存
  → 告知用户"已保存到智在记录，标题为《...》"
```

### 内容模板

```markdown
# [对话主题]

## 核心结论
1. [结论 1]
2. [结论 2]

## 关键讨论
- [讨论要点 1]
- [讨论要点 2]

## 行动项
- [ ] [待办 1]（负责人/时间）
- [ ] [待办 2]

## 背景信息
[对话发生的背景和上下文]
```

### 标题命名规范

- 格式：`[YYYY-MM-DD] 主题关键词`
- 示例：`[2026-08-27] MCP Server 需求设计评审`
- 避免使用过于泛化的标题如"对话记录"
