import { useCallback, useEffect, useRef, useState } from 'react';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';

import {
  dismissRecordingNotification,
  requestRecordingNotificationPermission,
  showRecordingNotification,
} from '@/lib/notifications/recordingNotification';

export type RecorderPhase = 'idle' | 'recording' | 'paused';

export interface RecordedSegment {
  uri: string;
  durationMillis: number;
  index: number;
}

export interface StoppedRecording {
  segments: RecordedSegment[];
  durationMillis: number;
}

const WAVEFORM_BARS = 42;
const MIN_LEVEL = 0.06;
const DB_FLOOR = -60;

// A single audio file above ~25MB won't fit in one request to the transcription APIs (Groq/OpenAI
// both cap around there), and a 3h recording at this preset's 128kbps is way past that. Recording
// in ~20min segments keeps every file comfortably under that limit and, as a bonus, means a crash
// near the end of a long session only loses the in-progress segment, not the whole recording.
const SEGMENT_DURATION_MS = 20 * 60 * 1000;

function emptyLevels(): number[] {
  return Array(WAVEFORM_BARS).fill(MIN_LEVEL);
}

function normalizeMetering(db: number | undefined): number {
  if (db === undefined || Number.isNaN(db)) return MIN_LEVEL;
  const clamped = Math.max(DB_FLOOR, Math.min(0, db));
  return Math.max(MIN_LEVEL, (clamped - DB_FLOOR) / -DB_FLOOR);
}

export function useRecorder() {
  const recorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true });
  const recorderState = useAudioRecorderState(recorder, 120);
  const [phase, setPhase] = useState<RecorderPhase>('idle');
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [levels, setLevels] = useState<number[]>(emptyLevels);
  const [lastSampledDuration, setLastSampledDuration] = useState(0);
  const [backgroundModeActive, setBackgroundModeActive] = useState(false);
  const [completedDurationMillis, setCompletedDurationMillis] = useState(0);

  const segmentsRef = useRef<RecordedSegment[]>([]);
  const rotatingRef = useRef(false);

  const totalDurationMillis = completedDurationMillis + recorderState.durationMillis;

  // Adjust waveform state during render as duration ticks forward — the officially
  // recommended alternative to syncing derived state via a `useEffect`.
  if (phase === 'recording' && recorderState.durationMillis !== lastSampledDuration) {
    setLastSampledDuration(recorderState.durationMillis);
    setLevels((prev) => [...prev.slice(1), normalizeMetering(recorderState.metering)]);
  }

  // Keep the "recording in progress" notification's timer in sync, once per second.
  // This is a real side effect (talking to the OS notification tray), so a `useEffect`
  // is the right tool here — unlike the waveform state above.
  const elapsedSeconds = Math.floor(totalDurationMillis / 1000);
  useEffect(() => {
    if (phase === 'idle' || !backgroundModeActive) return;
    void showRecordingNotification(totalDurationMillis, phase === 'paused');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally throttled to whole seconds
  }, [phase, elapsedSeconds, backgroundModeActive]);

  // NOTE: assumes stop() + prepareToRecordAsync() + record() on the same recorder instance opens
  // a genuinely new file each time (recorder.uri changes, recorderState.durationMillis resets to
  // 0). This isn't confirmed in the expo-audio SDK 57 docs — verify with a short test (drop
  // SEGMENT_DURATION_MS temporarily) before relying on long recordings. If it reuses/overwrites
  // the same file instead, this needs a remount-based fallback (new useAudioRecorder per segment).
  useEffect(() => {
    if (phase !== 'recording') return;
    if (recorderState.durationMillis < SEGMENT_DURATION_MS) return;
    if (rotatingRef.current) return;
    rotatingRef.current = true;

    (async () => {
      const finishedDuration = recorderState.durationMillis;
      await recorder.stop();
      // recorder.uri only reflects the completed recording once stop() has resolved.
      const finishedUri = recorder.uri;
      if (finishedUri) {
        segmentsRef.current = [
          ...segmentsRef.current,
          { uri: finishedUri, durationMillis: finishedDuration, index: segmentsRef.current.length },
        ];
        setCompletedDurationMillis((prev) => prev + finishedDuration);
      }
      await recorder.prepareToRecordAsync();
      recorder.record();
      setLevels(emptyLevels());
      setLastSampledDuration(0);
      rotatingRef.current = false;
    })();
  }, [phase, recorder, recorderState.durationMillis]);

  const start = useCallback(async () => {
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) {
      setPermissionDenied(true);
      return false;
    }
    setPermissionDenied(false);

    // Background recording needs its own permission (for the ongoing notification) and a
    // foreground service that isn't available everywhere yet. Try it, but never let it block
    // recording itself — fall back to normal foreground-only recording if it fails.
    const notificationsGranted = await requestRecordingNotificationPermission();
    let backgroundReady = false;
    try {
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
        allowsBackgroundRecording: notificationsGranted,
      });
      await recorder.prepareToRecordAsync();
      backgroundReady = notificationsGranted;
    } catch {
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
        allowsBackgroundRecording: false,
      });
      await recorder.prepareToRecordAsync();
      backgroundReady = false;
    }

    segmentsRef.current = [];
    setCompletedDurationMillis(0);
    recorder.record();
    setLevels(emptyLevels());
    setLastSampledDuration(0);
    setBackgroundModeActive(backgroundReady);
    setPhase('recording');
    if (backgroundReady) {
      void showRecordingNotification(0, false);
    }
    return true;
  }, [recorder]);

  const pause = useCallback(() => {
    recorder.pause();
    setPhase('paused');
  }, [recorder]);

  const resume = useCallback(() => {
    recorder.record();
    setPhase('recording');
  }, [recorder]);

  const stop = useCallback(async (): Promise<StoppedRecording | null> => {
    const finishedDuration = recorderState.durationMillis;
    await recorder.stop();
    // recorder.uri only reflects the completed recording once stop() has resolved.
    const finishedUri = recorder.uri;
    setPhase('idle');
    if (backgroundModeActive) {
      void dismissRecordingNotification();
    }
    setBackgroundModeActive(false);

    const segments = [...segmentsRef.current];
    if (finishedUri) {
      segments.push({ uri: finishedUri, durationMillis: finishedDuration, index: segments.length });
    }
    segmentsRef.current = [];
    if (segments.length === 0) {
      return null;
    }
    const totalMillis = segments.reduce((sum, segment) => sum + segment.durationMillis, 0);
    return { segments, durationMillis: totalMillis };
  }, [recorder, recorderState.durationMillis, backgroundModeActive]);

  return {
    phase,
    durationMillis: totalDurationMillis,
    levels,
    backgroundModeActive,
    permissionDenied,
    start,
    pause,
    resume,
    stop,
  };
}
