import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { JobStatus } from '@/lib/types';

interface StatusPillProps {
  status: JobStatus;
  idleLabel: string;
  loadingLabel: string;
  doneLabel: string;
  errorLabel: string;
}

const COLORS: Record<JobStatus, { bg: string; fg: string }> = {
  idle: { bg: '#E0E1E6', fg: '#60646C' },
  loading: { bg: '#FEF3C7', fg: '#92400E' },
  done: { bg: '#D1FAE5', fg: '#065F46' },
  error: { bg: '#FEE2E2', fg: '#991B1B' },
};

export function StatusPill({ status, idleLabel, loadingLabel, doneLabel, errorLabel }: StatusPillProps) {
  const label = { idle: idleLabel, loading: loadingLabel, done: doneLabel, error: errorLabel }[status];
  const colors = COLORS[status];
  return (
    <View style={[styles.pill, { backgroundColor: colors.bg }]}>
      <ThemedText type="small" style={{ color: colors.fg, fontSize: 12, lineHeight: 16 }}>
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
});
