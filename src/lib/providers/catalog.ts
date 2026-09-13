import type { ProviderId, SummaryProviderId, TranscriptionProviderId } from '@/lib/types';

export const TRANSCRIPTION_PROVIDERS: TranscriptionProviderId[] = ['groq', 'openai'];
export const SUMMARY_PROVIDERS: SummaryProviderId[] = ['groq', 'openai', 'anthropic', 'openrouter'];

export const PROVIDER_LABELS: Record<ProviderId, string> = {
  groq: 'Groq',
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  openrouter: 'OpenRouter',
};

export const PROVIDER_KEY_HINTS: Record<ProviderId, string> = {
  groq: 'gsk_...',
  openai: 'sk-...',
  anthropic: 'sk-ant-...',
  openrouter: 'sk-or-...',
};

export const PROVIDER_KEY_PAGE: Record<ProviderId, string> = {
  groq: 'console.groq.com/keys',
  openai: 'platform.openai.com/api-keys',
  anthropic: 'console.anthropic.com/settings/keys',
  openrouter: 'openrouter.ai/keys',
};

export const DEFAULT_TRANSCRIPTION_MODELS: Record<TranscriptionProviderId, string> = {
  groq: 'whisper-large-v3-turbo',
  openai: 'gpt-4o-mini-transcribe',
};

export const DEFAULT_SUMMARY_MODELS: Record<SummaryProviderId, string> = {
  groq: 'openai/gpt-oss-120b',
  openai: 'gpt-4o-mini',
  anthropic: 'claude-sonnet-5',
  openrouter: 'openai/gpt-4o-mini',
};

export const TRANSCRIPTION_LANGUAGES: { code: string; label: string }[] = [
  { code: '', label: 'Detectar automaticamente' },
  { code: 'pt', label: 'Português' },
  { code: 'en', label: 'Inglês' },
  { code: 'es', label: 'Espanhol' },
  { code: 'fr', label: 'Francês' },
  { code: 'de', label: 'Alemão' },
];
