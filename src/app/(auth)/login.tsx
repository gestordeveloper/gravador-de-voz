import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LabeledTextInput } from '@/components/labeled-text-input';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AccentColors, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/store/useAuthStore';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const login = useAuthStore((s) => s.login);
  const storeError = useAuthStore((s) => s.error);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password) return;
    setSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch {
      // error already captured in the store, surfaced below
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ThemedView style={[styles.container, { paddingTop: insets.top + Spacing.six }]}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ThemedText type="title" style={styles.title}>
            Entrar
          </ThemedText>
          <ThemedText type="default" themeColor="textSecondary" style={styles.subtitle}>
            Suas gravações, chaves e configurações ficam salvas na sua conta.
          </ThemedText>

          <LabeledTextInput label="E-mail" value={email} onChangeText={setEmail} placeholder="voce@exemplo.com" />
          <LabeledTextInput
            label="Senha"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
          />

          {storeError && (
            <ThemedText type="small" style={styles.error}>
              {storeError}
            </ThemedText>
          )}

          <PrimaryButton label="Entrar" onPress={() => void handleSubmit()} loading={submitting} style={styles.button} />

          <Link href="/(auth)/signup" replace style={styles.link}>
            <ThemedText type="small" themeColor="textSecondary">
              Não tem conta? <ThemedText type="smallBold">Criar conta</ThemedText>
            </ThemedText>
          </Link>
        </ScrollView>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1 },
  content: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  title: { fontSize: 30, lineHeight: 36 },
  subtitle: { marginBottom: Spacing.two },
  button: { marginTop: Spacing.two },
  link: { alignSelf: 'center', marginTop: Spacing.three },
  error: { color: AccentColors.danger },
});
