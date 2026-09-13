import { create } from 'zustand';

import { DEFAULT_SETTINGS, loadUserSettings, saveApiKey, saveSettings } from '@/lib/appwrite/userSettingsRepository';
import type { ApiKeys, AppSettings, ProviderId, SummaryProviderId, TranscriptionProviderId } from '@/lib/types';

interface SettingsState {
  hydrated: boolean;
  settings: AppSettings;
  apiKeys: ApiKeys;
  hydrate: (userId: string) => Promise<void>;
  reset: () => void;
  setTranscriptionProvider: (userId: string, provider: TranscriptionProviderId) => void;
  setSummaryProvider: (userId: string, provider: SummaryProviderId) => void;
  setTranscriptionLanguage: (userId: string, language: string) => void;
  setTranscriptionModel: (userId: string, provider: TranscriptionProviderId, model: string) => void;
  setSummaryModel: (userId: string, provider: SummaryProviderId, model: string) => void;
  setApiKey: (userId: string, provider: ProviderId, value: string) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  hydrated: false,
  settings: DEFAULT_SETTINGS,
  apiKeys: {},

  hydrate: async (userId) => {
    const { settings, apiKeys } = await loadUserSettings(userId);
    set({ settings, apiKeys, hydrated: true });
  },

  reset: () => set({ hydrated: false, settings: DEFAULT_SETTINGS, apiKeys: {} }),

  setTranscriptionProvider: (userId, provider) => {
    const settings = { ...get().settings, transcriptionProvider: provider };
    set({ settings });
    void saveSettings(userId, settings);
  },

  setSummaryProvider: (userId, provider) => {
    const settings = { ...get().settings, summaryProvider: provider };
    set({ settings });
    void saveSettings(userId, settings);
  },

  setTranscriptionLanguage: (userId, language) => {
    const settings = { ...get().settings, transcriptionLanguage: language };
    set({ settings });
    void saveSettings(userId, settings);
  },

  setTranscriptionModel: (userId, provider, model) => {
    const settings = {
      ...get().settings,
      transcriptionModels: { ...get().settings.transcriptionModels, [provider]: model },
    };
    set({ settings });
    void saveSettings(userId, settings);
  },

  setSummaryModel: (userId, provider, model) => {
    const settings = {
      ...get().settings,
      summaryModels: { ...get().settings.summaryModels, [provider]: model },
    };
    set({ settings });
    void saveSettings(userId, settings);
  },

  setApiKey: async (userId, provider, value) => {
    set({ apiKeys: { ...get().apiKeys, [provider]: value || undefined } });
    await saveApiKey(provider, userId, value);
  },
}));
