import type { ZzjlApiClient } from '../api/client.js';
import { toolSuccess, toolError, type ToolResult, type PageInfo } from '../api/types.js';
import type { ApiError } from '../api/client.js';

interface KnowledgeCardNoteRaw {
  id: string;
  name: string;
  summary: string | null;
  status: string;
  cards: Array<{
    id: string;
    title: string;
    answer: string;
    remarks: string | null;
    summary: string | null;
  }> | null;
}

interface ListKnowledgeCardsInput {
  page?: number;
  page_size?: number;
}

interface ListKnowledgeCardsOutput {
  knowledge_cards: Array<{
    id: string;
    name: string;
    summary: string | null;
    card_count: number;
    cards: Array<{
      card_id: string;
      question: string;
      answer: string;
      remarks: string | null;
    }>;
  }>;
}

export const listKnowledgeCardsSchema = {
  name: 'list_knowledge_cards',
  description:
    '列出我的知识卡笔记。知识卡是结构化的问答对，包含核心结论和深度解析。',
  inputSchema: {
    type: 'object' as const,
    properties: {
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

export async function handleListKnowledgeCards(
  client: ZzjlApiClient,
  input: ListKnowledgeCardsInput,
): Promise<ToolResult<ListKnowledgeCardsOutput>> {
  const page = input.page ?? 1;
  const pageSize = Math.min(input.page_size ?? 10, 20);

  try {
    const data = await client.call<PageInfo<KnowledgeCardNoteRaw>>(
      'queryKnowledgeCardByPage',
      { pageNum: page, pageSize },
    );

    if (!data?.list) {
      return toolSuccess(
        { knowledge_cards: [] },
        { total: 0, page, has_more: false },
      );
    }

    const cards = data.list.map((note) => ({
      id: String(note.id),
      name: note.name ?? '',
      summary: note.summary ?? null,
      card_count: note.cards?.length ?? 0,
      cards: (note.cards ?? []).map((c) => ({
        card_id: String(c.id),
        question: c.title ?? '',
        answer: c.answer ?? '',
        remarks: c.remarks ?? null,
      })),
    }));

    return toolSuccess(
      { knowledge_cards: cards },
      {
        total: parseInt(data.total, 10) || 0,
        page,
        has_more: data.hasNextPage ?? false,
      },
    );
  } catch (err) {
    const e = err as ApiError;
    return toolError(e.code ?? 'UPSTREAM_ERROR', e.message, e.retryable ?? true);
  }
}
