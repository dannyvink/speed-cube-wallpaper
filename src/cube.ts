import * as THREE from 'three';
import {
  AnimationMode, Face, ALL_FACES, invertMove,
} from './types';
import type { Move, CubieState, CubeConfig } from './types';
import {
  RANDOM_SCRAMBLE_MIN, RANDOM_SCRAMBLE_MAX, DEFAULT_SCRAMBLE_COUNT,
  RANDOM_WAIT_MIN, RANDOM_WAIT_MAX, INITIAL_WAIT_JITTER,
  WAVE_BIDIR_STAGGER,
} from './constants';
import { random } from './random';

/** Axis and filter for each face move */
const FACE_DEFS: Record<Face, { axis: THREE.Vector3; dir: 'x' | 'y' | 'z'; val: number; flipAngle: boolean }> = {
  [Face.R]: { axis: new THREE.Vector3(1, 0, 0), dir: 'x', val:  1, flipAngle: false },
  [Face.L]: { axis: new THREE.Vector3(1, 0, 0), dir: 'x', val: -1, flipAngle: true },
  [Face.U]: { axis: new THREE.Vector3(0, 1, 0), dir: 'y', val:  1, flipAngle: false },
  [Face.D]: { axis: new THREE.Vector3(0, 1, 0), dir: 'y', val: -1, flipAngle: true },
  [Face.F]: { axis: new THREE.Vector3(0, 0, 1), dir: 'z', val:  1, flipAngle: false },
  [Face.B]: { axis: new THREE.Vector3(0, 0, 1), dir: 'z', val: -1, flipAngle: true },
};

export class Cube {
  cubies: CubieState[] = [];
  moveQueue: Move[] = [];
  animating = false;
  progress = 0;
  waitTimer = random() * INITIAL_WAIT_JITTER;
  worldPos: THREE.Vector3;
  config: CubeConfig;
  waveMoveFactor = 0;
  waveStaggerOffset = 0;
  moveOvershoot = 0;
  movePauseTimer = 0;
  waveBidirFlipped = false;

  constructor(worldPos: THREE.Vector3, config: CubeConfig, randomStartingRotation: boolean = false) {
    this.worldPos = worldPos;
    this.config = { ...config };
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          if (x === 0 && y === 0 && z === 0) continue;
          this.cubies.push({
            currentQuat: new THREE.Quaternion(),
            targetQuat: new THREE.Quaternion(),
            initialPos: new THREE.Vector3(x, y, z),
            typeMask: Cube.calculateMask(x, y, z),
          });
        }
      }
    }
    if (randomStartingRotation) this.applyRandomOrientation();
  }

  private applyRandomOrientation() {
    const axes = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)];
    const q = new THREE.Quaternion();
    for (const axis of axes) {
      const turns = Math.floor(random() * 4);
      if (turns > 0) q.multiply(new THREE.Quaternion().setFromAxisAngle(axis, turns * Math.PI / 2));
    }
    for (const cubie of this.cubies) {
      cubie.currentQuat.copy(q);
      cubie.targetQuat.copy(q);
    }
  }

  private static calculateMask(x: number, y: number, z: number): number {
    let mask = 0;
    if (x ===  1) mask |= (1 << 0);
    if (x === -1) mask |= (1 << 1);
    if (y ===  1) mask |= (1 << 2);
    if (y === -1) mask |= (1 << 3);
    if (z ===  1) mask |= (1 << 4);
    if (z === -1) mask |= (1 << 5);
    return mask;
  }

  update(delta: number) {
    if (this.animating) {
      this.progress += delta * this.config.moveSpeed;
      if (this.progress >= 1) {
        this.progress = 0;
        this.animating = false;
        this.movePauseTimer = this.config.timeBetweenRotations;
        for (const cubie of this.cubies) {
          cubie.currentQuat.copy(cubie.targetQuat);
        }
      }
    } else if (this.movePauseTimer > 0) {
      this.movePauseTimer -= delta;
    } else if (this.moveQueue.length > 0) {
      this.executeMove(this.moveQueue.shift()!);
      this.animating = true;
      this.moveOvershoot = this.config.naturalRotations
        ? (random() < 0.25 ? 2.5 + random() * 2.5 : 0.3 + random() * 0.7)
        : 0;
    } else {
      this.waitTimer -= delta;
      if (this.waitTimer <= 0) {
        this.startNextCycle();
      }
    }
  }

  private startNextCycle() {
    const mode = this.config.animationMode;

    if (mode === AnimationMode.Random) {
      const count = RANDOM_SCRAMBLE_MIN + Math.floor(random() * (RANDOM_SCRAMBLE_MAX - RANDOM_SCRAMBLE_MIN));
      this.scramble(count);
      this.waitTimer = RANDOM_WAIT_MIN + random() * (RANDOM_WAIT_MAX - RANDOM_WAIT_MIN);
    } else if (mode === AnimationMode.NPermutations) {
      this.scramble(this.config.numPermutations);
      this.waitTimer = this.config.timeBetweenAnimations;
    } else if (mode === AnimationMode.Wave) {
      // Bidirectional: alternate right->left->right each cycle
      this.waveBidirFlipped = !this.waveBidirFlipped;
      const nextStagger = this.waveBidirFlipped
        ? (1 - this.waveMoveFactor) * WAVE_BIDIR_STAGGER
        : this.waveMoveFactor * WAVE_BIDIR_STAGGER;
      this.scramble(DEFAULT_SCRAMBLE_COUNT);
      this.waitTimer = this.config.timeBetweenAnimations + nextStagger;
    } else {
      // Synchronized, Wave Right/Left, Ripple
      this.scramble(DEFAULT_SCRAMBLE_COUNT);
      this.waitTimer = this.config.timeBetweenAnimations + this.waveStaggerOffset;
    }
  }

  private executeMove(move: Move) {
    const def = FACE_DEFS[move.face];
    let angle = Math.PI / 2;
    if (move.prime) angle *= -1;
    if (def.flipAngle) angle *= -1;

    const rotation = new THREE.Quaternion().setFromAxisAngle(def.axis, angle);

    for (const cubie of this.cubies) {
      const currentPos = cubie.initialPos.clone().applyQuaternion(cubie.targetQuat);
      if (Math.round(currentPos[def.dir]) === def.val) {
        cubie.targetQuat.premultiply(rotation);
      }
    }
  }

  scramble(n: number) {
    const sequence: Move[] = [];
    let lastFace: Face | null = null;

    for (let i = 0; i < n; i++) {
      let face: Face;
      do {
        face = ALL_FACES[Math.floor(random() * ALL_FACES.length)];
      } while (face === lastFace);

      lastFace = face;
      sequence.push({ face, prime: random() > 0.5 });
    }

    this.moveQueue.push(...sequence);
    // Queue inverse to return to solved state
    const inverse = sequence.slice().reverse().map(invertMove);
    this.moveQueue.push(...inverse);
  }
}
