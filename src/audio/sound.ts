/**
 * Audio (PROJECT.md §9) — SFX SYNTHESIZED via WebAudio (no binary assets), plus
 * a gentle ambient music pad. Short, soft-attack, never annoying on repeat.
 *
 * Design notes:
 *  - The AudioContext is created lazily on the first sound (which follows a user
 *    gesture — a keystroke or tap — so autoplay policies are satisfied).
 *  - Everything runs through a master gain (volume × !muted). Music runs on its
 *    own bus that DUCKS briefly whenever an SFX plays (§9).
 *  - Per-keystroke sound is deliberately OFF by default and very subtle when on —
 *    a tick on every key gets grating on repeat.
 *  - Prefs (muted / volume / music / key-clicks) persist via storage/progress.
 */
import { loadAudioPrefs, saveAudioPrefs, type AudioPrefs } from '../storage/progress';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let musicBus: GainNode | null = null;
let musicNodes: { osc: OscillatorNode; gain: GainNode }[] = [];
let musicStarted = false;
let musicPhase = 0;
let musicAudio: HTMLAudioElement | null = null;
let prefs: AudioPrefs = loadAudioPrefs();

/** Base music-bus level (kept low; ducking dips below it). */
const MUSIC_LEVEL = 0.06;

/**
 * Real music track (§9). When set to a URL of a CC0/royalty-free kawaii/chiptune
 * LOOP (e.g. '/music/theme.mp3' placed in public/), the persistent player plays
 * it on loop through the music bus (ducking + volume apply) INSTEAD of the synth
 * pad below. Left null until a track is chosen — synthesis is right for SFX but
 * wrong for music, so the pad is only a placeholder.
 */
const MUSIC_TRACK: string | null = null;

/** Lazily create the audio graph on first use (post user-gesture). */
function ensure(): AudioContext | null {
  if (ctx) return ctx;
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = prefs.muted ? 0 : prefs.volume;
    master.connect(ctx.destination);
    musicBus = ctx.createGain();
    musicBus.gain.value = prefs.music ? MUSIC_LEVEL : 0;
    musicBus.connect(master);
  } catch {
    ctx = null; // WebAudio unavailable — the game stays silent, never crashes
  }
  return ctx;
}

/** One enveloped oscillator note; `glideTo` bends the pitch over the note. */
function note(
  freq: number,
  dur: number,
  opts: { type?: OscillatorType; gain?: number; attack?: number; glideTo?: number; delay?: number } = {},
): void {
  const c = ensure();
  if (!c || !master) return;
  const t0 = c.currentTime + (opts.delay ?? 0);
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = opts.type ?? 'sine';
  osc.frequency.setValueAtTime(freq, t0);
  if (opts.glideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.glideTo), t0 + dur);
  const peak = opts.gain ?? 0.2;
  const atk = opts.attack ?? 0.006;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + atk);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

