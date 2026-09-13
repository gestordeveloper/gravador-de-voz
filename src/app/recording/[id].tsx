import { Ionicons } from '@expo/vector-icons';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AccentColors, Spacing } from '@/constants/theme';
import { usePlayback } from '@/hooks/use-playback';
import { useTheme } from '@/hooks/use-theme';
import { formatDuration } from '@/lib/format';
import { PROVIDER_LABELS } from '@/lib/providers/catalog';
import { useRecordingsStore } from '@/store/useRecordingsStore';
import { useSettingsStore } from '@/store/useSettingsStore';

export default function RecordingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  const recording = useRecordingsStore((s) => s.recordings.find((r) => r.id === id));
  const renameRecording = useRecordingsStore((s) => s.renameRecording);
  const deleteRecording = useRecordingsStore((s) => s.deleteRecording);
  const transcribeRecording = useRecordingsStore((s) => s.transcribeRecording);
  const summarizeRecording = useRecordingsStore((s) => s.summarizeRecording);
  const transcriptionProvider = useSettingsStore((s) => s.settings.transcriptionProvider);
  const summaryProvider = useSettingsStore((s) => s.settings.summaryProvider);

  const [editingTitle, setEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState(recording?.title ?? '');

  const playback = usePlayback(recording?.segments ?? []);

  if (!recording) {
    return (
      <ThemedView style={styles.missingContainer}>
        <ThemedText type="default" themeColor="textSecondary">
          Gravação não encontrada.
        </ThemedText>
      </ThemedView>
    );
  }

  const handleDelete = () => {
    Alert.alert('Excluir gravação?', 'Essa ação não pode ser desfeita.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          deleteRecording(recording.id);
          router.back();
        },
      },
    ]);
  };

  const commitTitle = () => {
    const trimmed = draftTitle.trim();
    if (trimmed) {
      renameRecording(recording.id, trimmed);
    }
    setEditingTitle(false);
  };

  const progress = playback.duration > 0 ? playback.currentTime / playback.duration : 0;

  return (
    <ThemedView style={[styles.container, { paddingBottom: insets.bottom + Spacing.four }]}>
      <Stack.Screen
        options={{
          title: recording.title,
          headerRight: () => (
            <Pressable onPress={handleDelete} hitSlop={10}>
              <Ionicons name="trash-outline" size={22} color={AccentColors.danger} />
            </Pressable>
          ),
        }}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.titleRow}>
          {editingTitle ? (
            <TextInput
              value={draftTitle}
              onChangeText={setDraftTitle}
              onSubmitEditing={commitTitle}
              onBlur={commitTitle}
              autoFocus
              style={[styles.titleInput, { color: theme.text, borderBottomColor: theme.textSecondary }]}
            />
          ) : (
            <>
              <ThemedText type="subtitle" style={styles.titleText} numberOfLines={2}>
                {recording.title}
              </ThemedText>
              <Pressable
                onPress={() => {
                  setDraftTitle(recording.title);
                  setEditingTitle(true);
                }}
                hitSlop={10}>
                <Ionicons name="pencil-outline" size={18} color={theme.textSecondary} />
              </Pressable>
            </>
          )}
        </View>

        <View style={[styles.playerCard, { backgroundColor: theme.backgroundElement }]}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.min(progress * 100, 100)}%` }]} />
          </View>
          <View style={styles.timeRow}>
            <ThemedText type="small" themeColor="textSecondary">
              {formatDuration(playback.currentTime * 1000)}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {formatDuration((playback.duration || recording.durationMillis / 1000) * 1000)}
            </ThemedText>
          </View>
          <View style={styles.playerControls}>
            <Pressable onPress={() => playback.skip(-10)} hitSlop={14}>
              <Ionicons name="play-back" size={28} color={theme.text} />
            </Pressable>
            <Pressable onPress={playback.toggle} style={styles.playButton} hitSlop={8}>
              <Ionicons name={playback.playing ? 'pause' : 'play'} size={30} color="#ffffff" />
            </Pressable>
            <Pressable onPress={() => playback.skip(10)} hitSlop={14}>
              <Ionicons name="play-forward" size={28} color={theme.text} />
            </Pressable>
          </View>
        </View>

        <Section
          icon="document-text-outline"
          title="Transcrição"
          helperText="Transforma o áudio em texto escrito."
          status={recording.transcriptStatus}
          errorMessage={recording.transcriptError}
          content={recording.transcript}
          actionLabel={
            recording.transcriptStatus === 'done'
              ? 'Transcrever novamente'
              : `Transcrever com ${PROVIDER_LABELS[transcriptionProvider]}`
          }
          onAction={() => void transcribeRecording(recording.id)}
          onShare={() => recording.transcript && void Share.share({ message: recording.transcript })}
        />

        <Section
          icon="sparkles-outline"
          title="Resumo"
          helperText="Um resumo curto com os pontos principais, escrito por IA."
          status={recording.summaryStatus}
          errorMessage={recording.summaryError}
          content={recording.summary}
          disabled={!recording.transcript}
          disabledHint="Transcreva o áudio primeiro para poder gerar o resumo."
          actionLabel={
            recording.summaryStatus === 'done'
              ? 'Resumir novamente'
              : `Resumir com ${PROVIDER_LABELS[summaryProvider]}`
          }
          onAction={() => void summarizeRecording(recording.id)}
          onShare={() => recording.summary && void Share.share({ message: recording.summary })}
        />
      </ScrollView>
    </ThemedView>
  );
}

interface SectionProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  helperText: string;
  status: 'idle' | 'loading' | 'done' | 'error';
  content?: string;
  errorMessage?: string;
  actionLabel: string;
  onAction: () => void;
  onShare: () => void;
  disabled?: boolean;
  disabledHint?: string;
}

function Section({
  icon,
  title,
  helperText,
  status,
  content,
  errorMessage,
  actionLabel,
  onAction,
  onShare,
  disabled,
  disabledHint,
}: SectionProps) {
  const theme = useTheme();

  return (
    <View style={[styles.sectionCard, { backgroundColor: theme.backgroundElement }]}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderLeft}>
          <Ionicons name={icon} size={18} color={AccentColors.primary} />
          <ThemedText type="smallBold" style={styles.sectionTitle}>
            {title}
          </ThemedText>
        </View>
        {status === 'done' && content && (
          <Pressable onPress={onShare} hitSlop={10}>
            <Ionicons name="share-outline" size={20} color={theme.textSecondary} />
          </Pressable>
        )}
      </View>

      {status === 'done' && content ? (
        <ThemedText type="default" style={styles.sectionContent} selectable>
          {content}
        </ThemedText>
      ) : disabled ? (
        <ThemedText type="small" themeColor="textSecondary">
          {disabledHint}
        </ThemedText>
      ) : status === 'error' ? (
        <ThemedText type="small" style={styles.errorText}>
          {errorMessage}
        </ThemedText>
      ) : (
        <ThemedText type="small" themeColor="textSecondary">
          {helperText}
        </ThemedText>
      )}

      {!disabled && (
        <PrimaryButton
          label={actionLabel}
          icon={status === 'done' ? 'refresh' : icon}
          variant={status === 'done' ? 'ghost' : 'primary'}
          loading={status === 'loading'}
          onPress={onAction}
          style={styles.sectionButton}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  missingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: Spacing.three,
    gap: Spacing.four,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titleText: {
    flex: 1,
    fontSize: 22,
    lineHeight: 28,
  },
  titleInput: {
    flex: 1,
    fontSize: 22,
    lineHeight: 28,
    borderBottomWidth: 1,
    paddingVertical: 2,
  },
  playerCard: {
    borderRadius: 16,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(128,128,128,0.25)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: AccentColors.primary,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  playerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
    marginTop: 4,
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: AccentColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionCard: {
    gap: 10,
    padding: Spacing.three,
    borderRadius: 18,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
  },
  sectionContent: {
    lineHeight: 22,
    fontSize: 16,
  },
  sectionButton: {
    marginTop: 4,
  },
  errorText: {
    color: AccentColors.danger,
  },
});
