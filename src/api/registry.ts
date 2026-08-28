export interface ApiRegistryEntry {
  operationId: string;
  method: 'GET' | 'POST';
  path: string;
  contentType: string | null;
  paramMode: 'query' | 'body';
  description: string;
}

export const API_REGISTRY: Record<string, ApiRegistryEntry> = {
  queryNoteList: {
    operationId: 'post_queryNoteList',
    method: 'POST',
    path: '/api/v1/note/queryNoteList',
    contentType: 'application/json',
    paramMode: 'body',
    description: '查询笔记列表',
  },
  querySingleNoteDetail: {
    operationId: 'get_querySingleNoteDetail',
    method: 'GET',
    path: '/api/v1/note/querySingleNoteDetail',
    contentType: null,
    paramMode: 'query',
    description: '查询笔记详情',
  },
  queryNoteStatus: {
    operationId: 'get_queryNoteStatus',
    method: 'GET',
    path: '/api/v1/note/queryNoteStatus',
    contentType: null,
    paramMode: 'query',
    description: '查询笔记状态',
  },
  createNote: {
    operationId: 'post_createNote',
    method: 'POST',
    path: '/api/v1/note/createNote',
    contentType: 'application/json',
    paramMode: 'body',
    description: '创建笔记',
  },
  createTextNoteSummary: {
    operationId: 'post_createTextNoteSummary',
    method: 'POST',
    path: '/api/v1/note/createTextNoteSummary',
    contentType: 'application/json',
    paramMode: 'body',
    description: '生成文字笔记总结',
  },
  updateNote: {
    operationId: 'post_updateNote',
    method: 'POST',
    path: '/api/v1/note/updateNote',
    contentType: 'application/json',
    paramMode: 'body',
    description: '修改笔记标题、摘要或总结',
  },
  queryMySceneList: {
    operationId: 'get_queryMySceneList',
    method: 'GET',
    path: '/api/v1/note/queryMySceneList',
    contentType: null,
    paramMode: 'query',
    description: '查询我的场景列表',
  },
  queryInnerSceneList: {
    operationId: 'get_queryInnerSceneList',
    method: 'GET',
    path: '/api/v1/note/queryInnerSceneList',
    contentType: null,
    paramMode: 'query',
    description: '查询内置场景列表',
  },
  queryNoteKnowledge: {
    operationId: 'post_queryNoteKnowledge',
    method: 'POST',
    path: '/api/v1/note/queryNoteKnowledge',
    contentType: 'application/json',
    paramMode: 'body',
    description: '查询我创建的笔记集',
  },
  queryNoteKnowledgeEmpower: {
    operationId: 'post_queryNoteKnowledgeEmpower',
    method: 'POST',
    path: '/api/v1/note/queryNoteKnowledgeEmpower',
    contentType: 'application/json',
    paramMode: 'body',
    description: '查询我收到的笔记集',
  },
  queryNoteKnowledgeDetail: {
    operationId: 'post_queryNoteKnowledgeDetail',
    method: 'POST',
    path: '/api/v1/note/queryNoteKnowledgeDetail',
    contentType: 'application/json',
    paramMode: 'body',
    description: '查询笔记集详情',
  },
  queryKnowledgeCardByPage: {
    operationId: 'post_queryKnowledgeCardByPage',
    method: 'POST',
    path: '/api/v1/note/queryKnowledgeCardByPage',
    contentType: 'application/json',
    paramMode: 'body',
    description: '分页查询我创建的知识卡笔记',
  },
};
