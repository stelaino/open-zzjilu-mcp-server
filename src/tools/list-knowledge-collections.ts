import type { ZzjlApiClient } from '../api/client.js';
import { toolSuccess, toolError, type ToolResult, type PageInfo } from '../api/types.js';
import type { ApiError } from '../api/client.js';

interface KnowledgeRaw {
  knowledgeId: string;
  knowledgeName: string;
  knowledgeDetail: string;
  knowledgeAttribute: string;
  knowledgeType: string;
  contentTotal: number;
  userName: string;
  editable?: boolean;
  noteId?: string;
  noteName?: string;
  noteType?: string;
}

interface ListKnowledgeCollectionsInput {
  scope?: 'owned' | 'received' | 'all';
  page?: number;
  page_size?: number;
}

interface CollectionItem {
  knowledge_id: string;
  name: string;
  description: string;
  attribute: 'private' | 'restricted' | 'public';
  type: 'person' | 'team';
  content_count: number;
  owner_name: string;
  source: 'owned' | 'received';
  editable?: boolean;
  latest_note?: {
    note_id: string;
    name: string;
    type: string;
  };
}

interface ListKnowledgeCollectionsOutput {
  collections: CollectionItem[];
}

const ATTR_MAP: Record<string, 'private' | 'restricted' | 'public'> = {
  private: 'private',
  restricted: 'restricted',
  public: 'public',
  '0': 'private',
  '1': 'restricted',
  '2': 'public',
};

const TYPE_MAP: Record<string, 'person' | 'team'> = {
  person: 'person',
  team: 'team',
  '0': 'person',
  '1': 'team',
};

export const listKnowledgeCollectionsSchema = {
  name: 'list_knowledge_collections',
  description: '列出我创建的或收到的笔记集（知识库）。',
  inputSchema: {
    type: 'object' as const,
    properties: {
      scope: {
        type: 'string',
        enum: ['owned', 'received', 'all'],
        description: 'owned=我创建的，received=别人授权给我的，all=全部',
        default: 'all',
      },
      page: {
        type: 'integer',
        description: '页码，默认 1',
        default: 1,
      },
      page_size: {
        type: 'integer',
        description: '每页数量，默认 10，上限 20',
        default: 10,
        maximum: 20,
      },
    },
  },
};

export async function handleListKnowledgeCollections(
  client: ZzjlApiClient,
  input: ListKnowledgeCollectionsInput,
): Promise<ToolResult<ListKnowledgeCollectionsOutput>> {
  const scope = input.scope ?? 'all';
  const page = input.page ?? 1;
  const pageSize = Math.min(input.page_size ?? 10, 20);

  try {
    const allCollections: CollectionItem[] = [];
    let totalCount = 0;
    let hasMore = false;

    if (scope === 'owned' || scope === 'all') {
      const data = await client.call<PageInfo<KnowledgeRaw>>('queryNoteKnowledge', {
        qryType: 'myCreate',
        pageNum: page,
        pageSize,
      });
      if (data?.list) {
        for (const item of data.list) {
          allCollections.push(mapCollection(item, 'owned'));
        }
        totalCount += parseInt(data.total, 10) || 0;
        hasMore = hasMore || data.hasNextPage;
      }
    }

    if (scope === 'received' || scope === 'all') {
      const data = await client.call<PageInfo<KnowledgeRaw>>('queryNoteKnowledgeEmpower', {
        qryEmpowerToMe: true,
        qryEmpowerFromMe: false,
        pageNum: page,
        pageSize,
      });
      if (data?.list) {
        for (const item of data.list) {
          allCollections.push(mapCollection(item, 'received'));
        }
        totalCount += parseInt(data.total, 10) || 0;
        hasMore = hasMore || data.hasNextPage;
      }
    }

    return toolSuccess(
      { collections: allCollections },
      { total: totalCount, page, has_more: hasMore },
    );
  } catch (err) {
    const e = err as ApiError;
    return toolError(e.code ?? 'UPSTREAM_ERROR', e.message, e.retryable ?? true);
  }
}

function mapCollection(raw: KnowledgeRaw, source: 'owned' | 'received'): CollectionItem {
  const item: CollectionItem = {
    knowledge_id: String(raw.knowledgeId),
    name: raw.knowledgeName ?? '',
    description: raw.knowledgeDetail ?? '',
    attribute: ATTR_MAP[String(raw.knowledgeAttribute)] ?? 'private',
    type: TYPE_MAP[String(raw.knowledgeType)] ?? 'person',
    content_count: raw.contentTotal ?? 0,
    owner_name: raw.userName ?? '',
    source,
  };
  if (source === 'received') {
    item.editable = raw.editable ?? false;
  }
  if (raw.noteId) {
    item.latest_note = {
      note_id: String(raw.noteId),
      name: raw.noteName ?? '',
      type: raw.noteType ?? '',
    };
  }
  return item;
}
