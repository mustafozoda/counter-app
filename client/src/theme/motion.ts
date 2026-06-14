import { Easing } from 'react-native-reanimated';

/**
 * Counter DS motion language: physical, spring-based, responsive (§5.7).
 * Use `springs.standard` unless there is a reason not to.
 */
export const springs = {
  /** Default for most UI movement. */
  standard: { damping: 18, stiffness: 180 },
  /** Press feedback, toggles — quick and tight. */
  snappy: { damping: 20, stiffness: 320 },
  /** Large surfaces (sheets, cards entering). */
  gentle: { damping: 22, stiffness: 140 },
} as const;

export const timing = {
  /** Count-up numbers: fast start, long elegant settle. */
  countUp: { duration: 1000, easing: Easing.out(Easing.exp) },
  fade: { duration: 220, easing: Easing.out(Easing.quad) },
} as const;

/** Stagger interval for list entrances (§5.7). */
export const STAGGER_MS = 40;
