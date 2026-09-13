import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { PROVIDER_LABELS } from '@/lib/providers/catalog';
import type { ProviderId } from '@/lib/types';
import { useTheme } from '@/hooks/use-theme';

interface ProviderSelectorProps<T extends ProviderId> {
  options: T[];
  value: T;
  onChange: (value: T) => void;
}

export function ProviderSelector<T extends ProviderId>({ options, value, onChange }: ProviderSelectorProps<T>) {
  const theme = useTheme();

  return (
    <View style={styles.row}>
      {options.map((option) => {
        const selected = option === value;
        return (
          <Pressable
            key={option}
            onPress={() => onChange(option)}
            style={[
              styles.chip,
              { backgroundColor: selected ? '#3c87f7' : theme.backgroundElement },
            ]}>
            <ThemedText
              type="smallBold"
              style={{ color: selected ? '#ffffff' : theme.text }}>
              {PROVIDER_LABELS[option]}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
  },
});
