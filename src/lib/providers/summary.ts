import { DEFAULT_SUMMARY_MODELS } from '@/lib/providers/catalog';
import { chatComplete } from '@/lib/providers/chat';
import type { SummaryProviderId } from '@/lib/types';

const SYSTEM_PROMPT =
  'Você é um assistente que resume transcrições de áudio em português do Brasil. ' +
  'Produza um resumo claro e objetivo com os principais pontos discutidos e, quando fizer sentido, ' +
  'uma lista de itens de ação ao final. Responda apenas com o resumo, sem introduções.';

interface SummarizeParams {
  transcript: string;
  provider: SummaryProviderId;
  apiKey: string;
  model?: string;
}

export async function summarizeText({ transcript, provider, apiKey, model }: SummarizeParams): Promise<string> {
  const trimmedKey = apiKey.trim();
  if (!trimmedKey) {
    throw new Error(`Configure a chave de API da ${provider} nas Configurações.`);
  }
  const resolvedModel = model?.trim() || DEFAULT_SUMMARY_MODELS[provider];

  return chatComplete({
    provider,
    apiKey: trimmedKey,
    model: resolvedModel,
    systemPrompt: SYSTEM_PROMPT,
    userContent: transcript,
    maxTokens: 1024,
  });
}
