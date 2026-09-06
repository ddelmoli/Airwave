import { Audio, Easing, interpolate, Sequence, staticFile } from "remotion";
import {
  FPS,
  MUSIC_BED,
  MUSIC_DUCK,
  MUSIC_DUCK_ENABLED,
  MUSIC_DUCK_RAMP_SEC,
  MUSIC_FADE_IN_SEC,
  MUSIC_FADE_OUT_SEC,
  MUSIC_VOL,
  VO_FADE_SEC,
  VO_VOL,
} from "../theme";
import type { ResolvedVo, Timeline } from "../timeline";

/**
 * The reel's audio layer — no visual output. Everything is frame-driven the Remotion way (per-frame `volume`
 * callbacks + `interpolate`), so it's deterministic and seek-safe (no wall-clock, no manual RAF).
 *
 * - Voiceover: `timeline.vo` (present-only, absolute start times derived from the measured clip lengths) —
 *   each mounted in a `<Sequence>` with a tiny click-safe fade-in; plays its natural length.
 * - Music bed: one looped `<Audio>` under the whole reel, faded in/out at the ends and ducked whenever a VO
 *   line is speaking, so narration always sits on top.
 */

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** 0 (no narration) → 1 (a line is fully active) at time `sec`, with smooth edge ramps. */
function duckAmountAt(sec: number, vo: ResolvedVo[]): number {
  let amt = 0;
  const r = MUSIC_DUCK_RAMP_SEC;
  for (const v of vo) {
    const a = v.atSec;
    const b = v.atSec + v.winSec;
    const rampUp = interpolate(sec, [a - r, a], [0, 1], clamp);
    const rampDown = interpolate(sec, [b, b + r], [1, 0], clamp);
    amt = Math.max(amt, Math.min(rampUp, rampDown));
  }
  return amt;
}

export const Soundtrack: React.FC<{ timeline: Timeline }> = ({ timeline }) => {
  const voFade = Math.max(1, Math.round(VO_FADE_SEC * FPS));
  const total = timeline.totalSec;

  const musicVolume = (frame: number): number => {
    const sec = frame / FPS;
    const fadeIn = interpolate(sec, [0, MUSIC_FADE_IN_SEC], [0, 1], clamp);
    // Eased both ends so the tail rounds off gently into silence instead of a straight-line cut.
    const fadeOut = interpolate(sec, [total - MUSIC_FADE_OUT_SEC, total], [1, 0], { ...clamp, easing: Easing.inOut(Easing.quad) });
    const envelope = Math.min(fadeIn, fadeOut);
    const level = MUSIC_DUCK_ENABLED ? MUSIC_VOL + (MUSIC_DUCK - MUSIC_VOL) * duckAmountAt(sec, timeline.vo) : MUSIC_VOL;
    return level * envelope;
  };

  return (
    <>
      {timeline.vo.map((v) => (
        <Sequence key={v.id} from={Math.round(v.atSec * FPS)} layout="none" name={`vo:${v.id}`}>
          {/* frame here is local to the clip → fade in over the first few frames (click-safe). */}
          <Audio src={staticFile(v.file)} volume={(f) => interpolate(f, [0, voFade], [0, VO_VOL], clamp)} />
        </Sequence>
      ))}
      {MUSIC_BED ? <Audio src={staticFile(MUSIC_BED)} volume={musicVolume} loop name="music-bed" /> : null}
    </>
  );
};
