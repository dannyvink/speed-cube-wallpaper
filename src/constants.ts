/** Size of each cubie's box geometry */
export const CUBIE_SIZE = 10.0;

/** Number of cubies per Rubik's cube (3³ - 1 center) */
export const CUBIES_PER_CUBE = 26;

/** Cull margin divisor applied to camera depth for shader-based culling */
export const CULL_MARGIN = 20.0;

/** Base stagger factor for wave/ripple animation modes */
export const WAVE_STAGGER = 8;

/** Stagger factor for bidirectional wave (2x to account for round-trip) */
export const WAVE_BIDIR_STAGGER = WAVE_STAGGER * 2;

/** Default random scramble move count range */
export const RANDOM_SCRAMBLE_MIN = 10;
export const RANDOM_SCRAMBLE_MAX = 20;

/** Default scramble count for non-random modes */
export const DEFAULT_SCRAMBLE_COUNT = 10;

/** Random mode wait time range (seconds) */
export const RANDOM_WAIT_MIN = 2;
export const RANDOM_WAIT_MAX = 7;

/** Initial wait time jitter (seconds) */
export const INITIAL_WAIT_JITTER = 5;
