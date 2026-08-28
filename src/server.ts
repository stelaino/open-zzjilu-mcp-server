import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { EnvConfig } from './config/env.js';
import { ZzjlApiClient } from './api/client.js';
import {
  handleSearchNotes,
  handleGetNote,
  handleGetNoteStatus,
  handleCreateNote,
  handleUpdateNote,
  handleListScenes,
  handleListKnowledgeCollections,
  handleGetKnowledgeCollection,
  handleListKnowledgeCards,
} from './tools/index.js';

export function createServer(config: EnvConfig): McpServer {
  const server = new McpServer({
    name: 'open-zzjilu-mcp-server',
    version: '1.0.0',
  });

  const client = new ZzjlApiClient(config);

  server.tool(
    'search_notes',
    '按主题、时间范围检索笔记。返回摘要列表，不包含正文。使用 get_note 读取完整内容。',
    {
      query: z.string().describe('搜索主题（将同时匹配标题、摘要、总结和内容）'),
      note_type: z
        .enum(['voice', 'text', 'image', 'document', 'link'])
        .optional()
        .describe('可选：按笔记类型筛选'),
      start_time: z.string().optional().describe('可选：开始时间（yyyy-MM-dd 或 yyyy-MM-dd HH:mm:ss）'),
      end_time: z.string().optional().describe('可选：结束时间'),
      max_results: z.number().int().min(1).max(20).default(10).describe('最大返回数量，默认 10，上限 20'),
    },
    async (args) => {
      const result = await handleSearchNotes(client, args);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'get_note',
    '读取指定笔记的完整内容。异步笔记（录音）在状态为 completed 前内容不完整，请先用 get_note_status 确认。',
    {
      note_id: z.string().describe('笔记 ID'),
      content_level: z
        .enum(['summary', 'full'])
        .default('full')
        .describe('内容级别：summary 仅返回摘要和总结，full 返回完整正文'),
    },
    async (args) => {
      const result = await handleGetNote(client, args);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'get_note_status',
    '查询笔记的处理状态。录音类笔记需等待转写和总结完成后才能读取完整内容。',
    {
      note_id: z.string().describe('笔记 ID'),
    },
    async (args) => {
      const result = await handleGetNoteStatus(client, args);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'create_note',
    '创建笔记到智在记录。支持文字、链接类型。可指定场景 ID 触发自动总结。',
    {
      type: z.enum(['text', 'link']).describe('笔记类型。仅支持 AI 直接创建 text 和 link 类型'),
      title: z.string().optional().describe('笔记标题（text 类型必填）'),
      content: z.string().describe('笔记内容（text 类型为文字内容，link 类型为 URL）'),
      scene_id: z.string().optional().describe('可选：场景 ID，可通过 list_scenes 获取'),
      generate_summary: z.boolean().default(false).describe('是否为文字笔记生成总结（仅 text 类型有效）'),
    },
    async (args) => {
      const result = await handleCreateNote(client, args);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'update_note',
    '修改笔记的标题、摘要或总结。不支持修改笔记正文内容。至少需要提供一个待修改字段。',
    {
      note_id: z.string().describe('笔记 ID'),
      title: z.string().optional().describe('新的笔记标题（不传则不修改）'),
      abstract: z.string().optional().describe('新的笔记摘要（不传则不修改）'),
      summary: z.string().optional().describe('新的笔记总结（不传则不修改）'),
    },
    async (args) => {
      const result = await handleUpdateNote(client, args);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'list_scenes',
    '列出可用的场景模板。场景可用于创建笔记时指定自动总结模板。',
    {
      source: z.enum(['my', 'inner', 'all']).default('all').describe('场景来源：my=我的场景，inner=内置场景，all=全部'),
      include_shared: z.boolean().default(true).describe('是否包含共享场景（仅 source=my/all 时有效）'),
    },
    async (args) => {
      const result = await handleListScenes(client, args);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'list_knowledge_collections',
    '列出我创建的或收到的笔记集（知识库）。',
    {
      scope: z.enum(['owned', 'received', 'all']).default('all').describe('owned=我创建的，received=别人授权给我的，all=全部'),
      page: z.number().int().default(1).describe('页码，默认 1'),
      page_size: z.number().int().max(20).default(10).describe('每页数量，默认 10，上限 20'),
    },
    async (args) => {
      const result = await handleListKnowledgeCollections(client, args);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'get_knowledge_collection',
    '读取指定笔记集的详情和包含的笔记列表。',
    {
      knowledge_id: z.string().describe('笔记集 ID（从 list_knowledge_collections 获取）'),
      page: z.number().int().default(1).describe('笔记列表页码，默认 1'),
      page_size: z.number().int().max(20).default(10).describe('每页笔记数量，默认 10，上限 20'),
    },
    async (args) => {
      const result = await handleGetKnowledgeCollection(client, args);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'list_knowledge_cards',
    '列出我的知识卡笔记。知识卡是结构化的问答对，包含核心结论和深度解析。',
    {
      page: z.number().int().default(1).describe('页码，默认 1'),
      page_size: z.number().int().max(20).default(10).describe('每页数量，默认 10，上限 20'),
    },
    async (args) => {
      const result = await handleListKnowledgeCards(client, args);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  return server;
}
