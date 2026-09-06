import { AbsoluteFill, Sequence } from "remotion";
import "./fonts";
import { C, FPS as FPS_CONST } from "./theme";
import { Intro } from "./components/Intro";
import { Features } from "./components/Features";
import { Outro } from "./components/Outro";
import { Soundtrack } from "./components/Soundtrack";
import type { Timeline } from "./timeline";

export const FPS = FPS_CONST;

// Durations come from the VO-driven timeline (Root's calculateMetadata), so the whole reel stretches to fit
// the dialog. Intro/Features/Outro just render inside their computed windows.
export const Reel: React.FC<{ timeline: Timeline }> = ({ timeline }) => {
  const introF = Math.round(timeline.intro.durSec * FPS);
  const featStartF = Math.round(timeline.featuresStartSec * FPS);
  const outroStartF = Math.round(timeline.outro.startSec * FPS);
  const featF = outroStartF - featStartF;
  const outroF = Math.round(timeline.outro.durSec * FPS);

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <Sequence durationInFrames={introF} layout="none">
        <Intro />
      </Sequence>
      <Sequence from={featStartF} durationInFrames={featF} layout="none">
        <Features features={timeline.features} />
      </Sequence>
      <Sequence from={outroStartF} durationInFrames={outroF} layout="none">
        <Outro />
      </Sequence>
      <Soundtrack timeline={timeline} />
    </AbsoluteFill>
  );
};
