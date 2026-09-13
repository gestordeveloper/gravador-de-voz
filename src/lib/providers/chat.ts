import type { SummaryProviderId } from '@/lib/types';

const CHAT_COMPLETIONS_ENDPOINTS: Partial<Record<SummaryProviderId, string>> = {
  groq: 'https://api.groq.com/openai/v1/chat/completions',
  openai: 'https://api.openai.com/v1/chat/completions',
  openrouter: 'https://openrouter.ai/api/v1/chat/completions',
};

const ANTHROPIC_ENDPOINT = 'https://api.anthropic.com/v1/messages';

interface ChatCompleteParams {
  provider: SummaryProviderId;
  apiKey: string;
  model: string;
  systemPrompt: string;
  userContent: string;
  maxTokens?: number;
  temperature?: number;
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = await response.json();
    const message = body?.error?.message ?? body?.message;
    if (typeof message === 'string' && message.length > 0) {
      return message;
    }
  } catch {
    // body was not JSON, fall through to generic message
  }
  return `Falha na chamada à IA (HTTP ${response.status}).`;
}

async function chatCompleteWithAnthropic(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userContent: string,
  maxTokens: number,
): Promise<string> {
  const response = await fetch(ANTHROPIC_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
    }),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  const data = await response.json();
  const content = data?.content
    ?.filter((block: { type: string }) => block.type === 'text')
    .map((block: { text: string }) => block.text)
    .join('\n')
    .trim();
  if (!content) {
    throw new Error('A resposta da IA veio vazia.');
  }
  return content;
}

async function chatCompleteWithOpenAiCompatible(
  provider: 'groq' | 'openai' | 'openrouter',
  apiKey: string,
  model: string,
  systemPrompt: string,
  userContent: string,
  maxTokens: number,
  temperature: number,
): Promise<string> {
  const response = await fetch(CHAT_COMPLETIONS_ENDPOINTS[provider]!, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error('A resposta da IA veio vazia.');
  }
  return content;
}

export async function chatComplete({
  provider,
  apiKey,
  model,
  systemPrompt,
  userContent,
  maxTokens = 1024,
  temperature = 0.3,
}: ChatCompleteParams): Promise<string> {
  if (provider === 'anthropic') {
    return chatCompleteWithAnthropic(apiKey, model, systemPrompt, userContent, maxTokens);
  }
  return chatCompleteWithOpenAiCompatible(provider, apiKey, model, systemPrompt, userContent, maxTokens, temperature);
}
