import { getSegmentFileUrl } from '@/lib/appwrite/recordingFiles';
import { ID, Permission, Query, Role, tablesDB } from '@/lib/appwrite/client';
import { APPWRITE_DATABASE_ID, APPWRITE_RECORDINGS_COLLECTION_ID, APPWRITE_SEGMENTS_COLLECTION_ID } from '@/lib/appwrite/config';
import type { JobStatus, Recording, RecordingSegment, SummaryProviderId, TranscriptionProviderId } from '@/lib/types';

interface RecordingRow {
  $id: string;
  title: string;
  createdAt: number;
  durationMillis: number;
  transcript?: string;
  transcriptProvider?: string;
  transcriptStatus: string;
  transcriptError?: string;
  summary?: string;
  summaryProvider?: string;
  summaryStatus: string;
  summaryError?: string;
  userId: string;
}

interface SegmentRow {
  $id: string;
  recordingId: string;
  index: number;
  fileId: string;
  durationMillis: number;
  transcript?: string;
  transcriptStatus: string;
  transcriptError?: string;
  userId: string;
}

function ownerPermissions(userId: string): string[] {
  return [Permission.read(Role.user(userId)), Permission.update(Role.user(userId)), Permission.delete(Role.user(userId))];
}

function toSegment(row: SegmentRow): RecordingSegment {
  return {
    id: row.$id,
    index: row.index,
    fileId: row.fileId,
    fileUrl: getSegmentFileUrl(row.fileId),
    durationMillis: row.durationMillis,
    transcript: row.transcript,
    transcriptStatus: row.transcriptStatus as JobStatus,
    transcriptError: row.transcriptError,
  };
}

function toRecording(row: RecordingRow, segments: RecordingSegment[]): Recording {
  return {
    id: row.$id,
    title: row.title,
    createdAt: row.createdAt,
    durationMillis: row.durationMillis,
    segments: segments.sort((a, b) => a.index - b.index),
    transcript: row.transcript,
    transcriptProvider: row.transcriptProvider as TranscriptionProviderId | undefined,
    transcriptStatus: row.transcriptStatus as JobStatus,
    transcriptError: row.transcriptError,
    summary: row.summary,
    summaryProvider: row.summaryProvider as SummaryProviderId | undefined,
    summaryStatus: row.summaryStatus as JobStatus,
    summaryError: row.summaryError,
  };
}

export async function listRecordings(userId: string): Promise<Recording[]> {
  // No custom generic passed to listRows/createRow: Appwrite's Row constraint requires every
  // system field ($sequence, $tableId, ...) to be declared up front, which our narrower
  // RecordingRow/SegmentRow shapes intentionally don't do. Models.DefaultRow (the implicit
  // default) has a `[key: string]: any` index signature, so we read off it and cast at the edge
  // instead (see toSegment/toRecording).
  const recordingRows = await tablesDB.listRows({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: APPWRITE_RECORDINGS_COLLECTION_ID,
    queries: [Query.equal('userId', userId), Query.orderDesc('createdAt'), Query.limit(1000)],
  });

  if (recordingRows.rows.length === 0) return [];

  const recordingIds = recordingRows.rows.map((row) => row.$id);
  const segmentRows = await tablesDB.listRows({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: APPWRITE_SEGMENTS_COLLECTION_ID,
    queries: [Query.equal('recordingId', recordingIds), Query.limit(5000)],
  });

  const segmentsByRecording = new Map<string, RecordingSegment[]>();
  for (const row of segmentRows.rows) {
    const segmentRow = row as unknown as SegmentRow;
    const list = segmentsByRecording.get(segmentRow.recordingId) ?? [];
    list.push(toSegment(segmentRow));
    segmentsByRecording.set(segmentRow.recordingId, list);
  }

  return recordingRows.rows.map((row) => {
    const recordingRow = row as unknown as RecordingRow;
    return toRecording(recordingRow, segmentsByRecording.get(recordingRow.$id) ?? []);
  });
}

export async function createRecordingRow(userId: string, title: string, createdAt: number): Promise<string> {
  const row = await tablesDB.createRow({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: APPWRITE_RECORDINGS_COLLECTION_ID,
    rowId: ID.unique(),
    data: {
      title,
      createdAt,
      durationMillis: 0,
      transcriptStatus: 'idle',
      summaryStatus: 'idle',
      userId,
    },
    permissions: ownerPermissions(userId),
  });
  return row.$id;
}

export async function createSegmentRow(
  userId: string,
  recordingId: string,
  index: number,
  fileId: string,
  durationMillis: number,
): Promise<RecordingSegment> {
  const row = await tablesDB.createRow({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: APPWRITE_SEGMENTS_COLLECTION_ID,
    rowId: ID.unique(),
    data: { recordingId, index, fileId, durationMillis, transcriptStatus: 'idle', userId },
    permissions: ownerPermissions(userId),
  });
  return toSegment(row as unknown as SegmentRow);
}

export async function updateRecordingRow(id: string, patch: Partial<RecordingRow>): Promise<void> {
  await tablesDB.updateRow({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: APPWRITE_RECORDINGS_COLLECTION_ID,
    rowId: id,
    data: patch,
  });
}

export async function updateSegmentRow(id: string, patch: Partial<SegmentRow>): Promise<void> {
  await tablesDB.updateRow({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: APPWRITE_SEGMENTS_COLLECTION_ID,
    rowId: id,
    data: patch,
  });
}

export async function deleteRecordingRow(id: string): Promise<void> {
  await tablesDB.deleteRow({ databaseId: APPWRITE_DATABASE_ID, tableId: APPWRITE_RECORDINGS_COLLECTION_ID, rowId: id });
}

export async function deleteSegmentRow(id: string): Promise<void> {
  await tablesDB.deleteRow({ databaseId: APPWRITE_DATABASE_ID, tableId: APPWRITE_SEGMENTS_COLLECTION_ID, rowId: id });
}
