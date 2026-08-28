import type { ZzjlApiClient } from '../api/client.js';
import { toolSuccess, toolError, type ToolResult } from '../api/types.js';
import type { ApiError } from '../api/client.js';

interface SceneItem {
  id: string | number;
  scene_name: string;
  scene_desc: string | null;
}

type SceneListResponse = Record<string, SceneItem[] | Record<string, string>> & {
  groupInfo?: Record<string, string>;
};

interface ListScenesInput {
  source?: 'my' | 'inner' | 'all';
  include_shared?: boolean;
}

interface ListScenesOutput {
  scenes: Array<{
    scene_id: string;
    name: string;
    description: string | null;
    category: string;
    source: 'my' | 'inner';
  }>;
  total: number;
}

export const listScenesSchema = {
  name: 'list_scenes',
  description: '列出可用的场景模板。场景可用于创建笔记时指定自动总结模板。',
  inputSchema: {
    type: 'object' as const,
    properties: {
      source: {
        type: 'string',
        enum: ['my', 'inner', 'all'],
        description: '场景来源：my=我的场景，inner=内置场景，all=全部',
        default: 'all',
      },
      include_shared: {
        type: 'boolean',
        description: '是否包含共享场景（仅 source=my/all 时有效）',
        default: true,
      },
    },
  },
};

export async function handleListScenes(
  client: ZzjlApiClient,
  input: ListScenesInput,
): Promise<ToolResult<ListScenesOutput>> {
  const source = input.source ?? 'all';
  const includeShared = input.include_shared ?? true;

  try {
    const scenes: ListScenesOutput['scenes'] = [];

    if (source === 'my' || source === 'all') {
      const raw = await client.call<SceneItem[]>('queryMySceneList', {
        includeSharedFlag: includeShared,
      });
      parseSceneResponse(raw, 'my', scenes);
    }

    if (source === 'inner' || source === 'all') {
      const raw = await client.call<SceneListResponse>('queryInnerSceneList', {});
      parseSceneResponse(raw, 'inner', scenes);
    }

    return toolSuccess({ scenes, total: scenes.length });
  } catch (err) {
    const e = err as ApiError;
    return toolError(e.code ?? 'UPSTREAM_ERROR', e.message, e.retryable ?? true);
  }
}

function parseSceneResponse(
  raw: SceneListResponse | SceneItem[] | null,
  sceneSource: 'my' | 'inner',
  out: ListScenesOutput['scenes'],
): void {
  if (!raw) return;

  if (Array.isArray(raw)) {
    for (const s of raw as SceneItem[]) {
      out.push({
        scene_id: String(s.id),
        name: s.scene_name ?? '',
        description: s.scene_desc ?? null,
        category: '',
        source: sceneSource,
      });
    }
    return;
  }

  const groupInfo = (raw as SceneListResponse).groupInfo ?? {};

  for (const [groupCode, items] of Object.entries(raw)) {
    if (groupCode === 'groupInfo') continue;
    if (!Array.isArray(items)) continue;
    const categoryName = groupInfo[groupCode] ?? groupCode;
    for (const s of items as SceneItem[]) {
      out.push({
        scene_id: String(s.id),
        name: s.scene_name ?? '',
        description: s.scene_desc ?? null,
        category: categoryName,
        source: sceneSource,
      });
    }
  }
}
