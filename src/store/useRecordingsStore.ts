import { create } from 'zustand';

import type { RecordedSegment as CapturedSegment } from '@/hooks/use-recorder';
import { account } from '@/lib/appwrite/client';
import { deleteLocalSegmentFile, deleteSegmentFile, uploadSegmentFile } from '@/lib/appwrite/recordingFiles';
import {
  createRecordingRow,
  createSegmentRow,
  deleteRecordingRow,
  deleteSegmentRow,
  listRecordings,
  updateRecordingRow,
  updateSegmentRow,
} from '@/lib/appwrite/recordingsRepository';
import { transcribeAudio } from '@/lib/providers/transcription';
import { summarizeText } from '@/lib/providers/summary';
import { generateTitle } from '@/lib/providers/title';
import type { Recording, RecordingSegment } from '@/lib/types';
import { useSettingsStore } from '@/store/useSettingsStore';

interface RecordingsState {
  hydrated: boolean;
  recordings: Recording[];
  hydrate: (userId: string) => Promise<void>;
  reset: () => void;
  createRecording: (userId: string, segments: CapturedSegment[]) => Promise<Recording>;
  renameRecording: (id: string, title: string) => void;
  deleteRecording: (id: string) => void;
  transcribeRecording: (id: string) => Promise<void>;
  summarizeRecording: (id: string) => Promise<void>;
}

