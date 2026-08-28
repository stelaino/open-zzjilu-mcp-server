import type { ZzjlApiClient } from '../api/client.js';
import { toolSuccess, toolError, type ToolResult } from '../api/types.js';
import type { ApiError } from '../api/client.js';

interface NoteStatusRaw {
  noteState: string | number;
}

interface GetNoteStatusInput {
  note_id: string;
}

interface GetNoteStatusOutput {
  note_id: string;
  state: string;
  readable: boolean;
  suggested_action: string;
}

const STATE_SUGGESTIONS: Record<string, string> = {
  completed: '内容已就绪，可以读取',
  pending: '笔记正在排队处理，建议 5 秒后重试',
  recognizing: '正在转写录音，建议 10 秒后重试',
  analyzing: '正在分析内容，建议 5 秒后重试',
  failed: '处理失败，请检查原始笔记',
};

export const getNoteStatusSchema = {
  name: 'get_note_status',
  description:
    '查询笔记的处理状态。录音类笔记需等待转写和总结完成后才能读取完整内容。',
  inputSchema: {
    type: 'object' as const,
    properties: {
      note_id: {
        type: 'string',
        description: '笔记 ID',
      },
    },
    required: ['note_id'],
  },
};

export async function handleGetNoteStatus(
  client: ZzjlApiClient,
  input: GetNoteStatusInput,
): Promise<ToolResult<GetNoteStatusOutput>> {
  try {
    const raw = await client.call<NoteStatusRaw>('queryNoteStatus', {
      noteId: input.note_id,
    });

    if (!raw || String(raw.noteState) === 'null') {
      return toolError(
        'NOT_FOUND',
        `笔记 ${input.note_id} 不存在`,
        false,
      );
    }

    const state = mapNoteState(raw.noteState);

    return toolSuccess({
      note_id: input.note_id,
      state,
      readable: state === 'completed',
      suggested_action: STATE_SUGGESTIONS[state] ?? '未知状态',
    });
  } catch (err) {
    const e = err as ApiError;
    return toolError(e.code ?? 'UPSTREAM_ERROR', e.message, e.retryable ?? true);
  }
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
