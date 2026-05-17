// Lightweight WebAudio "celestial" ringtone — no asset bundle needed.
// Two-tone shimmer that loops gently until stopped. Designed to feel
// otherworldly rather than alarming, fitting Stellara's tone.

type RingHandle = { stop: () => void };

let activeHandle: RingHandle | null = null;

const createCtx = (): AudioContext | null => {
  const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as
    | typeof AudioContext
    | undefined;
  if (!Ctx) return null;
  try {
    return new Ctx();
  } catch {
    return null;
  }
};

/** Plays a soft, looping celestial ringtone. Returns a stop handle. */
export const playRingtone = (mode: "incoming" | "outgoing" = "incoming"): RingHandle => {
  stopRingtone();
  const ctx = createCtx();
  if (!ctx) {
    const noop = { stop: () => {} };
    activeHandle = noop;
    return noop;
  }

  // Resume if suspended (autoplay policy).
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }

  const master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);

  // Two soft sine voices an octave apart, with a slow LFO on amplitude
  // to create a shimmering "breathing" effect.
  const base = mode === "incoming" ? 523.25 /* C5 */ : 392.0 /* G4 */;
  const voices: OscillatorNode[] = [];
  const gains: GainNode[] = [];
  [base, base * 1.5].forEach((freq, i) => {
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.value = i === 0 ? 0.18 : 0.1;
    o.connect(g).connect(master);
    o.start();
    voices.push(o);
    gains.push(g);
  });

  // LFO drives master gain between 0 and ~0.5 to create the pulse.
  const peak = mode === "incoming" ? 0.45 : 0.25;
  const period = mode === "incoming" ? 2.4 : 3.0; // seconds
  const now = ctx.currentTime;
  const stopAt = now + 60 * 5; // safety cap: 5 minutes max
  for (let t = now; t < stopAt; t += period) {
    master.gain.setValueAtTime(0, t);
    master.gain.linearRampToValueAtTime(peak, t + period * 0.25);
    master.gain.linearRampToValueAtTime(0, t + period * 0.85);
  }

  let stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    try {
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
      master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.15);
    } catch {/* noop */}
    window.setTimeout(() => {
      voices.forEach((v) => { try { v.stop(); } catch {/* noop */} });
      try { ctx.close(); } catch {/* noop */}
    }, 200);
  };

  const handle = { stop };
  activeHandle = handle;
  return handle;
};

export const stopRingtone = () => {
  if (activeHandle) {
    activeHandle.stop();
    activeHandle = null;
  }
};