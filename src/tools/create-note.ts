import type { ZzjlApiClient } from '../api/client.js';
import { toolSuccess, toolError, type ToolResult } from '../api/types.js';
import type { ApiError } from '../api/client.js';

interface CreateNoteRaw {
  id: string;
  title: string;
  note_type: string;
  create_time: string;
  note_state: string;
  scene_name: string | null;
}

interface CreateNoteInput {
  type: 'text' | 'link';
  title?: string;
  content: string;
  scene_id?: string;
  generate_summary?: boolean;
}

interface CreateNoteOutput {
  note_id: string;
  title: string;
  note_type: string;
  create_time: string;
  note_state: string;
  scene_name: string | null;
  summary_requested: boolean;
}

export const createNoteSchema = {
  name: 'create_note',
  description:
    '创建笔记到智在记录。支持文字、链接类型。录音/图片/文档类型需要先上传文件。可指定场景 ID 触发自动总结。',
  inputSchema: {
    type: 'object' as const,
    properties: {
      type: {
        type: 'string',
        enum: ['text', 'link'],
        description: '笔记类型。仅支持 AI 直接创建 text 和 link 类型',
      },
      title: {
        type: 'string',
        description: '笔记标题（text 类型必填）',
      },
      content: {
        type: 'string',
        description: '笔记内容（text 类型为文字内容，link 类型为 URL）',
      },
      scene_id: {
        type: 'string',
        description: '可选：场景 ID，可通过 list_scenes 获取。指定后平台会自动生成场景化总结',
      },
      generate_summary: {
        type: 'boolean',
        description: '是否为文字笔记生成总结（仅 text 类型有效，默认 false）',
        default: false,
      },
    },
    required: ['type', 'content'],
  },
};

export async function handleCreateNote(
  client: ZzjlApiClient,
  input: CreateNoteInput,
): Promise<ToolResult<CreateNoteOutput>> {
  if (input.type === 'text' && !input.title) {
    return toolError('INVALID_INPUT', 'text 类型笔记必须提供 title', false);
  }

  if (input.type === 'link') {
    try {
      new URL(input.content);
    } catch {
      return toolError('INVALID_INPUT', 'link 类型的 content 必须是有效的 URL', false);
    }
  }

  try {
    const params: Record<string, unknown> = {};

    if (input.type === 'text') {
      params.noteType = 'text';
      params.textContent = {
        title: input.title,
        content: input.content,
      };
    } else {
      params.noteType = 'link';
      params.linkContent = {
        url: input.content,
      };
    }

    if (input.scene_id) {
      params.sceneId = parseInt(input.scene_id, 10) || input.scene_id;
    }

    const raw = await client.call<CreateNoteRaw>('createNote', params);

    let summaryRequested = false;
    if (
      input.type === 'text' &&
      input.generate_summary &&
      input.content
    ) {
      try {
        const summaryParams: Record<string, unknown> = {
          content: input.content,
        };
        if (input.scene_id) {
          summaryParams.sceneId = input.scene_id;
        }
        await client.callFireAndForget('createTextNoteSummary', summaryParams);
        summaryRequested = true;
      } catch {
        summaryRequested = false;
      }
    }

    return toolSuccess({
      note_id: String(raw.id),
      title: raw.title ?? input.title ?? '',
      note_type: input.type,
      create_time: raw.create_time ?? new Date().toISOString(),
      note_state: raw.note_state ?? 'completed',
      scene_name: raw.scene_name ?? null,
      summary_requested: summaryRequested,
    });
  } catch (err) {
    const e = err as ApiError;
    return toolError(e.code ?? 'UPSTREAM_ERROR', e.message, e.retryable ?? true);
  }
}
