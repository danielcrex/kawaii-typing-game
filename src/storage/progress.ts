/**
 * Persistence (PROJECT.md §10) — localStorage under a versioned key.
 *
 * STATUS (step 5): the piece the adaptive controller needs — settled intensity
 * PER PHASE. Persisting per phase (not globally) is deliberate: a hard new
 * content band must never inherit a high intensity from an easy one (§decision
 * 3). Unlocks, stars, best WPM/accuracy history, and prefs are added in step 8
 * onto this same versioned shape.
 *
 * All reads are defensive: malformed or old data degrades to a fresh, safe
 * default rather than throwing.
 */
import type { PhaseId } from '../data/levels';

export const STORAGE_KEY = 'kawaii-typing-friends/v2';

/** First-run starting-point pick (age lever (a), §6). */
interface OnboardingData {
  /** True once the player has made the one-tap starting-point choice. */
  done: boolean;
  /** The default entry level their choice set (still overridable via level-select). */
  entryLevel: number;
}

interface ProgressData {
  version: 2;
  /** Settled adaptive intensity (0..1) per phase. */
  intensityByPhase: Partial<Record<PhaseId, number>>;
  /** Optional so existing v2 saves (pre-onboarding) load without migration. */
  onboarding?: OnboardingData;
  /** Keyboard-guide toggle (§5.4). Undefined → default on. */
  guideOn?: boolean;
}

function fresh(): ProgressData {
  return { version: 2, intensityByPhase: {} };
}

/** Load + validate the stored progress, or a fresh default. Never throws. */
function load(): ProgressData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fresh();
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      (parsed as ProgressData).version !== 2 ||
      typeof (parsed as ProgressData).intensityByPhase !== 'object' ||
      (parsed as ProgressData).intensityByPhase === null
    ) {
      return fresh();
    }
    return parsed as ProgressData;
  } catch {
    return fresh(); // corrupt JSON or storage disabled → safe default
  }
}

/** Persist progress, swallowing quota/availability errors (never crashes play). */
function save(data: ProgressData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* storage full or unavailable — non-fatal */
  }
}

/** Settled intensity for a phase, or undefined if none stored / invalid. */
export function loadPhaseIntensity(phase: PhaseId): number | undefined {
  const value = load().intensityByPhase[phase];
  return typeof value === 'number' && value >= 0 && value <= 1 ? value : undefined;
}

/** Store the settled intensity for a phase (clamped to [0,1]). */
export function savePhaseIntensity(phase: PhaseId, intensity: number): void {
  const data = load();
  data.intensityByPhase[phase] = Math.min(1, Math.max(0, intensity));
  save(data);
}

/** The stored starting-point pick, or undefined if the player hasn't chosen yet. */
export function loadOnboarding(): OnboardingData | undefined {
  const o = load().onboarding;
  if (o && typeof o.done === 'boolean' && typeof o.entryLevel === 'number') return o;
  return undefined;
}

/** Persist the one-tap starting-point pick (entry level clamped to a sane range). */
export function saveOnboarding(entryLevel: number): void {
  const data = load();
  data.onboarding = { done: true, entryLevel: Math.min(24, Math.max(1, Math.round(entryLevel))) };
  save(data);
}

/** Keyboard-guide toggle (§5.4). Defaults ON for the youngest (find-the-glowing-key). */
export function loadGuideOn(): boolean {
  const g = load().guideOn;
  return typeof g === 'boolean' ? g : true;
}

/** Persist the keyboard-guide toggle. */
export function saveGuideOn(on: boolean): void {
  const data = load();
  data.guideOn = on;
  save(data);
}
