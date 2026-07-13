# PROJECT.md — Kawaii Typing Friends (v2 rebuild)

> Build spec for a touch-typing game for a 10-year-old learner. This document is the
> single source of truth. Build to it exactly; where it leaves a detail open, choose the
> option that best serves *readability for a beginner* and *premium feel*, and note the choice.

---

## 1. Context & objective

An existing single-file game is live at `https://typing-game.danielcrex.com/` (repo:
`danielcrex/kawaii-typing-game`, static deploy from `main`). It works but has three
disqualifying problems we are fixing in this rebuild:

1. **Broken difficulty curve** — trivially easy at the start, exponentially impossible
   later. Cause: fall speed, spawn rate, tile count and word length all ramp per level and
   compound multiplicatively.
2. **Broken fail condition** — missing too many tiles does not end the level.
3. **Clunky, non-pedagogical input** — types into a bottom buffer + Enter/Space to submit;
   doesn't teach or reward real touch typing.

**Objective:** a game that is *useful* (teaches genuine touch typing with finger
discipline), *fun* (juicy, forgiving, self-tuning), and *visually stunning* (modern, soft-luxe).

**Primary user:** Olivia, age 10, learning to type without looking. Design every decision
for her confidence first.

### Locked design decisions (do not relitigate)
- **Adaptive difficulty** — the game self-tunes to the player's real performance.
- **Finger discipline** — an on-screen keyboard guide teaches correct fingering.
- **Hearts: 3, escape = −1, slow regen during clean play, 0 = level over.** Mis-keystrokes
  are *forgiving* — a wrong key never costs a heart; it just doesn't advance the word.
- **Break from the "Daniele's Touch" pro design system.** This game gets its own
  kid-appropriate identity (defined in §7).

---

## 2. Goals & non-goals

