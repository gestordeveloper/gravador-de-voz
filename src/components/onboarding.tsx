import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AccentColors, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface Slide {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  text: string;
}

const SLIDES: Slide[] = [
  {
    icon: 'mic',
    title: 'Grave sua voz',
    text: 'Toque no botão de gravar e fale naturalmente. Você pode pausar e continuar quando quiser.',
  },
  {
    icon: 'document-text-outline',
    title: 'Transcreva automaticamente',
    text: 'Com um toque, a inteligência artificial transforma o áudio em texto para você.',
  },
  {
    icon: 'sparkles-outline',
    title: 'Receba um resumo',
    text: 'Depois de transcrever, peça um resumo curto com os pontos principais da gravação.',
  },
];

interface OnboardingProps {
  onDone: () => void;
}

export function Onboarding({ onDone }: OnboardingProps) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const [step, setStep] = useState(0);
  const slide = SLIDES[step];
  const isLast = step === SLIDES.length - 1;

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top + Spacing.four }]}>
      <Pressable onPress={onDone} style={styles.skip} hitSlop={12}>
        <ThemedText type="smallBold" themeColor="textSecondary">
          Pular
        </ThemedText>
      </Pressable>

      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Ionicons name={slide.icon} size={56} color={AccentColors.primary} />
        </View>
        <ThemedText type="subtitle" style={styles.title}>
          {slide.title}
        </ThemedText>
        <ThemedText type="default" themeColor="textSecondary" style={styles.text}>
          {slide.text}
        </ThemedText>
      </View>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                { backgroundColor: index === step ? AccentColors.primary : theme.backgroundElement },
              ]}
            />
          ))}
        </View>

        <Pressable
          onPress={() => (isLast ? onDone() : setStep((s) => s + 1))}
          style={({ pressed }) => [styles.nextButton, pressed && styles.pressed]}>
          <ThemedText type="smallBold" style={styles.nextButtonLabel}>
            {isLast ? 'Começar a usar' : 'Próximo'}
          </ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skip: {
    alignSelf: 'flex-end',
    paddingHorizontal: Spacing.three,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.five,
    gap: Spacing.two,
  },
  iconWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(60,135,247,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.three,
  },
  title: {
    fontSize: 26,
    lineHeight: 32,
    textAlign: 'center',
  },
  text: {
    fontSize: 17,
    lineHeight: 24,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: Spacing.five,
    paddingBottom: Spacing.five,
    gap: Spacing.four,
    alignItems: 'center',
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  nextButton: {
    alignSelf: 'stretch',
    backgroundColor: AccentColors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  nextButtonLabel: {
    color: '#ffffff',
    fontSize: 17,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
});
