import { StyleSheet, View } from 'react-native';

interface LiveWaveformProps {
  levels: number[];
  color?: string;
  height?: number;
}

export function LiveWaveform({ levels, color = '#3c87f7', height = 64 }: LiveWaveformProps) {
  return (
    <View style={[styles.container, { height }]}>
      {levels.map((level, index) => (
        <View
          key={index}
          style={[
            styles.bar,
            {
              height: Math.max(4, Math.round(level * height)),
              backgroundColor: color,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    gap: 3,
  },
  bar: {
    flex: 1,
    borderRadius: 3,
    maxWidth: 8,
  },
});
