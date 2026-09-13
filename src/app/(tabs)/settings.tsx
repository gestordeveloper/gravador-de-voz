import type { ReactNode } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/primary-button';
import { ProviderSelector } from '@/components/provider-selector';
import { ProviderSettingsCard } from '@/components/provider-settings-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AccentColors, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  DEFAULT_SUMMARY_MODELS,
  DEFAULT_TRANSCRIPTION_MODELS,
  PROVIDER_LABELS,
  SUMMARY_PROVIDERS,
  TRANSCRIPTION_LANGUAGES,
  TRANSCRIPTION_PROVIDERS,
} from '@/lib/providers/catalog';
import type { ProviderId, SummaryProviderId, TranscriptionProviderId } from '@/lib/types';
import { useAuthStore } from '@/store/useAuthStore';
import { useSettingsStore } from '@/store/useSettingsStore';

const ALL_PROVIDERS: ProviderId[] = ['groq', 'openai', 'anthropic', 'openrouter'];

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeading}>
        <ThemedText type="smallBold" style={styles.sectionTitle}>
          {title}
        </ThemedText>
        {description && (
          <ThemedText type="small" themeColor="textSecondary">
            {description}
          </ThemedText>
        )}
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const userId = useAuthStore((s) => s.user?.id ?? '');
  const userEmail = useAuthStore((s) => s.user?.email);
  const logout = useAuthStore((s) => s.logout);
  const settings = useSettingsStore((s) => s.settings);
  const apiKeys = useSettingsStore((s) => s.apiKeys);
  const setTranscriptionProviderRaw = useSettingsStore((s) => s.setTranscriptionProvider);
  const setSummaryProviderRaw = useSettingsStore((s) => s.setSummaryProvider);
  const setTranscriptionLanguageRaw = useSettingsStore((s) => s.setTranscriptionLanguage);
  const setTranscriptionModelRaw = useSettingsStore((s) => s.setTranscriptionModel);
  const setSummaryModelRaw = useSettingsStore((s) => s.setSummaryModel);
  const setApiKeyRaw = useSettingsStore((s) => s.setApiKey);

  const setTranscriptionProvider = (provider: TranscriptionProviderId) => setTranscriptionProviderRaw(userId, provider);
  const setSummaryProvider = (provider: SummaryProviderId) => setSummaryProviderRaw(userId, provider);
  const setTranscriptionLanguage = (language: string) => setTranscriptionLanguageRaw(userId, language);
  const setTranscriptionModel = (provider: TranscriptionProviderId, model: string) =>
    setTranscriptionModelRaw(userId, provider, model);
  const setSummaryModel = (provider: SummaryProviderId, model: string) => setSummaryModelRaw(userId, provider, model);
  const setApiKey = (provider: ProviderId, value: string) => setApiKeyRaw(userId, provider, value);

  const handleLogout = () => {
    Alert.alert('Sair da conta?', undefined, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => void logout() },
    ]);
  };

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top + Spacing.three }]}>
      <ThemedText type="title" style={styles.title}>
        Ajustes
      </ThemedText>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + Spacing.six }]}
        keyboardShouldPersistTaps="handled">
        <Section
          title="1. Quem transcreve o áudio"
          description="Escolha o serviço que converte sua voz em texto.">
          <ProviderSelector<TranscriptionProviderId>
            options={TRANSCRIPTION_PROVIDERS}
            value={settings.transcriptionProvider}
            onChange={setTranscriptionProvider}
          />

          <ThemedText type="small" themeColor="textSecondary" style={styles.subLabel}>
            Idioma falado no áudio
          </ThemedText>
          <View style={styles.languageRow}>
            {TRANSCRIPTION_LANGUAGES.map((lang) => {
              const selected = settings.transcriptionLanguage === lang.code;
              return (
                <Pressable
                  key={lang.code || 'auto'}
                  onPress={() => setTranscriptionLanguage(lang.code)}
                  style={[
                    styles.languageChip,
                    { backgroundColor: selected ? AccentColors.primary : theme.backgroundElement },
                  ]}>
                  <ThemedText type="small" style={{ color: selected ? '#ffffff' : theme.text }}>
                    {lang.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </Section>

        <Section
          title="2. Quem gera o resumo"
          description="Escolha o serviço de IA que lê a transcrição e escreve o resumo.">
          <ProviderSelector<SummaryProviderId>
            options={SUMMARY_PROVIDERS}
            value={settings.summaryProvider}
            onChange={setSummaryProvider}
          />
        </Section>

        <Section
          title="3. Chaves de acesso"
          description="Cole aqui a chave de cada serviço que você quiser usar. Elas ficam guardadas com segurança só neste aparelho.">
          <View style={styles.providerList}>
            {ALL_PROVIDERS.map((provider, index) => {
              const supportsTranscription = TRANSCRIPTION_PROVIDERS.includes(
                provider as TranscriptionProviderId,
              );
              const supportsSummary = SUMMARY_PROVIDERS.includes(provider as SummaryProviderId);

              const modelFields = [
                supportsTranscription
                  ? {
                      label: `Modelo de transcrição (${PROVIDER_LABELS[provider]})`,
                      value: settings.transcriptionModels[provider as TranscriptionProviderId] ?? '',
                      placeholder: DEFAULT_TRANSCRIPTION_MODELS[provider as TranscriptionProviderId],
                      onChangeText: (text: string) =>
                        setTranscriptionModel(provider as TranscriptionProviderId, text),
                    }
                  : null,
                supportsSummary
                  ? {
                      label: `Modelo de resumo (${PROVIDER_LABELS[provider]})`,
                      value: settings.summaryModels[provider as SummaryProviderId] ?? '',
                      placeholder: DEFAULT_SUMMARY_MODELS[provider as SummaryProviderId],
                      onChangeText: (text: string) => setSummaryModel(provider as SummaryProviderId, text),
                    }
                  : null,
              ].filter((field): field is NonNullable<typeof field> => field !== null);

              return (
                <View
                  key={provider}
                  style={[
                    styles.providerCard,
                    index < ALL_PROVIDERS.length - 1 && styles.providerCardDivider,
                  ]}>
                  <ProviderSettingsCard
                    provider={provider}
                    apiKey={apiKeys[provider] ?? ''}
                    onChangeApiKey={(text) => void setApiKey(provider, text)}
                    modelFields={modelFields}
                  />
                </View>
              );
            })}
          </View>
        </Section>

        <ThemedText type="small" themeColor="textSecondary" style={styles.footerNote}>
          Anthropic e OpenRouter ainda não oferecem transcrição de áudio própria, por isso aparecem
          apenas como opção de resumo.
        </ThemedText>

        <Section title="4. Conta" description={userEmail}>
          <PrimaryButton label="Sair da conta" variant="danger" onPress={handleLogout} />
        </Section>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
  },
  scrollContent: {
    paddingHorizontal: Spacing.three,
    gap: Spacing.five,
  },
  section: {
    gap: 12,
  },
  sectionHeading: {
    gap: 2,
  },
  sectionTitle: {
    fontSize: 17,
  },
  sectionBody: {
    gap: 10,
  },
  subLabel: {
    marginTop: 4,
  },
  languageRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  languageChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  providerList: {
    gap: Spacing.three,
  },
  providerCard: {
    gap: 10,
    paddingBottom: Spacing.three,
  },
  providerCardDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.25)',
  },
  footerNote: {
    textAlign: 'center',
  },
});
