import type { ZzjlApiClient } from '../api/client.js';
import { toolSuccess, toolError, type ToolResult } from '../api/types.js';
import type { ApiError } from '../api/client.js';

interface UpdateNoteInput {
  note_id: string;
  title?: string;
  abstract?: string;
  summary?: string;
}

interface UpdateNoteOutput {
  note_id: string;
  updated_fields: string[];
  success: boolean;
}

export const updateNoteSchema = {
  name: 'update_note',
  description:
    '修改笔记的标题、摘要或总结。注意：当前仅支持修改这三个元数据字段，不支持修改笔记正文内容。至少需要提供一个待修改字段。',
  inputSchema: {
    type: 'object' as const,
    properties: {
      note_id: {
        type: 'string',
        description: '笔记 ID',
      },
      title: {
        type: 'string',
        description: '新的笔记标题（不传则不修改）',
      },
      abstract: {
        type: 'string',
        description: '新的笔记摘要（不传则不修改）',
      },
      summary: {
        type: 'string',
        description: '新的笔记总结（不传则不修改）',
      },
    },
    required: ['note_id'],
  },
};

export async function handleUpdateNote(
  client: ZzjlApiClient,
  input: UpdateNoteInput,
): Promise<ToolResult<UpdateNoteOutput>> {
  const updatedFields: string[] = [];
  if (input.title !== undefined) updatedFields.push('title');
  if (input.abstract !== undefined) updatedFields.push('abstract');
  if (input.summary !== undefined) updatedFields.push('summary');

  if (updatedFields.length === 0) {
    return toolError(
      'INVALID_INPUT',
      '至少需要提供一个待修改字段（title、abstract 或 summary）',
      false,
    );
  }

  try {
    const current = await client.call<{
      title: string;
      abstract: string;
      summary: string;
    }>('querySingleNoteDetail', { noteId: input.note_id });

    if (!current) {
      return toolError('NOT_FOUND', `笔记 ${input.note_id} 不存在`, false);
    }

    const params: Record<string, unknown> = {
      noteId: input.note_id,
      title: input.title ?? current.title ?? '',
      abstract: input.abstract ?? current.abstract ?? '',
      summary: input.summary ?? current.summary ?? '',
    };

    await client.call('updateNote', params);

    return toolSuccess({
      note_id: input.note_id,
      updated_fields: updatedFields,
      success: true,
    });
  } catch (err) {
    const e = err as ApiError;
    if (e.code === 'NOT_FOUND') {
      return toolError(
        'NOT_FOUND',
        `updateNote 接口暂未开放（HTTP 404），该工具将在接口可用后生效`,
        false,
        '当前 updateNote 接口尚未开放，请关注平台更新',
      );
    }
    return toolError(e.code ?? 'UPSTREAM_ERROR', e.message, e.retryable ?? true);
  }
}
