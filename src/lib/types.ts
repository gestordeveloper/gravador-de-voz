export type TranscriptionProviderId = 'groq' | 'openai';
export type SummaryProviderId = 'groq' | 'openai' | 'anthropic' | 'openrouter';
export type ProviderId = TranscriptionProviderId | SummaryProviderId;

export type JobStatus = 'idle' | 'loading' | 'done' | 'error';

// A recording longer than ~20min is captured as several segments (see use-recorder.ts) so each
// piece stays under transcription providers' ~25MB per-file limit. Segments play back-to-back.
export interface RecordingSegment {
  id: string;
  index: number;
  fileId: string;
  fileUrl: string;
  durationMillis: number;
  transcript?: string;
  transcriptStatus: JobStatus;
  transcriptError?: string;
}

export interface Recording {
  id: string;
  title: string;
  segments: RecordingSegment[];
  durationMillis: number;
  createdAt: number;

  // Derived from segments: 'loading' if any segment is pending, 'error' if any failed, 'done' +
  // concatenated text once every segment has finished.
  transcript?: string;
  transcriptProvider?: TranscriptionProviderId;
  transcriptStatus: JobStatus;
  transcriptError?: string;

  summary?: string;
  summaryProvider?: SummaryProviderId;
  summaryStatus: JobStatus;
  summaryError?: string;
}

export interface ApiKeys {
  groq?: string;
  openai?: string;
  anthropic?: string;
  openrouter?: string;
}

export interface ModelOverrides {
  groq?: string;
  openai?: string;
  anthropic?: string;
  openrouter?: string;
}

export interface AppSettings {
  transcriptionProvider: TranscriptionProviderId;
  summaryProvider: SummaryProviderId;
  transcriptionLanguage: string;
  transcriptionModels: ModelOverrides;
  summaryModels: ModelOverrides;
}
