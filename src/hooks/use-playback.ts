import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { preload, setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus, type AudioSource } from 'expo-audio';

import { account } from '@/lib/appwrite/client';
import type { RecordingSegment } from '@/lib/types';

// Segment files are locked to their owner (Role.user(userId), see recordingFiles.ts) — a plain
// URL isn't fetchable without proof of who's asking, and neither <audio> tags nor the native
// player have a way to attach a header to their own request. So every source carries a freshly
// minted JWT as a header instead (confirmed against the real instance), and on web that only
// takes effect via preload() — expo-audio's web player fetches+blobs the source ahead of time and
// only *then* honors headers; a bare replace() with headers silently falls back to the raw
// (unauthenticated, 404ing) URL. Minting a new JWT per segment rather than once up front also
// means a 3h+ recording can't run into the token's ~1h max lifetime mid-playback.
async function buildAuthedSource(segment: RecordingSegment): Promise<AudioSource> {
  const { jwt } = await account.createJWT({ duration: 3600 });
  return { uri: segment.fileUrl, headers: { 'X-Appwrite-JWT': jwt } };
}

// Total duration is computed from the segments' own recorded durationMillis (known at capture
// time) rather than from the player's status.duration — expo-audio's docs note Chrome's
// MediaRecorder can produce webm files with missing duration metadata, which would make a
// player-reported total unreliable for web recordings.
export function usePlayback(segments: RecordingSegment[]) {
  const ordered = useMemo(() => [...segments].sort((a, b) => a.index - b.index), [segments]);
  const [segmentIndex, setSegmentIndex] = useState(0);
  const [isLoadingSegment, setIsLoadingSegment] = useState(false);
  const loadTokenRef = useRef(0);

  const player = useAudioPlayer({ uri: '' });
  const status = useAudioPlayerStatus(player);

  const offsetSeconds = ordered.slice(0, segmentIndex).reduce((sum, segment) => sum + segment.durationMillis / 1000, 0);
  const totalDurationSeconds = ordered.reduce((sum, segment) => sum + segment.durationMillis / 1000, 0);
  const currentTime = offsetSeconds + status.currentTime;

  // Swaps in a given segment, guarding against an older/slower load resolving after a newer one
  // was already requested (e.g. rapid skips).
  const loadSegment = useCallback(
    async (index: number, { autoplay = false } = {}) => {
      const segment = ordered[index];
      if (!segment) return;
      const myToken = ++loadTokenRef.current;
      setIsLoadingSegment(true);
      try {
        const source = await buildAuthedSource(segment);
        await preload(source).catch(() => {});
        if (loadTokenRef.current !== myToken) return; // superseded by a newer load
        player.replace(source);
        if (autoplay) player.play();
      } finally {
        if (loadTokenRef.current === myToken) setIsLoadingSegment(false);
      }
    },
    [ordered, player],
  );

  // Load the first segment as soon as the recording's segments are known. Doesn't autoplay —
  // opening the screen shouldn't start audio on its own. loadSegment does real network I/O
  // (mint a JWT, fetch+cache the audio) before touching state, so this is a genuine
  // subscription-to-an-external-system effect, not derived state — the lint rule can't see
  // through the function call to tell the two apart.
  const firstSegmentId = ordered[0]?.id;
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (firstSegmentId) void loadSegment(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only reload when the recording itself changes
  }, [firstSegmentId]);

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
      void loadSegment(nextIndex, { autoplay: true });
    }
  }, [status.didJustFinish, segmentIndex, ordered, loadSegment]);

  const toggle = useCallback(async () => {
    if (status.playing) {
      player.pause();
      return;
    }
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
    const atVeryEnd = segmentIndex === ordered.length - 1 && status.didJustFinish;
    if (atVeryEnd) {
      setSegmentIndex(0);
      await loadSegment(0);
      await player.seekTo(0);
    }
    player.play();
  }, [player, status.playing, status.didJustFinish, segmentIndex, ordered, loadSegment]);

  const skip = useCallback(
    async (deltaSeconds: number) => {
      if (ordered.length === 0) return;
      const wasPlaying = status.playing;
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
        await loadSegment(targetIndex, { autoplay: wasPlaying });
      }
      await player.seekTo(withinSegment);
    },
    [player, status.playing, currentTime, totalDurationSeconds, ordered, segmentIndex, loadSegment],
  );

  return {
    playing: status.playing,
    currentTime,
    duration: totalDurationSeconds,
    isLoaded: status.isLoaded && !isLoadingSegment,
    toggle,
    skip,
  };
}
