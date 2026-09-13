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

export default function SignupScreen() {
  const insets = useSafeAreaInsets();
  const signup = useAuthStore((s) => s.signup);
  const storeError = useAuthStore((s) => s.error);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim() || password.length < 8) return;
    setSubmitting(true);
    try {
      await signup(email.trim(), password, name.trim());
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
            Criar conta
          </ThemedText>
          <ThemedText type="default" themeColor="textSecondary" style={styles.subtitle}>
            Suas gravações, chaves e configurações ficam salvas na sua conta.
          </ThemedText>

          <LabeledTextInput label="Nome" value={name} onChangeText={setName} placeholder="Seu nome" />
          <LabeledTextInput label="E-mail" value={email} onChangeText={setEmail} placeholder="voce@exemplo.com" />
          <LabeledTextInput label="Senha (mínimo 8 caracteres)" value={password} onChangeText={setPassword} placeholder="••••••••" />

          {storeError && (
            <ThemedText type="small" style={styles.error}>
              {storeError}
            </ThemedText>
          )}

          <PrimaryButton
            label="Criar conta"
            onPress={() => void handleSubmit()}
            loading={submitting}
            style={styles.button}
          />

          <Link href="/(auth)/login" replace style={styles.link}>
            <ThemedText type="small" themeColor="textSecondary">
              Já tem conta? <ThemedText type="smallBold">Entrar</ThemedText>
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
