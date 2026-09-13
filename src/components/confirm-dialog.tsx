import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  // Omit onCancel for a single-button, informational dialog (e.g. an error message) instead of
  // a yes/no confirmation.
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
}

// react-native-web's Alert.alert() is a documented no-op (it never shows anything, never calls
// back) — every confirmation in this app needs to go through a real component instead.
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancelar',
  destructive = true,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const theme = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel ?? onConfirm}>
      <Pressable style={styles.backdrop} onPress={onCancel ?? onConfirm}>
        <Pressable
          style={[styles.card, { backgroundColor: theme.background }]}
          onPress={(e) => e.stopPropagation?.()}>
          <ThemedText type="subtitle" style={styles.title}>
            {title}
          </ThemedText>
          {message && (
            <ThemedText type="default" themeColor="textSecondary" style={styles.message}>
              {message}
            </ThemedText>
          )}
          <View style={styles.actions}>
            {onCancel && (
              <PrimaryButton label={cancelLabel} variant="ghost" onPress={onCancel} style={styles.button} />
            )}
            <PrimaryButton
              label={confirmLabel ?? (onCancel ? 'Confirmar' : 'OK')}
              variant={destructive ? 'danger' : 'primary'}
              onPress={onConfirm}
              style={styles.button}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    padding: Spacing.four,
    gap: 8,
  },
  title: {
    fontSize: 20,
    lineHeight: 26,
  },
  message: {
    marginBottom: 4,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: Spacing.two,
  },
  button: {
    minHeight: 44,
    paddingHorizontal: 16,
  },
});
