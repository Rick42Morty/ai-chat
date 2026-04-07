import type { Transition } from "framer-motion";

/** Default easing — smooth deceleration */
export const easeOut: Transition = {
  duration: 0.35,
  ease: [0.22, 1, 0.36, 1],
};
