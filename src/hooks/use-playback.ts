import { useCallback, useEffect, useMemo, useState } from 'react';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';

import type { RecordingSegment } from '@/lib/types';

// Total duration is computed from the segments' own recorded durationMillis (known at capture
// time) rather than from the player's status.duration — expo-audio's docs note Chrome's
// MediaRecorder can produce webm files with missing duration metadata, which would make a
// player-reported total unreliable for web recordings.
export function usePlayback(segments: RecordingSegment[]) {
  const ordered = useMemo(() => [...segments].sort((a, b) => a.index - b.index), [segments]);
  const [segmentIndex, setSegmentIndex] = useState(0);

  const player = useAudioPlayer(ordered[0] ? { uri: ordered[0].fileUrl } : { uri: '' });
  const status = useAudioPlayerStatus(player);

  const offsetSeconds = ordered.slice(0, segmentIndex).reduce((sum, segment) => sum + segment.durationMillis / 1000, 0);
  const totalDurationSeconds = ordered.reduce((sum, segment) => sum + segment.durationMillis / 1000, 0);
  const currentTime = offsetSeconds + status.currentTime;

  // Advance to the next segment automatically so multi-segment recordings play back as one
  // continuous track. Re-running this effect when segmentIndex changes is harmless: by the time
  // that happens, didJustFinish is already back to false, so the branch below is a no-op.
  // This is a genuine subscription-to-an-external-system effect (expo-audio's player reporting
  // it reached the end) rather than derived state, so setState here is the correct tool — the
  // lint rule can't tell the two apart statically.
  useEffect(() => {
    if (!status.didJustFinish) return;
    const nextIndex = segmentIndex + 1;
    if (nextIndex < ordered.length) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSegmentIndex(nextIndex);
      player.replace({ uri: ordered[nextIndex].fileUrl });
      player.play();
    }
  }, [status.didJustFinish, segmentIndex, ordered, player]);

  const toggle = useCallback(async () => {
    if (status.playing) {
      player.pause();
      return;
    }
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
    const atVeryEnd = segmentIndex === ordered.length - 1 && status.didJustFinish;
    if (atVeryEnd) {
      setSegmentIndex(0);
      player.replace({ uri: ordered[0].fileUrl });
      await player.seekTo(0);
    }
    player.play();
  }, [player, status.playing, status.didJustFinish, segmentIndex, ordered]);

  const skip = useCallback(
    async (deltaSeconds: number) => {
      if (ordered.length === 0) return;
      const target = Math.min(Math.max(currentTime + deltaSeconds, 0), totalDurationSeconds || 0);

      let accumulated = 0;
      let targetIndex = ordered.length - 1;
      for (let i = 0; i < ordered.length; i++) {
        const segmentDuration = ordered[i].durationMillis / 1000;
        if (target < accumulated + segmentDuration) {
          targetIndex = i;
          break;
        }
        accumulated += segmentDuration;
      }
      const withinSegment = Math.max(0, target - accumulated);

      if (targetIndex !== segmentIndex) {
        setSegmentIndex(targetIndex);
        player.replace({ uri: ordered[targetIndex].fileUrl });
      }
      await player.seekTo(withinSegment);
    },
    [player, currentTime, totalDurationSeconds, ordered, segmentIndex],
  );

  return {
    playing: status.playing,
    currentTime,
    duration: totalDurationSeconds,
    isLoaded: status.isLoaded,
    toggle,
    skip,
  };
}
