import { cubicBezier } from "react-native-reanimated";
import type { CSSAnimationKeyframes } from "react-native-reanimated";
import { motion } from "./tokens";

/** Courbes et keyframes du prototype (`design/Joutio Prototype.dc.html`). */
export const EASE = cubicBezier(...motion.base.easing);
export const EASE_POP = cubicBezier(0.2, 0.9, 0.3, 1.2);

export const riseIn: CSSAnimationKeyframes = {
  from: { transform: [{ translateY: 8 }], opacity: 0 },
  to: { transform: [{ translateY: 0 }], opacity: 1 },
};

export const questionIn: CSSAnimationKeyframes = {
  from: { transform: [{ translateY: 16 }, { scale: 0.98 }], opacity: 0 },
  to: { transform: [{ translateY: 0 }, { scale: 1 }], opacity: 1 },
};

export const answerIn: CSSAnimationKeyframes = {
  from: { transform: [{ translateY: 32 }], opacity: 0 },
  to: { transform: [{ translateY: 0 }], opacity: 1 },
};

export const popIn: CSSAnimationKeyframes = {
  "0%": { transform: [{ scale: 0.7 }], opacity: 0 },
  "60%": { transform: [{ scale: 1.06 }], opacity: 1 },
  "100%": { transform: [{ scale: 1 }], opacity: 1 },
};

export const gainFloat: CSSAnimationKeyframes = {
  "0%": { transform: [{ translateY: 8 }, { scale: 0.8 }], opacity: 0 },
  "15%": { transform: [{ translateY: 0 }, { scale: 1.1 }], opacity: 1 },
  "30%": { transform: [{ translateY: 0 }, { scale: 1 }], opacity: 1 },
  "70%": { transform: [{ translateY: 0 }, { scale: 1 }], opacity: 1 },
  "100%": { transform: [{ translateY: -24 }, { scale: 1 }], opacity: 0 },
};

export const lowPulse: CSSAnimationKeyframes = {
  "0%": { transform: [{ scale: 1 }] },
  "50%": { transform: [{ scale: 1.18 }] },
  "100%": { transform: [{ scale: 1 }] },
};

export const breathe: CSSAnimationKeyframes = {
  "0%": { transform: [{ scale: 1 }], opacity: 1 },
  "50%": { transform: [{ scale: 0.92 }], opacity: 0.6 },
  "100%": { transform: [{ scale: 1 }], opacity: 1 },
};

export const spin: CSSAnimationKeyframes = {
  from: { transform: [{ rotate: "0deg" }] },
  to: { transform: [{ rotate: "360deg" }] },
};
