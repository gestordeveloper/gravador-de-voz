import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Animated, Linking, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { LiveWaveform } from '@/components/live-waveform';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AccentColors, Spacing } from '@/constants/theme';
import { useRecorder } from '@/hooks/use-recorder';
import { useTheme } from '@/hooks/use-theme';
import { deleteLocalSegmentFile } from '@/lib/appwrite/recordingFiles';
import { formatDuration } from '@/lib/format';
import { useAuthStore } from '@/store/useAuthStore';
import { useRecordingsStore } from '@/store/useRecordingsStore';

export default function RecordScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { phase, durationMillis, levels, permissionDenied, start, pause, resume, stop } = useRecorder();
  const userId = useAuthStore((s) => s.user?.id ?? '');
  const createRecording = useRecordingsStore((s) => s.createRecording);
  const [pulse] = useState(() => new Animated.Value(1));
  const [saving, setSaving] = useState(false);
  const [discardConfirmVisible, setDiscardConfirmVisible] = useState(false);
  const [infoDialog, setInfoDialog] = useState<{ title: string; message: string } | null>(null);

  useEffect(() => {
    if (phase === 'recording') {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.12, duration: 700, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    }
    pulse.setValue(1);
  }, [phase, pulse]);

  const handleStart = async () => {
    const started = await start();
    if (started) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const handleTogglePause = () => {
    void Haptics.selectionAsync();
    if (phase === 'recording') {
      pause();
    } else if (phase === 'paused') {
      resume();
    }
  };

  const handleDiscard = () => {
    setDiscardConfirmVisible(true);
  };

  const confirmDiscard = async () => {
    setDiscardConfirmVisible(false);
    const result = await stop();
    result?.segments.forEach((segment) => deleteLocalSegmentFile(segment.uri));
  };

  const handleSave = async () => {
    const result = await stop();
    if (!result || result.durationMillis < 500) {
      setInfoDialog({ title: 'Gravação muito curta', message: 'Tente gravar por mais tempo antes de salvar.' });
      return;
    }
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSaving(true);
    try {
      const recording = await createRecording(userId, result.segments);
      router.push(`/recording/${recording.id}`);
    } catch (error) {
      setInfoDialog({
        title: 'Erro ao salvar',
        message: error instanceof Error ? error.message : 'Tente novamente.',
      });
    } finally {
      setSaving(false);
    }
  };

  if (permissionDenied) {
    return (
      <ThemedView style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <View style={styles.permissionIconWrap}>
          <Ionicons name="mic-off-outline" size={40} color={AccentColors.danger} />
        </View>
        <ThemedText type="subtitle" style={styles.permissionTitle}>
          Precisamos do microfone
        </ThemedText>
        <ThemedText type="default" themeColor="textSecondary" style={styles.permissionText}>
          Para gravar sua voz, permita o acesso ao microfone nas configurações do celular.
        </ThemedText>
        <Pressable onPress={() => Linking.openSettings()} style={styles.settingsButton}>
          <ThemedText type="smallBold" style={{ color: '#ffffff' }}>
            Abrir configurações
          </ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  const isActive = phase !== 'idle';
  const isPaused = phase === 'paused';

  const mainLabel = isPaused ? 'Toque para continuar' : isActive ? 'Toque para pausar' : 'Toque para gravar';

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top + Spacing.four }]}>
      <View style={styles.header}>
        <ThemedText type="title" style={styles.headerTitle}>
          {isActive ? (isPaused ? 'Pausado' : 'Gravando…') : 'Nova gravação'}
        </ThemedText>
      </View>

      <View style={styles.stage}>
        {isActive ? (
          <View
            style={[
              styles.recordingCard,
              { backgroundColor: isPaused ? theme.backgroundElement : 'rgba(229,72,77,0.1)' },
            ]}>
            <View style={styles.recordingBadgeRow}>
              <View style={[styles.dot, isPaused && styles.dotPaused]} />
              <ThemedText type="smallBold">{isPaused ? 'Pausado' : 'Gravando agora'}</ThemedText>
            </View>
            <ThemedText style={styles.timer}>{formatDuration(durationMillis)}</ThemedText>
            <LiveWaveform
              levels={levels}
              height={120}
              color={isPaused ? theme.textSecondary : AccentColors.danger}
            />
          </View>
        ) : (
          <View style={styles.idleHint}>
            <ThemedText type="default" themeColor="textSecondary" style={styles.idleHintText}>
              Toque no botão grande abaixo para começar a gravar sua voz.
            </ThemedText>
          </View>
        )}
      </View>

      <View style={[styles.controls, { paddingBottom: insets.bottom + Spacing.five }]}>
        <View style={styles.controlsRow}>
          {isActive && (
            <View style={styles.sideControl}>
              <Pressable
                onPress={handleDiscard}
                style={({ pressed }) => [
                  styles.sideButton,
                  { backgroundColor: theme.backgroundElement },
                  pressed && styles.pressedScale,
                ]}>
                <Ionicons name="trash-outline" size={26} color={AccentColors.danger} />
              </Pressable>
              <ThemedText type="small" themeColor="textSecondary">
                Descartar
              </ThemedText>
            </View>
          )}

          <View style={styles.mainControl}>
            {isActive ? (
              <Pressable
                onPress={handleTogglePause}
                style={({ pressed }) => [
                  styles.mainButton,
                  styles.secondaryMain,
                  pressed && styles.pressedScale,
                ]}>
                <Ionicons name={isPaused ? 'play' : 'pause'} size={36} color={AccentColors.primary} />
              </Pressable>
            ) : (
              <Animated.View style={{ transform: [{ scale: pulse }] }}>
                <Pressable
                  onPress={handleStart}
                  style={({ pressed }) => [
                    styles.mainButton,
                    styles.recordMain,
                    pressed && styles.pressedScale,
                  ]}>
                  <Ionicons name="mic" size={44} color="#ffffff" />
                </Pressable>
              </Animated.View>
            )}
            <ThemedText type="smallBold" style={styles.mainLabel}>
              {mainLabel}
            </ThemedText>
          </View>

          {isActive && (
            <View style={styles.sideControl}>
              <Pressable
                onPress={handleSave}
                disabled={saving}
                style={({ pressed }) => [styles.saveButton, pressed && styles.pressedScale, saving && styles.disabled]}>
                {saving ? <ActivityIndicator color="#ffffff" /> : <Ionicons name="checkmark" size={28} color="#ffffff" />}
              </Pressable>
              <ThemedText type="small" themeColor="textSecondary">
                {saving ? 'Enviando…' : 'Salvar'}
              </ThemedText>
            </View>
          )}
        </View>
      </View>

      {saving && (
        <View style={[StyleSheet.absoluteFill, styles.savingOverlay]}>
          <ActivityIndicator size="large" color="#ffffff" />
          <ThemedText type="smallBold" style={styles.savingText}>
            Salvando gravação…
          </ThemedText>
        </View>
      )}

      <ConfirmDialog
        visible={discardConfirmVisible}
        title="Descartar gravação?"
        message="O áudio gravado será apagado e não poderá ser recuperado."
        confirmLabel="Descartar"
        onConfirm={() => void confirmDiscard()}
        onCancel={() => setDiscardConfirmVisible(false)}
      />

      <ConfirmDialog
        visible={infoDialog !== null}
        title={infoDialog?.title ?? ''}
        message={infoDialog?.message}
        destructive={false}
        onConfirm={() => setInfoDialog(null)}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.five,
    gap: 8,
  },
  permissionIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(229,72,77,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  permissionTitle: {
    fontSize: 22,
    lineHeight: 28,
    textAlign: 'center',
  },
  permissionText: {
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 22,
  },
  settingsButton: {
    marginTop: Spacing.three,
    backgroundColor: AccentColors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
  },
  header: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
  },
  headerTitle: {
    fontSize: 30,
    lineHeight: 36,
  },
  stage: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
  recordingCard: {
    borderRadius: 24,
    paddingVertical: Spacing.five,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    gap: Spacing.three,
  },
  recordingBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: AccentColors.danger,
  },
  dotPaused: {
    backgroundColor: AccentColors.warning,
  },
  timer: {
    fontSize: 52,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  idleHint: {
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
  },
  idleHintText: {
    fontSize: 17,
    lineHeight: 24,
    textAlign: 'center',
  },
  controls: {
    paddingHorizontal: Spacing.three,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 28,
  },
  sideControl: {
    alignItems: 'center',
    gap: 6,
    width: 72,
  },
  mainControl: {
    alignItems: 'center',
    gap: 10,
  },
  mainLabel: {
    color: AccentColors.primary,
  },
  mainButton: {
    width: 104,
    height: 104,
    borderRadius: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordMain: {
    backgroundColor: AccentColors.danger,
  },
  secondaryMain: {
    backgroundColor: 'rgba(60,135,247,0.14)',
  },
  sideButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: AccentColors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressedScale: {
    transform: [{ scale: 0.94 }],
    opacity: 0.9,
  },
  disabled: {
    opacity: 0.6,
  },
  savingOverlay: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  savingText: {
    color: '#ffffff',
  },
});
