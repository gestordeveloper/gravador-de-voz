import { DEFAULT_TRANSCRIPTION_MODELS } from '@/lib/providers/catalog';
import type { TranscriptionProviderId } from '@/lib/types';

const ENDPOINTS: Record<TranscriptionProviderId, string> = {
  groq: 'https://api.groq.com/openai/v1/audio/transcriptions',
  openai: 'https://api.openai.com/v1/audio/transcriptions',
};

interface TranscribeParams {
  fileUrl: string;
  provider: TranscriptionProviderId;
  apiKey: string;
  model?: string;
  language?: string;
}

function extractErrorMessage(body: string, status: number): string {
  try {
    const parsed = JSON.parse(body);
    const message = parsed?.error?.message ?? parsed?.message;
    if (typeof message === 'string' && message.length > 0) {
      return message;
    }
  } catch {
    // body was not JSON, fall through to generic message
  }
  return `Falha na transcrição (HTTP ${status}).`;
}

// Segments are stored in Appwrite (see recordingsRepository.ts) — fetching the audio bytes from
// there (rather than a local file) works the same way on native and web, and means transcription
// still works even if the user taps "Transcrever" long after the recording session ended, once
// any local temp copy is already gone.
export async function transcribeAudio({ fileUrl, provider, apiKey, model, language }: TranscribeParams): Promise<string> {
  const trimmedKey = apiKey.trim();
  if (!trimmedKey) {
    throw new Error(`Configure a chave de API da ${provider} nas Configurações.`);
  }

  const audioResponse = await fetch(fileUrl);
  if (!audioResponse.ok) {
    throw new Error('Não foi possível baixar o áudio para transcrever.');
  }
  const audioBlob = await audioResponse.blob();
  // Native segments upload as audio/m4a, web segments as audio/webm (see recordingFiles.web.ts) —
  // the filename extension needs to match what's actually in the blob for the provider to parse it.
  const extension = audioBlob.type.includes('webm') ? 'webm' : 'm4a';

  const form = new FormData();
  form.append('file', audioBlob, `segment.${extension}`);
  form.append('model', model?.trim() || DEFAULT_TRANSCRIPTION_MODELS[provider]);
  form.append('response_format', 'json');
  if (language) {
    form.append('language', language);
  }

  const response = await fetch(ENDPOINTS[provider], {
    method: 'POST',
    headers: { Authorization: `Bearer ${trimmedKey}` },
    body: form,
  });

  const body = await response.text();
  if (!response.ok) {
    throw new Error(extractErrorMessage(body, response.status));
  }

  const parsed = JSON.parse(body) as { text?: string };
  const text = parsed.text?.trim();
  if (!text) {
    throw new Error('A transcrição retornou vazia.');
  }
  return text;
}
