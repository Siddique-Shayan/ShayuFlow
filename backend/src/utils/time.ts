/** "12:34" or "1:02:03" to seconds; null for anything else. */
export const parseTimestamp = (time: string): number | null => {
  const m = /^(?:(\d+):)?(\d{1,2}):(\d{2})(?:\.\d+)?$/.exec(time.trim());
  if (!m) return null;
  return Number(m[1] ?? 0) * 3600 + Number(m[2]) * 60 + Number(m[3]);
};

/** Seconds to "m:ss", or "h:mm:ss" from an hour on; the format the model is asked to read and write. */
export const toClock = (sec: number) => {
  const s = Math.floor(sec);
  const h = Math.floor(s / 3600);
  const mm = String(Math.floor((s % 3600) / 60)).padStart(h ? 2 : 1, "0");
  const ss = String(s % 60).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
};