**Goals**
- Live per-letter matching, no Enter/Space to submit.
- Auto-target (the game locks onto the tile the player's keystrokes match).
- Adaptive intensity bounded within each level's content phase.
- On-screen finger-coded keyboard guide with next-key highlight, toggleable, auto-fading.
- Authoritative, un-bypassable fail condition.
- WPM + accuracy tracking, per-level and over time.
- Soft-luxe kawaii visual identity; fun, satisfying SFX + music.
- Static build that drops onto the existing domain with no infra change.

**Non-goals (this iteration)**
- No accounts/backend — all state is local (`localStorage`).
- No multiplayer, no level editor.
- No sprite-based engine (see §3 for why DOM-first wins here).

---

## 3. Tech stack & rationale

- **Vite + TypeScript, vanilla (no framework).** React's re-render model fights a 60fps
  game loop; the menus don't justify it. The loop is imperative.
- **DOM + CSS for everything visible** — tiles, HUD, keyboard guide, menus. This is where
  "luxurious" lives on the web: layered shadows, candy-glass surfaces, spring easing, crisp
  type, and the live per-letter fill are all sharper in DOM than on canvas. Letters stay
  razor-sharp (readability = pedagogy).
- **Thin `<canvas>` overlay** for particle bursts / confetti only, where DOM struggles.
- **Howler.js** for SFX (audio sprite) and music.
- **No other runtime deps.** Keep the bundle small.

Output: static `dist/` served at the repo root the same way the current build is. Keep the
deploy pipeline unchanged; do not break the live URL.

---

## 4. Architecture

Module-per-responsibility. The adaptive engine and input matcher must be pure/testable in
isolation (no DOM), so game logic can be reasoned about without the renderer.

```
src/
  main.ts                 // bootstrap, scene manager wiring, asset preload
  engine/
    loop.ts               // rAF game loop, fixed-timestep update + variable render
    spawner.ts            // tile spawn scheduling (interval driven by adaptive intensity)
    difficulty.ts         // ADAPTIVE CONTROLLER — pure. metrics in, intensity out (§5.1)
  input/
    keyRouter.ts          // captures keydown, normalizes, forwards to matcher
    matcher.ts            // AUTO-TARGET + per-letter match state — pure (§5.2)
  game/
    session.ts            // level orchestration: start, tile lifecycle, win/lose
    hearts.ts             // hearts + regen + authoritative game-over (§5.3)
    scoring.ts            // score, streaks, WPM, accuracy
  render/
    tiles.ts              // DOM tile create/update/clear, per-letter fill, spring anim
    hud.ts                // hearts, WPM/accuracy readout, streak meter, mascot stage
    keyboardGuide.ts      // finger-coded on-screen keyboard + next-key glow (§5.4)
  fx/
    particles.ts          // canvas confetti / sparkle bursts
    shake.ts              // gentle screen shake on big combos
  audio/
    sound.ts              // Howler wrapper, SFX map, ducking, music per phase group
  ui/
    scenes.ts             // scene manager: title → select → intro → play → complete/gameover
    screens/              // one module per screen
  data/
    levels.ts             // 24 level configs + phase bounds (§6)
    words.ts              // per-phase word pools (§6.3)
    mascots.ts            // ordered mascot list + image filenames (§8)
    fingerMap.ts          // key → finger + home-row layout (§5.4)
  storage/
    progress.ts           // unlocks, stars, best WPM/accuracy history, settled intensity
  theme/
    tokens.css            // design tokens (§7)
    type.css              // font faces + scale
  styles/
    *.css                 // scene styles
```

**Coding standards:** strict TypeScript (`strict: true`, no `any` without justification).
**Comment the code to explain how it works** — every non-trivial function gets a short
doc comment on intent, and inline comments on the non-obvious parts (the adaptive math, the
matcher's auto-target resolution, the spring timing). Prefer clarity over cleverness; this
is a codebase that gets handed back and forth.

---

## 5. Core mechanics (specification)

### 5.1 Adaptive difficulty controller (`engine/difficulty.ts`)

The single fix for "easy-then-impossible." Difficulty is a scalar **intensity `I ∈ [0,1]`**
that moves *within* the current level's phase bounds — the level still gates *what* she
types; `I` tunes *how much pressure* to her actual ability.

**Inputs (rolling, last N=8 resolved tiles):**
- `wpm` — rolling words-per-minute (standard: chars / 5 / minutes).
- `accuracy` — correct keystrokes / total keystrokes.
- `margin` — average spare fraction of screen height remaining when a tile is cleared
  (1.0 = cleared instantly at top, 0.0 = cleared at the bottom edge). This is the key
  signal: high margin = she has room to spare, low/negative = she's drowning.

**Update rule (call after each tile resolves; use hysteresis to avoid oscillation):**
```
if margin > 0.55 AND accuracy > 0.90:   I += 0.06     // comfortable → nudge up
else if margin < 0.20 OR accuracy < 0.75: I -= 0.10   // struggling → ease off faster than we climb
else:                                     I += 0.01     // gentle drift up
clamp I to [0,1]
```
Bias toward easing off faster than ramping up — a beginner should never hit a wall.

**Derived parameters (lerp within phase bounds from §6):**
```
fallSpeed     = lerp(phase.speedMin, phase.speedMax, I)          // px/sec
spawnInterval = lerp(phase.spawnMax, phase.spawnMin, I)          // sec (higher I = shorter)
maxConcurrent = round(lerp(phase.concMin, phase.concMax, I))     // hard cap 5, ever
```
Persist the settled `I` per phase to `storage` so the next session resumes near where she
left off instead of restarting easy every time.

### 5.2 Input: auto-target + per-letter matching (`input/matcher.ts`)

No submit key. She just types.

- **Auto-target:** when no tile is "active," the first keystroke selects the active tile as
  the on-screen tile whose target word starts with that character (nearest-to-bottom wins
  ties — most urgent first). Once active, keystrokes apply only to that tile until it clears
  or the wrong key is pressed.
- **Per-letter progress:** each correct next-character advances a cursor; the matched prefix
  is rendered filled (see §7 signature) so she sees progress mid-word.
- **Forgiving errors:** a wrong key does **not** fail the tile and does **not** cost a heart.
  It plays a soft "nope" tick, triggers a tiny shake on the tile, increments the error
  counter (for accuracy only), and leaves the cursor where it is. She simply tries the key
  again.
- **Clear on completion:** when the last character matches, the tile clears immediately —
  celebration, points, streak++.
- **Single-letter levels (phase A):** one correct keystroke clears the tile.
- **Backspace** is a no-op (there's nothing to submit; the cursor only advances on correct
  keys). Keeps the mental model simple.

### 5.3 Hearts & authoritative fail (`game/hearts.ts`)

- Start each level with **3 hearts** (rendered as gold-outlined hearts).
- A tile reaching the bottom = **escape** → `hearts -= 1`, sad tile animation, soft SFX.
- **Regen:** during clean play (no escape), hearts refill slowly — accrue a hidden
  `regenProgress` of e.g. +1 per ~6 consecutive cleared tiles, capped at 3. A visible sliver
  fills the next heart outline so she can see it coming back. Regen never exceeds 3.
- **Authoritative game-over (fixes the current bug):** the moment `hearts <= 0`, the session
  must **stop the spawner, freeze the loop's spawn/fall updates, and transition to the
  game-over scene in the same tick.** No path may keep spawning after 0 hearts. Add a guard
  in the loop: if `session.state === 'over'`, skip spawn + fall integration entirely. Regen
  cannot revive from 0 (game-over is terminal for that attempt).
- **Win:** clearing the level's tile target (20) → level-complete scene.

### 5.4 Keyboard guide & finger discipline (`render/keyboardGuide.ts`, `data/fingerMap.ts`)

- Full on-screen QWERTY, keys grouped/colored by the standard 8-finger + thumb scheme
  (left pinky … left index / right index … right pinky; space = thumbs). Home-row keys
  (A S D F J K L ;) marked with the usual bump/indicator.
- **Next-key highlight:** the key for the next character glows in its finger's color, with a
  subtle label of which finger to use.
- **Auto-fade:** guide opacity decreases as rolling accuracy for recently-used keys rises
  (she's internalized them); a toggle (keyboard icon) pins it on/off. Default on for phase A,
  fading thereafter.
- Correct keypress animates the matching on-screen key (press-down + finger-color flash);
  wrong key flashes the *correct* key softly.

---

## 6. Levels & content

24 levels, one mascot each, grouped into 6 content **phases**. Speed/spawn/tile-count are
**not** hard-coded per level anymore — they're the adaptive bounds below. Only *content*
changes per level, so difficulty is decoupled.

### 6.1 Phases (adaptive bounds)

| Phase | Levels | Content | speedMin→Max (px/s) | spawnMin→Max (s) | concMin→Max |
|-------|--------|---------|---------------------|------------------|-------------|
| A | 1–4   | single letters                    |  40 → 90  | 2.6 → 1.6 | 1 → 2 |
| B | 5–8   | 3-letter words                    |  55 → 110 | 2.8 → 1.7 | 2 → 3 |
| C | 9–12  | 4–5 letter words                  |  65 → 125 | 2.9 → 1.8 | 2 → 3 |
| D | 13–16 | 5–6 letter words                  |  75 → 140 | 3.0 → 1.9 | 3 → 4 |
| E | 17–20 | 6–8 letter words (+ capitals)     |  85 → 155 | 3.2 → 2.0 | 3 → 4 |
| F | 21–24 | 8+ letter words + short phrases   |  95 → 170 | 3.4 → 2.1 | 3 → 5 |

`concMax` is capped at **5** everywhere — a beginner cannot track more. These are starting
bounds; tune during playtest, but keep the *shape* (gentle, overlapping between phases).

### 6.2 Level → mascot map

| L | Mascot | Content focus | | L | Mascot | Content focus |
|---|--------|---------------|---|---|--------|---------------|
| 1 | Fly | home row A S D F J K L ; | | 13 | Capybara | 5-letter |
| 2 | Fish | top row Q W E R T Y | | 14 | Snake | 5-letter mixed |
| 3 | Butterfly | bottom row + common | | 15 | Crocodile | 5–6 letter |
| 4 | Seahorse | all letters + punctuation | | 16 | Deer | common 6-letter |
| 5 | Hamster | common 3-letter | | 17 | Tiger | 6-letter + capitals |
| 6 | Squirrel | 3-letter, home-row bias | | 18 | Lion | 6–7 letter |
| 7 | Owl | mixed 3-letter | | 19 | Monster | mixed + simple phrases |
| 8 | Cat | 3-letter + repeats | | 20 | Dinosaur | 7–8 letter |
| 9 | Otter | 4-letter | | 21 | Elephant | 7–9 letter |
| 10 | Turtle | 4-letter common | | 22 | Human | 8+ letter |
| 11 | Monkey | 4–5 letter | | 23 | Dragon | 8–10 letter, themed |
| 12 | Dog | 4–5 letter | | 24 | Robot | mastery: long words + short sentences |

Target tiles per level: **20**.

### 6.3 Word pools (`data/words.ts`)

Generate curated, **age-appropriate (10yo), common, positive** word pools per phase under
these constraints:
- Match the phase's letter-length band.
- Phase A: letters keyed to the level's row focus.
- Prefer words with unambiguous spelling; avoid anything a 10-year-old wouldn't know.
- Phase E/F "capitals" and "phrases": capitals mean a leading capital letter (teaches Shift);
  phrases are 2–3 short words with a space (space bar practice). Keep phrases wholesome and
  short (e.g. "good job", "well done", "you did it").
- No profanity, no scary/violent words even for Monster/Dragon/Dinosaur — theme by mascot,
  not by menace (dragon → "sparkle", "treasure", "magical").
- ~40–60 words per phase minimum so repetition within a level is low.

---

## 7. Visual identity — "Soft-Luxe Kawaii"

Deliberately *not* the stark-white original, and *not* any AI-default look. The brief is
"modern and luxurious" for a cute kid's game — resolve the tension as **premium
confectionery / high-end toy**: soft depth, tactile candy-glass surfaces, real light, one
confident jewel accent, and gold as the luxury signal. Readability is sacred — letters stay
high-contrast and crisp; the luxe lives in the *surround* and the *materials*, never at the
cost of legibility.

### 7.1 Color tokens (`theme/tokens.css`)
```
/* Background — soft dusk, per-mascot hue-shifted (never stark white, never harsh black) */
--bg-1:      #FBF4FA;   /* blush white   */
--bg-2:      #E9E2FB;   /* powder lilac  */
--bg-3:      #D9E6FB;   /* soft periwinkle (edges) */

/* Tile — candy glass */
--tile-surface: #FFFFFF;         /* 85% opacity + inner glow + top specular highlight */
--tile-ink:     #2A1A2E;         /* deep plum-black, high-contrast letters */
--tile-fill:    var(--accent);   /* typed-prefix fill color */

/* Accent — jewel raspberry-orchid (confident, not terracotta, not acid) */
--accent:      #D01E7A;
--accent-soft: #F7C6E1;

/* Luxury signal — gold, used sparingly (stars, streak flames, sparkles, heart outline) */
--gold:        #E9B44C;
--gold-hi:     #F7D77C;

/* State */
--success:     #34D399;   /* mint — clear/celebrate */
--soft-warn:   #FF8A93;   /* soft coral — miss/heart-loss (never harsh red) */
--ink-muted:   #6B5B72;   /* secondary text */
```
Each mascot supplies a hue offset applied to the bg gradient so every level feels distinct
while the system stays coherent.

### 7.2 Typography (`theme/type.css`)
Three faces, three roles (self-host or Google Fonts; subset to used glyphs):
- **Display / tiles — Fredoka** (500–600): rounded, kawaii, but clean and unambiguous. Used
  for mascot names, big feedback ("You did it!"), and the falling letters/words.
- **UI / body — Plus Jakarta Sans** (400–600): modern, premium, quiet. Menus, labels, copy.
- **Data / instrument — a monospace (Space Mono or JetBrains Mono)** for the WPM / accuracy /
  score readouts only. The precise, tabular readout is the *one aesthetic risk* — a little
  instrument panel contrasting the candy world, and it signals "this is measuring your real
  progress."

Set a clear scale; big tile text (readability). Ensure I / l / 1 and 0 / O are distinguishable
in the chosen faces (verify Fredoka + the mono both pass).

### 7.3 Signature element
**The jelly candy-capsule tile.** Soft 3D candy-glass bubble with inner glow + top specular
highlight, holding its mascot + word. It has **spring physics** — squashes on spawn,
gently stretches as it falls, and **pops into a gold-and-accent confetti burst** on clear.
As she types, the matched prefix **fills left-to-right** with `--tile-fill` inside the
capsule (like liquid filling glass), so progress is visible mid-word. This capsule — plus
the finger-coded keyboard guide — is what the game is remembered by. Spend the boldness here;
keep menus quiet and disciplined.

### 7.4 Motion
Spring easing on tiles; ambient float on the mascot stage; small, tasteful screen-shake only
on big combos; canvas confetti on clears and level-complete. **Respect
`prefers-reduced-motion`** — swap springs for quick fades, disable shake and ambient drift.
More is not better; restraint reads as premium.

### 7.5 Screens
Title (mascot grid) → Level select (locked/unlocked, star ratings in gold) → Level intro
(mascot enters, "Let's practice with [Mascot]!") → Play → Level complete (score, accuracy %,
1–3 gold stars by hearts remaining, confetti) / Game over (gentle, "Try again?"). Quality
floor without announcing it: responsive to a laptop screen, visible keyboard focus on all
menu controls, reduced-motion honored.

---

## 8. Assets — mascot images (`data/mascots.ts`)

New images live in the repo at **`/Images`**. Before wiring:
1. **List the actual files in `/Images`** and map each of the 24 mascots (§6.2) to its file.
   Filenames may not match the mascot names exactly — inspect, don't assume.
2. Export an ordered `MASCOTS: { level:number; name:string; image:string; hue:number }[]`
   with real paths.
3. **Fallback:** if a mascot's image is missing/unmatched, render a colored candy capsule
   with the mascot name and log a warning — a missing asset must never crash a level.
4. Preload all 24 during the title screen so play never stalls on a fetch.
5. Optimize (the capsule displays small) — reasonable dimensions, lazy where possible.

---

## 9. Audio (`audio/sound.ts`)

Fun, satisfying, *short*, soft-attack. Via Howler (audio sprite preferred):
- **Per-letter** correct tick — pitch rises as the word's prefix fills (rewarding progress).
- **Wrong key** — soft, non-punishing "nope."
- **Tile clear** — sparkle chime; **combo escalation** — ascending chimes at streak
  milestones (5/10/15…).
- **Heart loss** — gentle "aww." **Heart regained** — soft twinkle.
- **Level complete** — short fanfare. **Game over** — soft, kind, non-defeating.
- **Music** — gentle loop per phase group, each group slightly more energetic. Global
  mute + volume in settings; **duck music under SFX**. Never annoying on repeat.

Source royalty-free/CC0 SFX or synthesize; keep total audio payload small.

---

## 10. Persistence (`storage/progress.ts`)
`localStorage`, versioned key. Store: unlocked levels, per-level best (stars, accuracy, WPM),
settled adaptive intensity per phase, cumulative WPM/accuracy history (for a simple
"you're improving" readout), audio prefs, keyboard-guide toggle, reduced-motion override.
Migrate/guard against malformed old data.

---

## 11. Acceptance criteria (definition of done)
- [ ] Typing a word fills its prefix live; tile clears on last correct char; **no Enter/Space** needed.
- [ ] Auto-target selects the right tile from the first keystroke; ties resolve nearest-to-bottom.
- [ ] Wrong keys never cost a heart and never fail a tile; accuracy still records them.
- [ ] Difficulty visibly self-tunes: struggling eases the game within a few tiles; cruising ramps it. No exponential wall.
- [ ] `concurrent tiles` never exceeds 5.
- [ ] Hearts regen slowly on clean play, cap 3; **at 0 hearts the level ends immediately** and no tile spawns after.
- [ ] Keyboard guide shows next key in finger color; fades with mastery; toggle works.
- [ ] All 24 mascots load from `/Images`; missing asset degrades gracefully.
- [ ] Soft-luxe identity present: candy-capsule tiles, dusk gradient, gold accents, three-face type, confetti.
- [ ] SFX + music per spec; mute works; music ducks under SFX.
- [ ] `prefers-reduced-motion` respected; menu controls keyboard-focusable.
- [ ] Builds to static `dist/`, deploys to the existing domain unchanged; live URL not broken.
- [ ] Code is commented explaining how it works, especially the adaptive controller and matcher.

---

## 12. Build order (suggested)
1. Scaffold Vite+TS, module skeleton, theme tokens + type, empty scenes.
2. Core loop + spawner + DOM tile lifecycle (static difficulty first).
3. Input: keyRouter + matcher (auto-target, per-letter, forgiving) + live fill.
4. Hearts + authoritative game-over + regen. **Verify the fail condition explicitly.**
5. Adaptive controller; replace static difficulty; playtest the curve.
6. Keyboard guide + finger map + auto-fade.
7. FX (particles, shake) + audio.
8. Mascot wiring from `/Images` + all screens + persistence + star ratings.
9. Reduced-motion pass, focus states, polish, deploy.

Commit per numbered step with a clear message; keep `main` deployable throughout.
