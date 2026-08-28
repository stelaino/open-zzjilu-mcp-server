# 贡献指南

感谢你对 open-zzjilu-mcp-server 的关注！欢迎提交 Issue 和 Pull Request。

## 开发环境

- Node.js >= 20 LTS
- npm >= 9

## 开始开发

```bash
git clone https://github.com/stelaino/open-zzjilu-mcp-server.git
cd open-zzjilu-mcp-server
npm install
npm run dev
```

## 代码规范

- TypeScript strict mode
- 使用 ES Module (`"type": "module"`)
- 文件命名：kebab-case（如 `search-notes.ts`）
- 导出函数命名：camelCase（如 `handleSearchNotes`）

## 提交规范

使用中文 commit message，格式：

```
<类型>: <描述>

<可选正文>
```

类型：
- `初始化` / `新增` / `修复` / `优化` / `文档` / `测试` / `构建`

## 添加新工具

参考 `AGENTS.md` 中「添加新工具的步骤」章节。

## 测试

```bash
ZZJL_API_KEY='your-key' node --import tsx/esm tests/smoke/smoke-test.ts
```

## Pull Request

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/your-feature`)
3. 提交更改
4. 推送到你的 Fork
5. 提交 Pull Request

请确保：
- `npm run build` 无报错
- 新工具有对应的冒烟测试
- 更新了相关文档
