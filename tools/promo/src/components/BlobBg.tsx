import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

// The exact "organic" blob SVG from GuideEngine's SectionBackground, recolored to our navy/sky-blue theme.
//
// Motion (all FRAME-DRIVEN — CSS animations don't advance in a frame-by-frame Remotion render):
//  - Entrance: GuideEngine blog-hero `animateIn` — a buttery slide-down + scale-up + fade-in (0.8s easeOut).
//  - Per-transition shift (features block): pass `steps` = the boundary times. At each boundary the blob eases
//    to the NEXT slot (sliding along an orbit + a touch of rotation + an intensity change) then STAYS PUT until
//    the next boundary — so it "rotates around the perimeter" one step per feature. No steps (intro/outro) =
//    fade in and hold.
const BASE_Y = -480; // resting vertical offset (translate up so the U-glow sits near the top)
const BASE_INTENSITY = 0.34; // resting path opacity

// Per-slot orbit: each transition advances one step around an ellipse (mostly left/right, a little vertical),
// with a small rotation and an intensity nudge. Tune to taste.
const ORBIT_ANGLE = (2 * Math.PI) / 12; // radians advanced per shift (~30°) — a partial loop across 10 features
const ORBIT_RX = 150; // horizontal travel (px)
const ORBIT_RY = 46; // vertical travel (px)
const ROT_STEP = 6; // degrees of rotation per shift
const INTENSITY_STEP = 0.05; // path-opacity swing per shift
const SHIFT_RAMP = 0.55; // seconds each shift takes (eased), centered on the boundary

const slotX = (k: number) => Math.sin(k * ORBIT_ANGLE) * ORBIT_RX;
const slotY = (k: number) => (1 - Math.cos(k * ORBIT_ANGLE)) * -ORBIT_RY; // starts at 0, drifts up around the arc
const slotRot = (k: number) => k * ROT_STEP;
const slotIntensity = (k: number) => BASE_INTENSITY + Math.sin(k * ORBIT_ANGLE) * INTENSITY_STEP;

const EASE_KF = { easing: Easing.inOut(Easing.cubic), extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

/** Build a hold-then-ramp keyframe track over the boundary times: slot k until (b-ramp), slot k+1 by (b+ramp). */
function track(steps: number[], valueForSlot: (k: number) => number): { t: number[]; v: number[] } {
  const half = SHIFT_RAMP / 2;
  const t: number[] = [0];
  const v: number[] = [valueForSlot(0)];
  steps.forEach((b, i) => {
    t.push(b - half); v.push(valueForSlot(i)); // hold current slot up to the boundary
    t.push(b + half); v.push(valueForSlot(i + 1)); // reach the next slot just after it
  });
  t.push(1e7); v.push(valueForSlot(steps.length)); // hold the final slot to the end
  return { t, v };
}

export const BlobBg: React.FC<{ opacity?: number; enterSec?: number; steps?: number[] }> = ({ opacity = 1, enterSec = 0.8, steps = [] }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  // Entrance — opacity 0→1, scale 0.5→1, y (BASE_Y-100)→BASE_Y, 0.8s easeOut. (The bit James loves; unchanged.)
  const eo = { easing: Easing.out(Easing.cubic), extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };
  const enterOp = interpolate(t, [0, enterSec], [0, 1], eo);
  const enterScale = interpolate(t, [0, enterSec], [0.5, 1], eo);
  const enterY = interpolate(t, [0, enterSec], [BASE_Y - 100, BASE_Y], eo);

  // Post-entrance motion depends on mode:
  let driftX: number;
  let driftY: number;
  let rot = 0;
  let intensity = BASE_INTENSITY;
  let breathe = 1;
  if (steps.length > 0) {
    // FEATURES: orbit one step per transition (slide + rotate + intensity), then hold. No continuous idle.
    const xk = track(steps, slotX);
    const yk = track(steps, slotY);
    const rk = track(steps, slotRot);
    const ik = track(steps, slotIntensity);
    driftX = interpolate(t, xk.t, xk.v, EASE_KF);
    driftY = interpolate(t, yk.t, yk.v, EASE_KF);
    rot = interpolate(t, rk.t, rk.v, EASE_KF);
    intensity = interpolate(t, ik.t, ik.v, EASE_KF);
  } else {
    // INTRO / OUTRO: the buttery entrance + a slow, subtle living idle (drift + breathe + intensity). This is
    // "the nice thing" — it stays gentle and never does the bigger orbit shift. Amplitude ramps in after the
    // entrance so there's no jump; phase is measured from the entrance end (starts at sin(0)=0).
    const idleAmt = interpolate(t, [enterSec, enterSec + 1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const it = Math.max(0, t - enterSec);
    const wave = (periodSec: number, phase = 0) => Math.sin(it * ((2 * Math.PI) / periodSec) + phase);
    driftX = wave(17, 1.2) * 12 * idleAmt; // ~17s sway
    driftY = wave(11) * 16 * idleAmt; // ~11s bob
    breathe = 1 + wave(13) * 0.03 * idleAmt; // subtle scale breathing
    intensity = BASE_INTENSITY + wave(9) * 0.06 * idleAmt; // gentle intensity change
  }

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          width: 1544,
          height: "auto",
          bottom: 0,
          left: "50%",
          transform: `translate(calc(-50% + ${driftX}px), ${enterY + driftY}px) rotate(${rot}deg) scale(${enterScale * breathe})`,
          filter: "blur(208px)",
          WebkitFilter: "blur(208px)",
          opacity: opacity * enterOp,
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 1544 1351" style={{ width: "100%", height: "auto", display: "block" }}>
          <path
            fill="url(#airwave-blob)"
            opacity={intensity}
            d="M0 1054.3C0 1636.57 322.24 1181 748.53 1181c426.29 0 795.2 455.57 795.2-126.7C1543.73 472.024 1198.16 0 771.866 0 345.577 0 0 472.024 0 1054.3Z"
          />
          <defs>
            <linearGradient id="airwave-blob" x1="70.358" y1="611.063" x2="1367.96" y2="1223.91" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#4a9fe0" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </AbsoluteFill>
  );
};
