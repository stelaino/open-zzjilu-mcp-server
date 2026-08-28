import type { ZzjlApiClient } from '../api/client.js';
import { toolSuccess, toolError, type ToolResult } from '../api/types.js';
import type { ApiError } from '../api/client.js';

interface RecordingSegment {
  recording_id: string;
  transcript: Array<{
    raw_text?: string;
    text: string;
    start: number;
    end: number;
    tn_text?: string;
    spk: string;
  }>;
  duration: string;
  start_time: string | null;
  create_time: string;
}

interface NoteDetail {
  id: string;
  title: string;
  abstract: string | null;
  summary: string | null;
  note_type: string;
  create_time: string;
  note_state: string;
  scene_name: string | null;
  content: RecordingSegment[] | string | null;
}

interface GetNoteInput {
  note_id: string;
  content_level?: 'summary' | 'full';
}

interface GetNoteOutput {
  note_id: string;
  title: string;
  abstract: string | null;
  summary: string | null;
  note_type: string;
  create_time: string;
  note_state: string;
  scene_name: string | null;
  content?: NoteContent;
  truncated: boolean;
}

type NoteContent =
  | { type: 'text'; text: string }
  | { type: 'voice'; transcripts: Array<{ start_ms: string; end_ms: string; text: string; speaker: string }>; duration: string }
  | { type: 'image' | 'document' | 'link'; raw: unknown };

const MAX_CONTENT_LENGTH = 8000;

export const getNoteSchema = {
  name: 'get_note',
  description:
    '读取指定笔记的完整内容。异步笔记（录音）在状态为 completed 前内容不完整，请先用 get_note_status 确认。',
  inputSchema: {
    type: 'object' as const,
    properties: {
      note_id: {
        type: 'string',
        description: '笔记 ID',
      },
      content_level: {
        type: 'string',
        enum: ['summary', 'full'],
        description: '内容级别：summary 仅返回摘要和总结，full 返回完整正文',
        default: 'full',
      },
    },
    required: ['note_id'],
  },
};

export async function handleGetNote(
  client: ZzjlApiClient,
  input: GetNoteInput,
): Promise<ToolResult<GetNoteOutput>> {
  try {
    const detail = await client.call<NoteDetail>('querySingleNoteDetail', {
      noteId: input.note_id,
    });

    if (!detail) {
      return toolError('NOT_FOUND', `笔记 ${input.note_id} 不存在`, false);
    }

    const noteType = mapNoteType(detail.note_type);
    const noteState = mapNoteState(detail.note_state);
    const level = input.content_level ?? 'full';

    const result: GetNoteOutput = {
      note_id: String(detail.id),
      title: detail.title ?? '',
      abstract: detail.abstract ?? null,
      summary: detail.summary ?? null,
      note_type: noteType,
      create_time: detail.create_time ?? '',
      note_state: noteState,
      scene_name: detail.scene_name ?? null,
      truncated: false,
    };

    if (noteState !== 'completed') {
      return toolSuccess(result, {
        truncated: false,
      });
    }

    if (level === 'full') {
      const { content, truncated } = buildContent(detail, noteType);
      result.content = content;
      result.truncated = truncated;
    }

    return toolSuccess(result);
  } catch (err) {
    const e = err as ApiError;
    return toolError(e.code ?? 'UPSTREAM_ERROR', e.message, e.retryable ?? true);
  }
}

function buildContent(detail: NoteDetail, noteType: string): { content: NoteContent; truncated: boolean } {
  let truncated = false;

  if (noteType === 'voice' && Array.isArray(detail.content)) {
    const segments = detail.content as RecordingSegment[];
    const transcripts: Array<{ start_ms: string; end_ms: string; text: string; speaker: string }> = [];
    let totalDuration = '0';
    for (const seg of segments) {
      totalDuration = seg.duration ?? totalDuration;
      if (!seg.transcript) continue;
      for (const t of seg.transcript) {
        transcripts.push({
          start_ms: String(t.start ?? ''),
          end_ms: String(t.end ?? ''),
          text: t.text ?? t.raw_text ?? '',
          speaker: t.spk ?? '',
        });
      }
    }
    return { content: { type: 'voice', transcripts, duration: totalDuration }, truncated: false };
  }

  if (noteType === 'text') {
    let text = typeof detail.content === 'string' ? detail.content : '';
    if (text.length > MAX_CONTENT_LENGTH) {
      text = text.slice(0, MAX_CONTENT_LENGTH);
      truncated = true;
    }
    return { content: { type: 'text', text }, truncated };
  }

  return {
    content: { type: noteType as 'image' | 'document' | 'link', raw: detail.content },
    truncated: false,
  };
}

function mapNoteType(raw: string | number): string {
  const map: Record<string, string> = { '0': 'voice', '1': 'text', '2': 'image', '3': 'document', '4': 'link' };
  return map[String(raw)] ?? String(raw);
}

function mapNoteState(raw: string | number): string {
  const map: Record<string, string> = { '0': 'pending', '1': 'recognizing', '2': 'analyzing', '3': 'completed', '4': 'failed' };
  return map[String(raw)] ?? String(raw);
}
