import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT_DISPLAY, INTRO_VO_DELAY_SEC } from "../theme";
import { BlobBg } from "./BlobBg";

const EASE = Easing.out(Easing.cubic);
const EASE_BACK = Easing.out(Easing.back(1.5));

const WORD = "Airwave";

// Splash lockup ported from apps/web Logo: mark scales+fades in, "Airwave" cascades letter by letter,
// then the tagline lines stagger in after the cascade.
export const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const s = (sec: number) => sec * fps;

  // Whole-scene fade out at the end.
  const sceneOut = interpolate(frame, [durationInFrames - s(0.47), durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // The lockup holds off until the voiceover starts ("Introducing Airwave"), then animates in — so it arrives
  // WITH the line, not before it. Everything below is offset by D; the internal cadence is unchanged.
  const D = INTRO_VO_DELAY_SEC;
  const markOp = interpolate(frame, [s(D), s(D + 0.5)], [0, 1], { easing: EASE, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const markScale = interpolate(frame, [s(D), s(D + 0.6)], [0.82, 1], { easing: EASE_BACK, extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        opacity: sceneOut,
        background: `radial-gradient(120% 120% at 50% 40%, ${C.gradCenter} 0%, ${C.gradEdge} 72%)`,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Blob backdrop — buttery slide-down + fade-in (GuideEngine blog-hero), same as the feature/outro scenes. */}
      <BlobBg />

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 34, textAlign: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          <Img src={staticFile("brand/logo.png")} style={{ width: 200, height: "auto", opacity: markOp, transform: `scale(${markScale})` }} />
          <div style={{ display: "flex", fontFamily: '"Inter", ' + FONT_DISPLAY, fontWeight: 700, fontSize: 132, letterSpacing: "-0.01em", lineHeight: 1, color: "#fff" }}>
            {WORD.split("").map((ch, i) => {
              const d = s(D + 0.35 + i * 0.055);
              const op = interpolate(frame, [d, d + s(0.4)], [0, 1], { easing: EASE, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
              const y = interpolate(frame, [d, d + s(0.4)], [46, 0], { easing: EASE, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
              return (
                <span key={i} style={{ display: "inline-block", whiteSpace: "pre", opacity: op, transform: `translateY(${y}px)` }}>
                  {ch}
                </span>
              );
            })}
          </div>
        </div>

        <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 58, letterSpacing: "-0.02em", color: C.fg, lineHeight: 1.12 }}>
          {[
            <>Turn your Plex library into your</>,
            <>
              own <span style={{ color: C.accent }}>always-on live TV</span>.
            </>,
          ].map((line, li) => {
            const d = s(D + 1.2 + li * 0.14);
            const op = interpolate(frame, [d, d + s(0.7)], [0, 1], { easing: EASE, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            const y = interpolate(frame, [d, d + s(0.7)], [22, 0], { easing: EASE, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            return (
              <div key={li} style={{ opacity: op, transform: `translateY(${y}px)` }}>
                {line}
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
