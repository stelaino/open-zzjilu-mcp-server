import { ZzjlApiClient } from '../../src/api/client.js';
import type { EnvConfig } from '../../src/config/env.js';
import { handleSearchNotes } from '../../src/tools/search-notes.js';
import { handleGetNote } from '../../src/tools/get-note.js';
import { handleGetNoteStatus } from '../../src/tools/get-note-status.js';
import { handleCreateNote } from '../../src/tools/create-note.js';
import { handleUpdateNote } from '../../src/tools/update-note.js';
import { handleListScenes } from '../../src/tools/list-scenes.js';
import { handleListKnowledgeCollections } from '../../src/tools/list-knowledge-collections.js';
import { handleGetKnowledgeCollection } from '../../src/tools/get-knowledge-collection.js';
import { handleListKnowledgeCards } from '../../src/tools/list-knowledge-cards.js';

const config: EnvConfig = {
  ZZJL_API_KEY: process.env.ZZJL_API_KEY ?? '',
  ZZJL_API_BASE_URL: 'https://openapi.zzjilu.com',
  ZZJL_REQUEST_TIMEOUT_MS: 15000,
  ZZJL_LOG_LEVEL: 'info',
};

const client = new ZzjlApiClient(config);

async function run() {
  const results: Array<{ tool: string; status: string; detail: string }> = [];

  async function test(name: string, fn: () => Promise<unknown>) {
    try {
      const r = await fn();
      const json = JSON.stringify(r);
      const ok = json.includes('"success":true');
      results.push({ tool: name, status: ok ? 'PASS' : 'WARN', detail: json.slice(0, 200) });
    } catch (e) {
      results.push({ tool: name, status: 'FAIL', detail: String(e).slice(0, 200) });
    }
  }

  await test('search_notes', () =>
    handleSearchNotes(client, { query: '测试' }),
  );

  await test('list_scenes', () =>
    handleListScenes(client, { source: 'all' }),
  );

  await test('list_knowledge_collections', () =>
    handleListKnowledgeCollections(client, { scope: 'all' }),
  );

  await test('list_knowledge_cards', () =>
    handleListKnowledgeCards(client, {}),
  );

  const searchResult = await handleSearchNotes(client, { query: '测试', max_results: 1 });
  const firstNoteId =
    searchResult.success && (searchResult as any).data.notes[0]?.note_id;

  if (firstNoteId) {
    await test('get_note', () =>
      handleGetNote(client, { note_id: firstNoteId }),
    );
    await test('get_note_status', () =>
      handleGetNoteStatus(client, { note_id: firstNoteId }),
    );
  } else {
    results.push({ tool: 'get_note', status: 'SKIP', detail: '无测试数据' });
    results.push({ tool: 'get_note_status', status: 'SKIP', detail: '无测试数据' });
  }

  await test('update_note (expected 404)', () =>
    handleUpdateNote(client, { note_id: '0', title: 'smoke' }),
  );

  await test('create_note', () =>
    handleCreateNote(client, {
      type: 'text',
      title: '[MCP冒烟测试] ' + new Date().toISOString(),
      content: '此笔记由 open-zzjilu-mcp-server 冒烟测试自动创建，可安全删除。',
    }),
  );

  const collectionsResult = await handleListKnowledgeCollections(client, { scope: 'owned', page_size: 1 });
  const firstKnowledgeId =
    collectionsResult.success && (collectionsResult as any).data.collections[0]?.knowledge_id;

  if (firstKnowledgeId) {
    await test('get_knowledge_collection', () =>
      handleGetKnowledgeCollection(client, { knowledge_id: firstKnowledgeId }),
    );
  } else {
    results.push({ tool: 'get_knowledge_collection', status: 'SKIP', detail: '无笔记集数据' });
  }

  console.log('\n=== 冒烟测试结果 ===\n');
  for (const r of results) {
    const icon = r.status === 'PASS' ? '✅' : r.status === 'WARN' ? '⚠️' : r.status === 'SKIP' ? '⏭️' : '❌';
    console.log(`${icon} ${r.tool}: ${r.status}`);
    if (r.status !== 'PASS') console.log(`   ${r.detail}`);
  }

  const passed = results.filter((r) => r.status === 'PASS').length;
  const total = results.length;
  console.log(`\n总计: ${passed}/${total} 通过\n`);
}

run().catch(console.error);
