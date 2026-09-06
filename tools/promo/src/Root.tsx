import "./styles.css";
import { Composition, staticFile } from "remotion";
import { getAudioDurationInSeconds } from "@remotion/media-utils";
import { Reel } from "./Reel";
import { FPS, VO } from "./theme";
import { buildTimeline } from "./timeline";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="AirwaveHero"
      component={Reel}
      fps={FPS}
      width={1920}
      height={1080}
      durationInFrames={Math.round(buildTimeline({}).totalSec * FPS)} // fallback; calculateMetadata overrides
      defaultProps={{ timeline: buildTimeline({}) }}
      calculateMetadata={async () => {
        // Measure every present VO clip, then derive the whole timeline from those real lengths so no line is
        // ever cut off by the next scene. Absent/undecodable clips are skipped (scene uses its authored floor).
        const durations: Record<string, number> = {};
        for (const v of VO) {
          if (!v.have) continue;
          try {
            durations[v.id] = await getAudioDurationInSeconds(staticFile(v.file));
          } catch {
            /* not yet on disk / undecodable — treat as no dialog for this scene */
          }
        }
        const timeline = buildTimeline(durations);
        return { durationInFrames: Math.round(timeline.totalSec * FPS), props: { timeline } };
      }}
    />
  );
};
