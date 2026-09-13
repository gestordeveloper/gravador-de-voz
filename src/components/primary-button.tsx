import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AccentColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export function PrimaryButton({
  label,
  onPress,
  variant = 'primary',
  icon,
  loading = false,
  disabled = false,
  style,
}: PrimaryButtonProps) {
  const theme = useTheme();
  const isDisabled = disabled || loading;

  const backgroundColor =
    variant === 'primary' ? AccentColors.primary : variant === 'danger' ? AccentColors.danger : theme.backgroundElement;
  const textColor = variant === 'primary' || variant === 'danger' ? '#ffffff' : theme.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      hitSlop={4}
      style={({ pressed }) => [
        styles.base,
        variant === 'ghost' && styles.ghost,
        variant !== 'ghost' && { backgroundColor },
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={variant === 'ghost' ? theme.text : textColor} size="small" />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={20} color={variant === 'ghost' ? theme.text : textColor} />}
          <ThemedText type="smallBold" style={[styles.label, { color: variant === 'ghost' ? theme.text : textColor }]}>
            {label}
          </ThemedText>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 56,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
  },
  label: {
    fontSize: 16,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
});
