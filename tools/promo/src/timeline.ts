import { FEATURES, type Feature, FPS, INTRO_SEC, INTRO_VO_DELAY_SEC, OUTRO_SEC, VO } from "./theme";

// The reel is VOICEOVER-DRIVEN: each scene stretches to fit its dialog line plus a healthy gap, so a line is
// never cut off by the next scene. Scenes with no VO yet fall back to their authored duration, and a scene is
// never shorter than that authored floor. Durations are measured from the real clips in `calculateMetadata`
// (see Root.tsx) and fed here; this module is pure so it also runs with an empty map (= today's static reel).

export const AUDIO_GAP_SEC = 0.75; // breathing room after a line before the next scene begins
export const FEATURE_LEAD_SEC = 0.35; // small beat after a scene starts before its line comes in
export const INTRO_MIN_SEC = 3.4; // the intro splash+tagline animation needs at least this, VO or not
export const OUTRO_MIN_SEC = OUTRO_SEC;
export const OUTRO_TAIL_SEC = 2.4; // extra hold AFTER the closing line so the outro doesn't end abruptly
                                   // (the wordmark/tiles linger and the music fade has room)

export type SceneTiming = { id: string; startSec: number; durSec: number };
export type FeatureTiming = Feature & { startSec: number; durSec: number }; // startSec is LOCAL to the features block
export type ResolvedVo = { id: string; file: string; atSec: number; winSec: number }; // atSec ABSOLUTE
export type Timeline = {
  fps: number;
  totalSec: number;
  intro: SceneTiming; // absolute (startSec 0)
  featuresStartSec: number; // absolute start of the features block
  features: FeatureTiming[]; // startSec LOCAL to the block
  outro: SceneTiming; // absolute
  vo: ResolvedVo[]; // present-only, absolute atSec
};

const fileFor = (id: string) => VO.find((v) => v.id === id)?.file ?? "";

/** Build the timeline from a map of VO id -> measured duration (seconds). Missing/absent ids = no dialog. */
export function buildTimeline(durations: Record<string, number>): Timeline {
  const dur = (id: string) => durations[id] ?? 0;
  const has = (id: string) => dur(id) > 0;

  // Intro: hold long enough for the delayed line to finish, but never shorter than the animation floor.
  const introDur = has("intro")
    ? Math.max(INTRO_MIN_SEC, INTRO_VO_DELAY_SEC + dur("intro") + AUDIO_GAP_SEC)
    : INTRO_SEC;

  // Features: each scene = max(authored floor, lead + dialog + gap). Local starts accumulate.
  let cursor = 0;
  const features: FeatureTiming[] = FEATURES.map((f) => {
    const d = has(f.id) ? Math.max(f.dur, FEATURE_LEAD_SEC + dur(f.id) + AUDIO_GAP_SEC) : f.dur;
    const t: FeatureTiming = { ...f, startSec: cursor, durSec: d };
    cursor += d;
    return t;
  });
  const featuresSec = cursor;

  // Outro: fit its (long) closing line if present, else the authored floor.
  const outroDur = has("outro") ? Math.max(OUTRO_MIN_SEC, dur("outro") + OUTRO_TAIL_SEC) : OUTRO_SEC;

  const featuresStartSec = introDur;
  const outroStartSec = introDur + featuresSec;
  const totalSec = introDur + featuresSec + outroDur;

  // Resolve VO to absolute start times (present-only), matching the scene layout above.
  const vo: ResolvedVo[] = [];
  if (has("intro")) vo.push({ id: "intro", file: fileFor("intro"), atSec: INTRO_VO_DELAY_SEC, winSec: dur("intro") });
  for (const f of features) {
    if (has(f.id)) vo.push({ id: f.id, file: fileFor(f.id), atSec: featuresStartSec + f.startSec + FEATURE_LEAD_SEC, winSec: dur(f.id) });
  }
  if (has("outro")) vo.push({ id: "outro", file: fileFor("outro"), atSec: outroStartSec, winSec: dur("outro") });

  return {
    fps: FPS,
    totalSec,
    intro: { id: "intro", startSec: 0, durSec: introDur },
    featuresStartSec,
    features,
    outro: { id: "outro", startSec: outroStartSec, durSec: outroDur },
    vo,
  };
}