/** A short band-passed noise burst (used for firework crackle). */
function noise(dur: number, opts: { gain?: number; delay?: number; freq?: number; q?: number } = {}): void {
  const c = ensure();
  if (!c || !master) return;
  const t0 = c.currentTime + (opts.delay ?? 0);
  const frames = Math.max(1, Math.floor(c.sampleRate * dur));
  const buffer = c.createBuffer(1, frames, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buffer;
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = opts.freq ?? 2200;
  bp.Q.value = opts.q ?? 0.8;
  const g = c.createGain();
  const peak = opts.gain ?? 0.14;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(bp).connect(g).connect(master);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

/** Briefly duck the music bus so an SFX reads clearly (§9). */
function duck(): void {
  const c = ensure();
  if (!c || !musicBus || !prefs.music) return;
  const now = c.currentTime;
  const base = MUSIC_LEVEL;
  musicBus.gain.cancelScheduledValues(now);
  musicBus.gain.setValueAtTime(musicBus.gain.value, now);
  musicBus.gain.linearRampToValueAtTime(base * 0.28, now + 0.03);
  musicBus.gain.linearRampToValueAtTime(base, now + 0.45);
}

/** Play an SFX (ducking the music under it). A no-op while muted. */
function sfx(fn: () => void): void {
  if (prefs.muted) return;
  if (!ensure()) return;
  duck();
  fn();
}

/** The synth-pad chord for a phase group (placeholder music until a real track). */
function phaseChord(phaseIndex: number): number[] {
  const root = 130.81 * Math.pow(2, (phaseIndex % 6) / 12); // C3, up a little per phase
  return [root, root * 1.25, root * 1.5, root * 2.25]; // soft major-ninth
}

/** Build the ambient pad oscillators for a phase into `nodes`. */
function buildPad(
  phaseIndex: number,
  c: AudioContext,
  bus: GainNode,
  nodes: { osc: OscillatorNode; gain: GainNode }[],
): void {
  for (const f of phaseChord(phaseIndex)) {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = 'sine';
    osc.frequency.value = f * (1 + (Math.random() - 0.5) * 0.004); // faint detune for warmth
    g.gain.value = 0.25;
    osc.connect(g).connect(bus);
    osc.start();
    nodes.push({ osc, gain: g });
  }
}

/** Retune the running pad to a new phase chord — a smooth glide, no restart. */
function tunePad(phaseIndex: number, c: AudioContext, nodes: { osc: OscillatorNode; gain: GainNode }[]): void {
  const chord = phaseChord(phaseIndex);
  nodes.forEach((n, i) => {
    const f = chord[i];
    if (f) n.osc.frequency.linearRampToValueAtTime(f, c.currentTime + 1.2);
  });
}

// ---------- The §9 sound set ----------
export const Sound = {
  /** Satisfying pop on a correct tile clear — a bright pluck + a sparkle tail. */
  clearPop(): void {
    sfx(() => {
      note(660, 0.13, { type: 'triangle', gain: 0.22, glideTo: 990 });
      note(1320, 0.16, { type: 'sine', gain: 0.09, delay: 0.02 });
    });
  },
  /** Soft, non-punishing "nope" on a wrong key. */
  wrong(): void {
    sfx(() => note(190, 0.09, { type: 'sine', gain: 0.09, glideTo: 150 }));
  },
  /** Very subtle per-keystroke tick — only if the pref is on. */
  keyTick(): void {
    if (!prefs.keyClicks) return;
    sfx(() => note(520, 0.028, { type: 'sine', gain: 0.05 }));
  },
  /** Ascending combo chime at a streak milestone (5/10/15…); higher = brighter. */
  streak(milestone: number): void {
    sfx(() => {
      const steps = Math.min(4, 2 + Math.floor(milestone / 5));
      const scale = [523, 659, 784, 1046, 1319];
      for (let i = 0; i < steps; i++) note(scale[i] ?? 1319, 0.12, { type: 'triangle', gain: 0.16, delay: i * 0.06 });
    });
  },
  /** Gentle "aww" on a lost heart. */
  heartLost(): void {
    sfx(() => note(520, 0.26, { type: 'sine', gain: 0.16, glideTo: 330 }));
  },
  /** Soft twinkle on a regained heart. */
  heartRegain(): void {
    sfx(() => {
      note(660, 0.1, { type: 'sine', gain: 0.12 });
      note(990, 0.12, { type: 'sine', gain: 0.1, delay: 0.06 });
    });
  },
  /** Short bright fanfare + celebratory fireworks on level complete (#3). */
  levelComplete(): void {
    sfx(() => {
      const arp = [523, 659, 784, 1046];
      arp.forEach((f, i) => note(f, 0.28, { type: 'triangle', gain: 0.2, delay: i * 0.09 }));
      note(1568, 0.4, { type: 'sine', gain: 0.12, delay: 0.36 });
      this.fireworks();
    });
  },
  /** Celebratory firework bursts: a rising whistle then a crackle, staggered. */
  fireworks(): void {
    if (prefs.muted) return;
    if (!ensure()) return;
    const bursts = [
      { at: 0.15, freq: 2400 },
      { at: 0.5, freq: 1900 },
      { at: 0.85, freq: 2800 },
    ];
    for (const bu of bursts) {
      // whistle up …
      note(500, 0.28, { type: 'sine', gain: 0.08, glideTo: 1400, delay: bu.at });
      // … then the crackle (a few quick noise pops)
      for (let i = 0; i < 5; i++) {
        noise(0.07, { gain: 0.1, freq: bu.freq + i * 120, q: 1.2, delay: bu.at + 0.28 + i * 0.04 });
      }
    }
  },
  /** Soft, kind, non-defeating tone on game over. */
  gameOver(): void {
    sfx(() => {
      [440, 349, 294].forEach((f, i) => note(f, 0.34, { type: 'sine', gain: 0.16, delay: i * 0.14 }));
    });
  },
  /** Tiny soft click for menu/button taps. */
  menuTap(): void {
    sfx(() => note(880, 0.03, { type: 'sine', gain: 0.07 }));
  },

  // ---------- Music (PERSISTENT across scenes; lives above the scene manager) ----------

  /**
   * Resume audio + start music on the FIRST user gesture (main.ts wires this to
   * a one-time pointer/key listener). AudioContexts start suspended until a
   * gesture, so this is when the persistent music actually begins.
   */
  unlock(): void {
    const c = ensure();
    if (!c) return;
    if (c.state === 'suspended') void c.resume();
    this.startMusic();
  },

  /**
   * Start the persistent music ONCE and keep it playing across every scene
   * (title → select → intro → play → complete). Scenes never stop it; they only
   * call setPhase(). No-op if already started or music is off.
   */
  startMusic(): void {
    const c = ensure();
    if (!c || !musicBus || !prefs.music || musicStarted) return;
    musicStarted = true;
    if (MUSIC_TRACK) {
      // Real loop routed through the music bus (ducking + volume apply).
      musicAudio = new Audio(MUSIC_TRACK);
      musicAudio.loop = true;
      try {
        c.createMediaElementSource(musicAudio).connect(musicBus);
      } catch {
        /* already connected / unsupported */
      }
      void musicAudio.play().catch(() => {});
    } else {
      buildPad(musicPhase, c, musicBus, musicNodes);
    }
  },

  /**
   * Set the phase group (0-based) WITHOUT restarting the music — the pad retunes
   * smoothly; a single real track just keeps looping. Starts the music if a
   * gesture already happened but it hasn't begun.
   */
  setPhase(phaseIndex: number): void {
    musicPhase = phaseIndex;
    if (!musicStarted) {
      this.startMusic();
      return;
    }
    if (!MUSIC_TRACK && ctx) tunePad(phaseIndex, ctx, musicNodes);
  },

  /** Stop the music entirely (only on a music-off toggle). */
  stopMusic(): void {
    for (const n of musicNodes) {
      try {
        n.osc.stop();
      } catch {
        /* already stopped */
      }
    }
    musicNodes = [];
    if (musicAudio) {
      musicAudio.pause();
      musicAudio = null;
    }
    musicStarted = false;
  },

  // ---------- Settings ----------
  isMuted(): boolean {
    return prefs.muted;
  },
  getVolume(): number {
    return prefs.volume;
  },
  musicOn(): boolean {
    return prefs.music;
  },
  keyClicksOn(): boolean {
    return prefs.keyClicks;
  },
  setMuted(m: boolean): void {
    prefs = { ...prefs, muted: m };
    saveAudioPrefs(prefs);
    if (master && ctx) master.gain.setTargetAtTime(m ? 0 : prefs.volume, ctx.currentTime, 0.02);
  },
  setVolume(v: number): void {
    prefs = { ...prefs, volume: Math.min(1, Math.max(0, v)) };
    saveAudioPrefs(prefs);
    if (master && ctx && !prefs.muted) master.gain.setTargetAtTime(prefs.volume, ctx.currentTime, 0.02);
  },
  setMusic(on: boolean): void {
    prefs = { ...prefs, music: on };
    saveAudioPrefs(prefs);
    if (musicBus && ctx) musicBus.gain.setTargetAtTime(on ? MUSIC_LEVEL : 0, ctx.currentTime, 0.05);
    if (on) this.startMusic();
    else this.stopMusic();
  },
  setKeyClicks(on: boolean): void {
    prefs = { ...prefs, keyClicks: on };
    saveAudioPrefs(prefs);
  },
};
