import type { ZzjlApiClient } from '../api/client.js';
import { toolSuccess, toolError, type ToolResult } from '../api/types.js';
import type { ApiError } from '../api/client.js';

interface NoteDetailItem {
  noteId: string;
  name: string;
  summary: string | null;
  noteType: string;
  templateName: string | null;
  noteUpdateTime: string;
}

interface KnowledgeDetailRaw {
  knowledgeId: string;
  knowledgeName: string;
  knowledgeDetail: string;
  knowledgeAttribute: string;
  noteTotal: number;
  fileTotal: number;
  editable: boolean;
  pageInfo?: {
    total: string;
    list: NoteDetailItem[];
    hasNextPage: boolean;
  };
}

interface GetKnowledgeCollectionInput {
  knowledge_id: string;
  page?: number;
  page_size?: number;
}

interface GetKnowledgeCollectionOutput {
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
}

export const getKnowledgeCollectionSchema = {
  name: 'get_knowledge_collection',
  description: '读取指定笔记集的详情和包含的笔记列表。',
  inputSchema: {
    type: 'object' as const,
    properties: {
      knowledge_id: {
        type: 'string',
        description: '笔记集 ID（从 list_knowledge_collections 获取）',
      },
      page: {
        type: 'integer',
        description: '笔记列表页码，默认 1',
        default: 1,
      },
      page_size: {
        type: 'integer',
        description: '每页笔记数量，默认 10，上限 20',
        default: 10,
        maximum: 20,
      },
    },
    required: ['knowledge_id'],
  },
};

export async function handleGetKnowledgeCollection(
  client: ZzjlApiClient,
  input: GetKnowledgeCollectionInput,
): Promise<ToolResult<GetKnowledgeCollectionOutput>> {
  const page = input.page ?? 1;
  const pageSize = Math.min(input.page_size ?? 10, 20);

  try {
    const raw = await client.call<KnowledgeDetailRaw>('queryNoteKnowledgeDetail', {
      knowledgeId: input.knowledge_id,
      pageNum: page,
      pageSize,
    });

    if (!raw) {
      return toolError('NOT_FOUND', `笔记集 ${input.knowledge_id} 不存在`, false);
    }

    const attrMap: Record<string, string> = {
      private: 'private', restricted: 'restricted', public: 'public',
      '0': 'private', '1': 'restricted', '2': 'public',
    };
    const noteList = raw.pageInfo?.list ?? [];
    const notes = noteList.map((n) => ({
      note_id: String(n.noteId),
      name: n.name ?? '',
      summary: n.summary ?? null,
      note_type: n.noteType ?? '',
      scene_name: n.templateName ?? null,
      update_time: n.noteUpdateTime ?? '',
    }));

    const total = parseInt(raw.pageInfo?.total ?? '0', 10) || raw.noteTotal || 0;

    return toolSuccess(
      {
        knowledge_id: String(raw.knowledgeId),
        name: raw.knowledgeName ?? '',
        description: raw.knowledgeDetail ?? '',
        attribute: attrMap[String(raw.knowledgeAttribute)] ?? 'private',
        note_count: raw.noteTotal ?? 0,
        file_count: raw.fileTotal ?? 0,
        editable: raw.editable ?? false,
        notes,
      },
      { total, page, has_more: raw.pageInfo?.hasNextPage ?? false },
    );
  } catch (err) {
    const e = err as ApiError;
    return toolError(e.code ?? 'UPSTREAM_ERROR', e.message, e.retryable ?? true);
  }
}
