import * as THREE from 'three';

export const AnimationMode = {
  Random: 0,
  Synchronized: 1,
  WaveRight: 2,
  NPermutations: 3,
  WaveLeft: 4,
  Ripple: 5,
  Wave: 6,
} as const;

export type AnimationMode = (typeof AnimationMode)[keyof typeof AnimationMode];

/** Maps Wallpaper Engine string values to AnimationMode */
export const ANIMATION_MODE_MAP: Record<string, AnimationMode> = {
  random: AnimationMode.Random,
  synchronized: AnimationMode.Synchronized,
  wave_right: AnimationMode.WaveRight,
  n_permutations: AnimationMode.NPermutations,
  wave_left: AnimationMode.WaveLeft,
  ripple: AnimationMode.Ripple,
  wave: AnimationMode.Wave,
};

export const Face = {
  R: 'R',
  L: 'L',
  U: 'U',
  D: 'D',
  F: 'F',
  B: 'B',
} as const;

export type Face = (typeof Face)[keyof typeof Face];

export const ALL_FACES: readonly Face[] = [Face.R, Face.L, Face.U, Face.D, Face.F, Face.B];

export interface Move {
  face: Face;
  prime: boolean;
}

export function moveToString(move: Move): string {
  return move.face + (move.prime ? "'" : '');
}

export function invertMove(move: Move): Move {
  return { face: move.face, prime: !move.prime };
}

export interface CubieState {
  currentQuat: THREE.Quaternion;
  targetQuat: THREE.Quaternion;
  initialPos: THREE.Vector3;
  typeMask: number;
}

/** Configuration passed to each Cube instance */
export interface CubeConfig {
  moveSpeed: number;
  animationMode: AnimationMode;
  numPermutations: number;
  naturalRotations: boolean;
  timeBetweenRotations: number;
  timeBetweenAnimations: number;
}

export const DEFAULT_CUBE_CONFIG: CubeConfig = {
  moveSpeed: 2.0,
  animationMode: AnimationMode.Random,
  numPermutations: 5,
  naturalRotations: true,
  timeBetweenRotations: 0,
  timeBetweenAnimations: 3,
};
