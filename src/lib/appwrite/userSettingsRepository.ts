import { AppwriteException, Permission, Role, tablesDB } from '@/lib/appwrite/client';
import { APPWRITE_DATABASE_ID, APPWRITE_SETTINGS_COLLECTION_ID } from '@/lib/appwrite/config';
import type { ApiKeys, AppSettings, ModelOverrides } from '@/lib/types';

// One document per user in the `user_settings` collection, $id === userId. Holds both the
// provider/model preferences (previously AsyncStorage) and the API keys (previously
// expo-secure-store) — neither is available on web, so both move here together.
interface UserSettingsDocument {
  transcriptionProvider: string;
  summaryProvider: string;
  transcriptionLanguage: string;
  transcriptionModelsJson: string;
  summaryModelsJson: string;
  groqApiKey?: string;
  openaiApiKey?: string;
  anthropicApiKey?: string;
  openrouterApiKey?: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  transcriptionProvider: 'groq',
  summaryProvider: 'groq',
  transcriptionLanguage: 'pt',
  transcriptionModels: {},
  summaryModels: {},
};

function parseModelOverrides(json: string | undefined): ModelOverrides {
  if (!json) return {};
  try {
    return JSON.parse(json) as ModelOverrides;
  } catch {
    return {};
  }
}

function toSettings(doc: Partial<UserSettingsDocument>): AppSettings {
  return {
    transcriptionProvider: (doc.transcriptionProvider as AppSettings['transcriptionProvider']) ?? DEFAULT_SETTINGS.transcriptionProvider,
    summaryProvider: (doc.summaryProvider as AppSettings['summaryProvider']) ?? DEFAULT_SETTINGS.summaryProvider,
    transcriptionLanguage: doc.transcriptionLanguage ?? DEFAULT_SETTINGS.transcriptionLanguage,
    transcriptionModels: parseModelOverrides(doc.transcriptionModelsJson),
    summaryModels: parseModelOverrides(doc.summaryModelsJson),
  };
}

function toApiKeys(doc: Partial<UserSettingsDocument>): ApiKeys {
  return {
    groq: doc.groqApiKey || undefined,
    openai: doc.openaiApiKey || undefined,
    anthropic: doc.anthropicApiKey || undefined,
    openrouter: doc.openrouterApiKey || undefined,
  };
}

export async function loadUserSettings(userId: string): Promise<{ settings: AppSettings; apiKeys: ApiKeys }> {
  try {
    const row = (await tablesDB.getRow({
      databaseId: APPWRITE_DATABASE_ID,
      tableId: APPWRITE_SETTINGS_COLLECTION_ID,
      rowId: userId,
    })) as unknown as UserSettingsDocument;
    return { settings: toSettings(row), apiKeys: toApiKeys(row) };
  } catch (error) {
    if (error instanceof AppwriteException && error.code === 404) {
      return { settings: DEFAULT_SETTINGS, apiKeys: {} };
    }
    throw error;
  }
}

async function upsertUserSettingsDocument(userId: string, patch: Partial<UserSettingsDocument>): Promise<void> {
  try {
    await tablesDB.updateRow({
      databaseId: APPWRITE_DATABASE_ID,
      tableId: APPWRITE_SETTINGS_COLLECTION_ID,
      rowId: userId,
      data: patch,
    });
  } catch (error) {
    if (error instanceof AppwriteException && error.code === 404) {
      await tablesDB.createRow({
        databaseId: APPWRITE_DATABASE_ID,
        tableId: APPWRITE_SETTINGS_COLLECTION_ID,
        rowId: userId,
        data: patch,
        permissions: [Permission.read(Role.user(userId)), Permission.update(Role.user(userId)), Permission.delete(Role.user(userId))],
      });
      return;
    }
    throw error;
  }
}

export async function saveSettings(userId: string, settings: AppSettings): Promise<void> {
  await upsertUserSettingsDocument(userId, {
    transcriptionProvider: settings.transcriptionProvider,
    summaryProvider: settings.summaryProvider,
    transcriptionLanguage: settings.transcriptionLanguage,
    transcriptionModelsJson: JSON.stringify(settings.transcriptionModels),
    summaryModelsJson: JSON.stringify(settings.summaryModels),
  });
}

const API_KEY_FIELD: Record<keyof ApiKeys, keyof UserSettingsDocument> = {
  groq: 'groqApiKey',
  openai: 'openaiApiKey',
  anthropic: 'anthropicApiKey',
  openrouter: 'openrouterApiKey',
};

export async function saveApiKey(provider: keyof ApiKeys, userId: string, value: string): Promise<void> {
  const trimmed = value.trim();
  await upsertUserSettingsDocument(userId, { [API_KEY_FIELD[provider]]: trimmed || undefined });
}
