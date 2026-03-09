import * as THREE from 'three';

export interface CubieState {
  currentQuat: THREE.Quaternion;
  targetQuat: THREE.Quaternion;
  initialPos: THREE.Vector3; // Position in solved state
  typeMask: number;
}

export class Cube {
  cubies: CubieState[] = [];
  moveQueue: string[] = [];
  animating = false;
  progress = 0;
  waitTimer = Math.random() * 5;
  worldPos: THREE.Vector3;
  moveSpeed: number;
  animationMode = 0;
  waveMoveFactor = 0;
  waveStaggerOffset = 0;
  numPermutations = 5;
  naturalRotations = false;
  moveOvershoot = 0;
  timeBetweenRotations = 0;
  timeBetweenAnimations = 3;
  movePauseTimer = 0;
  waveBidirFlipped = false;

  constructor(worldPos: THREE.Vector3, moveSpeed: number = 4) {
    this.worldPos = worldPos;
    this.moveSpeed = moveSpeed;
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          if (x === 0 && y === 0 && z === 0) continue;

          const initialPos = new THREE.Vector3(x, y, z);
          this.cubies.push({
            currentQuat: new THREE.Quaternion(),
            targetQuat: new THREE.Quaternion(),
            initialPos: initialPos.clone(),
            typeMask: this.calculateMask(x, y, z)
          });
        }
      }
    }
  }

  private calculateMask(x: number, y: number, z: number): number {
    let mask = 0;
    if (x === 1) mask |= (1 << 0);
    if (x === -1) mask |= (1 << 1);
    if (y === 1) mask |= (1 << 2);
    if (y === -1) mask |= (1 << 3);
    if (z === 1) mask |= (1 << 4);
    if (z === -1) mask |= (1 << 5);
    return mask;
  }

  update(delta: number) {
    if (this.animating) {
      this.progress += delta * this.moveSpeed;
      if (this.progress >= 1) {
        this.progress = 0;
        this.animating = false;
        this.movePauseTimer = this.timeBetweenRotations;
        for (const cubie of this.cubies) {
          cubie.currentQuat.copy(cubie.targetQuat);
        }
      }
    } else if (this.movePauseTimer > 0) {
      this.movePauseTimer -= delta;
    } else if (this.moveQueue.length > 0) {
      const move = this.moveQueue.shift()!;
      this.executeMove(move);
      this.animating = true;
      this.moveOvershoot = this.naturalRotations
        ? (Math.random() < 0.25 ? 2.5 + Math.random() * 2.5 : 0.3 + Math.random() * 0.7)
        : 0;
    } else {
      this.waitTimer -= delta;
      if (this.waitTimer <= 0) {
        if (this.animationMode === 0) {
          // Random: vary both move count and wait time
          this.scramble(10 + Math.floor(Math.random() * 10));
          this.waitTimer = 2 + Math.random() * 5;
        } else if (this.animationMode === 3) {
          // N Permutations: user-controlled move count, synchronized timing
          this.scramble(this.numPermutations);
          this.waitTimer = this.timeBetweenAnimations;
        } else if (this.animationMode === 6) {
          // Wave (bidirectional): alternate right→left→right each cycle.
          // The stagger is baked into waitTimer so all cubes re-sync naturally.
          this.waveBidirFlipped = !this.waveBidirFlipped;
          const nextStagger = this.waveBidirFlipped
            ? (1 - this.waveMoveFactor) * 16
            : this.waveMoveFactor * 16;
          this.scramble(10);
          this.waitTimer = this.timeBetweenAnimations + nextStagger;
        } else {
          // Synchronized, Wave Right/Left, Ripple: fixed move count and wait.
          // waveStaggerOffset preserves the per-cube stagger across every cycle.
          this.scramble(10);
          this.waitTimer = this.timeBetweenAnimations + this.waveStaggerOffset;
        }
      }
    }
  }

  executeMove(move: string) {
    const axis = new THREE.Vector3();
    let filterDir = '';
    let filterVal = 0;
    let angle = Math.PI / 2;

    if (move.includes("'")) angle *= -1;

    const base = move[0];
    switch(base) {
      case 'R': axis.set(1, 0, 0); filterDir = 'x'; filterVal = 1; break;
      case 'L': axis.set(1, 0, 0); filterDir = 'x'; filterVal = -1; angle *= -1; break;
      case 'U': axis.set(0, 1, 0); filterDir = 'y'; filterVal = 1; break;
      case 'D': axis.set(0, 1, 0); filterDir = 'y'; filterVal = -1; angle *= -1; break;
      case 'F': axis.set(0, 0, 1); filterDir = 'z'; filterVal = 1; break;
      case 'B': axis.set(0, 0, 1); filterDir = 'z'; filterVal = -1; angle *= -1; break;
    }

    const rotation = new THREE.Quaternion().setFromAxisAngle(axis, angle);

    for (const cubie of this.cubies) {
      // Find where this piece CURRENTLY is in the cube grid
      const currentPos = cubie.initialPos.clone().applyQuaternion(cubie.targetQuat);
      
      // If its current position is on the moving face
      if (Math.round((currentPos as any)[filterDir]) === filterVal) {
        cubie.targetQuat.premultiply(rotation);
      }
    }
  }

  scramble(n: number) {
    const moves = ['R', 'L', 'U', 'D', 'F', 'B'];
    const sequence: string[] = [];
    let lastBase = '';
    
    for (let i = 0; i < n; i++) {
      let m = '';
      do {
          m = moves[Math.floor(Math.random() * moves.length)];
      } while (m === lastBase);
      
      lastBase = m;
      const prime = Math.random() > 0.5 ? "'" : "";
      sequence.push(m + prime);
    }
    this.moveQueue.push(...sequence);
    const inverse = sequence.slice().reverse().map(m => m.includes("'") ? m[0] : m + "'");
    this.moveQueue.push(...inverse);
  }
}
