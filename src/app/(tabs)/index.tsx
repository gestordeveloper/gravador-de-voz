import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RecordingListItem } from '@/components/recording-list-item';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AccentColors, Spacing } from '@/constants/theme';
import { useRecordingsStore } from '@/store/useRecordingsStore';
import type { Recording } from '@/lib/types';

export default function RecordingsScreen() {
  const insets = useSafeAreaInsets();
  const recordings = useRecordingsStore((s) => s.recordings);
  const deleteRecording = useRecordingsStore((s) => s.deleteRecording);

  const handleMore = (recording: Recording) => {
    Alert.alert(recording.title, undefined, [
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          Alert.alert('Excluir gravação?', 'Essa ação não pode ser desfeita.', [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Excluir', style: 'destructive', onPress: () => deleteRecording(recording.id) },
          ]);
        },
      },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top + Spacing.three }]}>
      <View style={styles.header}>
        <ThemedText type="title" style={styles.title}>
          Gravações
        </ThemedText>
      </View>

      {recordings.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="mic-outline" size={44} color={AccentColors.primary} />
          </View>
          <ThemedText type="subtitle" style={styles.emptyTitle}>
            Vamos gravar sua primeira nota de voz?
          </ThemedText>
          <ThemedText type="default" themeColor="textSecondary" style={styles.emptyText}>
            É simples: toque no botão abaixo, fale, e depois você pode transcrever e resumir com
            inteligência artificial.
          </ThemedText>
          <Pressable
            onPress={() => router.push('/(tabs)/record')}
            style={({ pressed }) => [styles.bigRecordButton, pressed && styles.pressed]}>
            <Ionicons name="mic" size={26} color="#ffffff" />
            <ThemedText type="smallBold" style={styles.bigRecordButtonLabel}>
              Gravar agora
            </ThemedText>
          </Pressable>
        </View>
      ) : (
        <>
          <FlatList
            data={recordings}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <RecordingListItem
                recording={item}
                onPress={() => router.push(`/recording/${item.id}`)}
                onMore={() => handleMore(item)}
              />
            )}
          />
          <Pressable
            onPress={() => router.push('/(tabs)/record')}
            style={({ pressed }) => [
              styles.fab,
              { bottom: insets.bottom + Spacing.four },
              pressed && styles.pressed,
            ]}>
            <Ionicons name="mic" size={22} color="#ffffff" />
            <ThemedText type="smallBold" style={styles.fabLabel}>
              Nova gravação
            </ThemedText>
          </Pressable>
        </>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
  },
  list: {
    padding: Spacing.three,
    paddingBottom: 100,
    gap: 10,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.five,
    gap: 10,
  },
  emptyIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(60,135,247,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 22,
    lineHeight: 28,
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 22,
  },
  bigRecordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: Spacing.four,
    backgroundColor: AccentColors.primary,
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 18,
  },
  bigRecordButtonLabel: {
    color: '#ffffff',
    fontSize: 17,
  },
  fab: {
    position: 'absolute',
    right: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: AccentColors.primary,
    paddingVertical: 16,
    paddingHorizontal: 22,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  fabLabel: {
    color: '#ffffff',
    fontSize: 16,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.97 }],
  },
});
