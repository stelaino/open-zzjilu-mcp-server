import type { ZzjlApiClient } from '../api/client.js';
import { toolSuccess, toolError, type ToolResult } from '../api/types.js';
import type { ApiError } from '../api/client.js';
import type { PageInfo } from '../api/types.js';

interface NoteListItem {
  id: string;
  title: string;
  abstract: string | null;
  note_type: string;
  create_time: string;
  note_state: string;
  scene_name: string | null;
}

interface SearchNotesInput {
  query: string;
  note_type?: 'voice' | 'text' | 'image' | 'document' | 'link';
  start_time?: string;
  end_time?: string;
  max_results?: number;
}

interface SearchNotesOutput {
  notes: Array<{
    note_id: string;
    title: string;
    abstract: string | null;
    note_type: string;
    create_time: string;
    note_state: string;
    scene_name: string | null;
  }>;
}

const VALID_NOTE_TYPES = new Set(['voice', 'text', 'image', 'document', 'link']);

export const searchNotesSchema = {
  name: 'search_notes',
  description:
    '按主题、时间范围检索笔记。返回摘要列表，不包含正文。使用 get_note 读取完整内容。',
  inputSchema: {
    type: 'object' as const,
    properties: {
      query: {
        type: 'string',
        description: '搜索主题（将同时匹配标题、摘要、总结和内容）',
      },
      note_type: {
        type: 'string',
        enum: ['voice', 'text', 'image', 'document', 'link'],
        description: '可选：按笔记类型筛选',
      },
      start_time: {
        type: 'string',
        description: '可选：开始时间（yyyy-MM-dd 或 yyyy-MM-dd HH:mm:ss）',
      },
      end_time: {
        type: 'string',
        description: '可选：结束时间',
      },
      max_results: {
        type: 'integer',
        description: '最大返回数量，默认 10，上限 20',
        default: 10,
        minimum: 1,
        maximum: 20,
      },
    },
    required: ['query'],
  },
};

export async function handleSearchNotes(
  client: ZzjlApiClient,
  input: SearchNotesInput,
): Promise<ToolResult<SearchNotesOutput>> {
  const maxResults = Math.min(input.max_results ?? 10, 20);

  try {
    const searchFields = ['title', 'abstract', 'summary', 'content'] as const;
    const seen = new Set<string>();
    const allNotes: SearchNotesOutput['notes'] = [];

    for (const field of searchFields) {
      const params: Record<string, unknown> = {
        [field]: input.query,
        pageNum: 1,
        pageSize: maxResults,
      };

      if (input.note_type !== undefined && VALID_NOTE_TYPES.has(input.note_type)) {
        params.noteType = input.note_type;
      }
      if (input.start_time) params.startTime = input.start_time;
      if (input.end_time) params.endTime = input.end_time;

      const page = await client.call<PageInfo<NoteListItem>>('queryNoteList', params);
      if (!page?.list) continue;

      for (const item of page.list) {
        const id = String(item.id);
        if (seen.has(id)) continue;
        seen.add(id);
        allNotes.push({
          note_id: id,
          title: item.title ?? '',
          abstract: item.abstract ?? null,
          note_type: mapNoteType(item.note_type),
          create_time: item.create_time ?? '',
          note_state: mapNoteState(item.note_state),
          scene_name: item.scene_name ?? null,
        });
      }
      if (allNotes.length >= maxResults) break;
    }

    const result = allNotes.slice(0, maxResults);
    return toolSuccess(
      { notes: result },
      {
        total: allNotes.length,
        search_mode: 'lexical',
        has_more: allNotes.length > maxResults,
      },
    );
  } catch (err) {
    const e = err as ApiError;
    return toolError(e.code ?? 'UPSTREAM_ERROR', e.message, e.retryable ?? true);
  }
}

function mapNoteType(raw: string | number): string {
  const map: Record<string, string> = {
    '0': 'voice',
    '1': 'text',
    '2': 'image',
    '3': 'document',
    '4': 'link',
  };
  return map[String(raw)] ?? String(raw);
}

function mapNoteState(raw: string | number): string {
  const map: Record<string, string> = {
    '0': 'pending',
    '1': 'recognizing',
    '2': 'analyzing',
    '3': 'completed',
    '4': 'failed',
  };
  return map[String(raw)] ?? String(raw);
}