function formatDefaultTitle(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `Gravação ${pad(date.getDate())}/${pad(date.getMonth() + 1)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export const useRecordingsStore = create<RecordingsState>((set, get) => ({
  hydrated: false,
  recordings: [],

  hydrate: async (userId) => {
    const recordings = await listRecordings(userId);
    set({ recordings, hydrated: true });
  },

  reset: () => set({ hydrated: false, recordings: [] }),

  createRecording: async (userId, capturedSegments) => {
    const title = formatDefaultTitle(new Date());
    const createdAt = Date.now();
    const recordingId = await createRecordingRow(userId, title, createdAt);

    // Uploaded sequentially (not Promise.all) so a long, many-segment recording doesn't hammer a
    // self-hosted server with a dozen concurrent large uploads at once.
    const segments: RecordingSegment[] = [];
    for (const captured of capturedSegments) {
      const fileId = await uploadSegmentFile(captured.uri, userId, captured.index);
      deleteLocalSegmentFile(captured.uri);
      const segment = await createSegmentRow(userId, recordingId, captured.index, fileId, captured.durationMillis);
      segments.push(segment);
    }

    const durationMillis = segments.reduce((sum, segment) => sum + segment.durationMillis, 0);
    await updateRecordingRow(recordingId, { durationMillis });

    const recording: Recording = {
      id: recordingId,
      title,
      createdAt,
      durationMillis,
      segments,
      transcriptStatus: 'idle',
      summaryStatus: 'idle',
    };
    set({ recordings: [recording, ...get().recordings] });
    return recording;
  },

  renameRecording: (id, title) => {
    set({ recordings: get().recordings.map((r) => (r.id === id ? { ...r, title } : r)) });
    void updateRecordingRow(id, { title });
  },

  deleteRecording: (id) => {
    const target = get().recordings.find((r) => r.id === id);
    set({ recordings: get().recordings.filter((r) => r.id !== id) });
    if (!target) return;
    void (async () => {
      for (const segment of target.segments) {
        await deleteSegmentFile(segment.fileId).catch(() => {});
        await deleteSegmentRow(segment.id).catch(() => {});
      }
      await deleteRecordingRow(id).catch(() => {});
    })();
  },

  transcribeRecording: async (id) => {
    const patch = (fields: Partial<Recording>) => {
      set({ recordings: get().recordings.map((r) => (r.id === id ? { ...r, ...fields } : r)) });
    };

    const recording = get().recordings.find((r) => r.id === id);
    if (!recording) return;

    const { settings, apiKeys } = useSettingsStore.getState();
    const provider = settings.transcriptionProvider;

    patch({ transcriptStatus: 'loading', transcriptError: undefined });
    void updateRecordingRow(id, { transcriptStatus: 'loading', transcriptError: undefined });

    // Segment files are owned by this user (Role.user(userId) only) — a plain fetch of their
    // Appwrite URL 404s without this. One JWT (valid up to 1h) covers the whole loop below.
    let jwt: string;
    try {
      jwt = (await account.createJWT({ duration: 3600 })).jwt;
    } catch (jwtError) {
      const message = jwtError instanceof Error ? jwtError.message : 'Sessão expirada. Entre novamente.';
      patch({ transcriptStatus: 'error', transcriptError: message });
      void updateRecordingRow(id, { transcriptStatus: 'error', transcriptError: message });
      return;
    }

    const segments = [...recording.segments];
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      if (segment.transcriptStatus === 'done' && segment.transcript) continue;

      try {
        const text = await transcribeAudio({
          fileUrl: segment.fileUrl,
          jwt,
          provider,
          apiKey: apiKeys[provider] ?? '',
          model: settings.transcriptionModels[provider],
          language: settings.transcriptionLanguage || undefined,
        });
        segments[i] = { ...segment, transcript: text, transcriptStatus: 'done', transcriptError: undefined };
        void updateSegmentRow(segment.id, { transcript: text, transcriptStatus: 'done', transcriptError: undefined });
      } catch (segmentError) {
        const message = segmentError instanceof Error ? segmentError.message : 'Erro desconhecido ao transcrever.';
        segments[i] = { ...segment, transcriptStatus: 'error', transcriptError: message };
        void updateSegmentRow(segment.id, { transcriptStatus: 'error', transcriptError: message });
      }
      // Surface progress as each part finishes — a long recording can have several segments and
      // take a while to fully transcribe.
      patch({ segments: [...segments] });
    }

    const failedSegment = segments.find((segment) => segment.transcriptStatus === 'error');
    if (failedSegment) {
      patch({ segments, transcriptStatus: 'error', transcriptError: failedSegment.transcriptError });
      void updateRecordingRow(id, { transcriptStatus: 'error', transcriptError: failedSegment.transcriptError });
      return;
    }

    const transcript = segments.map((segment) => segment.transcript ?? '').join('\n\n');
    patch({ segments, transcript, transcriptProvider: provider, transcriptStatus: 'done' });
    void updateRecordingRow(id, { transcript, transcriptProvider: provider, transcriptStatus: 'done' });

    const summaryProvider = settings.summaryProvider;
    try {
      const title = await generateTitle({
        transcript,
        provider: summaryProvider,
        apiKey: apiKeys[summaryProvider] ?? '',
        model: settings.summaryModels[summaryProvider],
        recordedAt: recording.createdAt,
      });
      patch({ title });
      void updateRecordingRow(id, { title });
    } catch (titleError) {
      // Keep the default title when AI naming isn't available (e.g. missing API key).
      console.warn('[gravador] Falha ao gerar título automático:', titleError);
    }
  },

  summarizeRecording: async (id) => {
    const patch = (fields: Partial<Recording>) => {
      set({ recordings: get().recordings.map((r) => (r.id === id ? { ...r, ...fields } : r)) });
    };

    const recording = get().recordings.find((r) => r.id === id);
    if (!recording?.transcript) return;

    const { settings, apiKeys } = useSettingsStore.getState();
    const provider = settings.summaryProvider;

    patch({ summaryStatus: 'loading', summaryError: undefined });
    void updateRecordingRow(id, { summaryStatus: 'loading', summaryError: undefined });
    try {
      const summary = await summarizeText({
        transcript: recording.transcript,
        provider,
        apiKey: apiKeys[provider] ?? '',
        model: settings.summaryModels[provider],
      });
      patch({ summary, summaryProvider: provider, summaryStatus: 'done' });
      void updateRecordingRow(id, { summary, summaryProvider: provider, summaryStatus: 'done' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido ao resumir.';
      patch({ summaryStatus: 'error', summaryError: message });
      void updateRecordingRow(id, { summaryStatus: 'error', summaryError: message });
    }
  },
}));
