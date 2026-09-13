import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { PROVIDER_KEY_HINTS, PROVIDER_KEY_PAGE, PROVIDER_LABELS } from '@/lib/providers/catalog';
import type { ProviderId } from '@/lib/types';

interface ApiKeyFieldProps {
  provider: ProviderId;
  value: string;
  onChangeText: (text: string) => void;
}

export function ApiKeyField({ provider, value, onChangeText }: ApiKeyFieldProps) {
  const theme = useTheme();
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <ThemedText type="smallBold">{PROVIDER_LABELS[provider]}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {PROVIDER_KEY_PAGE[provider]}
        </ThemedText>
      </View>
      <View style={[styles.inputRow, { backgroundColor: theme.backgroundElement }]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={PROVIDER_KEY_HINTS[provider]}
          placeholderTextColor={theme.textSecondary}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
          style={[styles.input, { color: theme.text }]}
        />
        <Pressable onPress={() => setVisible((v) => !v)} hitSlop={8}>
          <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={20} color={theme.textSecondary} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
  },
});
