import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ApiKeyField } from '@/components/api-key-field';
import { LabeledTextInput } from '@/components/labeled-text-input';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import type { ProviderId } from '@/lib/types';

interface ModelField {
  label: string;
  value: string;
  placeholder: string;
  onChangeText: (text: string) => void;
}

interface ProviderSettingsCardProps {
  provider: ProviderId;
  apiKey: string;
  onChangeApiKey: (text: string) => void;
  modelFields: ModelField[];
}

export function ProviderSettingsCard({ provider, apiKey, onChangeApiKey, modelFields }: ProviderSettingsCardProps) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.container}>
      <ApiKeyField provider={provider} value={apiKey} onChangeText={onChangeApiKey} />

      {modelFields.length > 0 && (
        <View>
          <Pressable onPress={() => setExpanded((v) => !v)} style={styles.toggleRow} hitSlop={8}>
            <ThemedText type="small" themeColor="textSecondary">
              Configurações avançadas (modelo)
            </ThemedText>
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={theme.textSecondary}
            />
          </Pressable>

          {expanded && (
            <View style={styles.fields}>
              {modelFields.map((field) => (
                <LabeledTextInput
                  key={field.label}
                  label={field.label}
                  value={field.value}
                  placeholder={field.placeholder}
                  onChangeText={field.onChangeText}
                />
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  fields: {
    gap: 10,
    marginTop: 4,
  },
});
