import { DEFAULT_SUMMARY_MODELS } from '@/lib/providers/catalog';
import { chatComplete } from '@/lib/providers/chat';
import { formatDateForTitle } from '@/lib/format';
import type { SummaryProviderId } from '@/lib/types';

const SYSTEM_PROMPT = `Você cria títulos curtos para gravações de áudio transcritas, em português do Brasil.

Responda APENAS com o título, sem aspas, sem markdown e sem explicações, exatamente neste formato:
[Categoria] Assunto - DD-MM-AAAA

Regras:
- "Categoria": uma palavra ou expressão curta que descreve o tipo de conteúdo, inferida do contexto (ex.: Entrevista, Reunião, Ideia, Aula, Ligação, Nota, Lembrete, Consulta, Brainstorm).
- "Assunto": de 2 a 6 palavras resumindo o tema central, pessoas ou empresas envolvidas, com iniciais maiúsculas nas palavras importantes.
- Use exatamente a data informada, no formato DD-MM-AAAA.

Exemplos de saída:
[Entrevista] Samuel Fogaça - 09-09-2026
[Reunião] Estratégias Time Comercial - 09-09-2026`;

interface GenerateTitleParams {
  transcript: string;
  provider: SummaryProviderId;
  apiKey: string;
  model?: string;
  recordedAt: number;
}

// Some models (e.g. reasoning models like gpt-oss) prepend their reasoning trace before the
// actual answer, so we search for the expected pattern anywhere in the response instead of
// assuming the first (or only) line is the title.
const TITLE_PATTERN = /\[[^\]\n]+\]\s*[^\n]*?-\s*\d{2}-\d{2}-\d{4}/;

function sanitizeTitle(raw: string): string {
  const match = raw.match(TITLE_PATTERN);
  const line = match ? match[0] : (raw.trim().split('\n').filter(Boolean).pop() ?? '');
  return line.trim().replace(/^["'“”]+|["'“”]+$/g, '').trim();
}

export async function generateTitle({
  transcript,
  provider,
  apiKey,
  model,
  recordedAt,
}: GenerateTitleParams): Promise<string> {
  const trimmedKey = apiKey.trim();
  if (!trimmedKey) {
    throw new Error(`Configure a chave de API da ${provider} nas Configurações.`);
  }
  const resolvedModel = model?.trim() || DEFAULT_SUMMARY_MODELS[provider];
  const dateLabel = formatDateForTitle(recordedAt);

  const rawTitle = await chatComplete({
    provider,
    apiKey: trimmedKey,
    model: resolvedModel,
    systemPrompt: SYSTEM_PROMPT,
    userContent: `Data da gravação: ${dateLabel}\n\nTranscrição:\n${transcript}`,
    maxTokens: 400,
  });

  const title = sanitizeTitle(rawTitle);
  if (!title) {
    throw new Error('O título gerado veio vazio.');
  }
  return title;
}
