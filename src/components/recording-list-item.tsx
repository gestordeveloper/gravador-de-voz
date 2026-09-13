import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { StatusPill } from '@/components/status-pill';
import { AccentColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDateTime, formatDuration } from '@/lib/format';
import type { Recording } from '@/lib/types';

interface RecordingListItemProps {
  recording: Recording;
  onPress: () => void;
  onDelete: () => void;
}

export function RecordingListItem({ recording, onPress, onDelete }: RecordingListItemProps) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        { backgroundColor: theme.backgroundElement },
        pressed && { opacity: 0.85 },
      ]}>
      <View style={styles.iconWrap}>
        <Ionicons name="mic" size={22} color={AccentColors.primary} />
      </View>
      <View style={styles.info}>
        <ThemedText type="smallBold" style={styles.title} numberOfLines={1}>
          {recording.title}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {formatDateTime(recording.createdAt)} · {formatDuration(recording.durationMillis)}
        </ThemedText>
        <View style={styles.badges}>
          {recording.transcriptStatus !== 'idle' && (
            <StatusPill
              status={recording.transcriptStatus}
              idleLabel="Transcrição"
              loadingLabel="Transcrevendo…"
              doneLabel="Transcrito"
              errorLabel="Erro na transcrição"
            />
          )}
          {recording.summaryStatus !== 'idle' && (
            <StatusPill
              status={recording.summaryStatus}
              idleLabel="Resumo"
              loadingLabel="Resumindo…"
              doneLabel="Resumido"
              errorLabel="Erro no resumo"
            />
          )}
        </View>
      </View>
      <Pressable onPress={onDelete} hitSlop={12} style={styles.moreButton}>
        <Ionicons name="trash-outline" size={20} color={theme.textSecondary} />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 18,
    gap: 12,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(60,135,247,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 16,
  },
  badges: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 2,
  },
  moreButton: {
    padding: 6,
  },
});
