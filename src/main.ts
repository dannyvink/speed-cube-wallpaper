import * as THREE from 'three';
import { Cube } from './cube';
import vert from './shaders/cubie.vert.glsl';
import frag from './shaders/cubie.frag.glsl';
import { initDevMenu } from './devMenu';
import { AnimationMode, ANIMATION_MODE_MAP, DEFAULT_CUBE_CONFIG } from './types';
import type { CubeConfig } from './types';
import { CUBIES_PER_CUBE, CUBIE_SIZE, CULL_MARGIN, WAVE_STAGGER } from './constants';

// ── Global animation config ────────────────────────────────────────
let config: CubeConfig = { ...DEFAULT_CUBE_CONFIG };
let cubeSpacing = 30.0;
let randomStartingRotation = false;

// ── FPS limiter ────────────────────────────────────────────────────
let targetFPS = 60;
let lastFrameTime = performance.now() / 1000;
let fpsThreshold = 0;

// ── Scene setup ────────────────────────────────────────────────────
const scene = new THREE.Scene();
let cameraDepth = 150;
const camera = new THREE.OrthographicCamera(
  -cameraDepth * (window.innerWidth / window.innerHeight),
  cameraDepth * (window.innerWidth / window.innerHeight),
  cameraDepth, -cameraDepth, 1, 100000
);
camera.position.set(200, 200, 200);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x111111);
document.body.appendChild(renderer.domElement);

// ── Vignette overlay ───────────────────────────────────────────────
const vignetteMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uColor: { value: new THREE.Color(0x111111) },
    uAmount: { value: 0.0 },
    uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 uColor;
    uniform float uAmount;
    uniform vec2 uResolution;
    varying vec2 vUv;
    void main() {
      vec2 uv = vUv - 0.5;
      float dist = length(uv);
      float vignette = smoothstep(0.5, 0.8, dist * (uAmount + 0.5));
      gl_FragColor = vec4(uColor, vignette * uAmount);
    }
  `,
  transparent: true,
  depthTest: false,
  depthWrite: false,
});
const vignetteMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), vignetteMaterial);
vignetteMesh.frustumCulled = false;

// ── Base geometry ──────────────────────────────────────────────────
const baseGeom = new THREE.BoxGeometry(CUBIE_SIZE, CUBIE_SIZE, CUBIE_SIZE);
const faceIds = new Float32Array(baseGeom.attributes.position.count);
for (let i = 0; i < 6; i++) {
  for (let j = 0; j < 4; j++) {
    faceIds[i * 4 + j] = i;
  }
}
baseGeom.setAttribute('aFaceId', new THREE.BufferAttribute(faceIds, 1));

// ── Cube material ──────────────────────────────────────────────────
const material = new THREE.ShaderMaterial({
  uniforms: {
    uCullMargin: { value: CULL_MARGIN / cameraDepth },
    palette: {
      value: [
        new THREE.Color(0xfcfcfc), // +X (White)
        new THREE.Color(0xf6ec21), // -X (Yellow)
        new THREE.Color(0x009e5b), // +Y (Green)
        new THREE.Color(0x0050a4), // -Y (Blue)
        new THREE.Color(0xd72828), // +Z (Red)
        new THREE.Color(0xff5800), // -Z (Orange)
      ]
    }
  },
  vertexShader: vert,
  fragmentShader: frag,
});

// ── Instance state ─────────────────────────────────────────────────
let mesh: THREE.Mesh | null = null;
let cubes: Cube[] = [];
let instancedGeom: THREE.InstancedBufferGeometry;

let aCubieType: THREE.InstancedBufferAttribute;
let aInstancePos: THREE.InstancedBufferAttribute;
let aLocalPos: THREE.InstancedBufferAttribute;
let aQuatA: THREE.InstancedBufferAttribute;
let aQuatB: THREE.InstancedBufferAttribute;
let aProgress: THREE.InstancedBufferAttribute;

function updateCullMargin() {
  material.uniforms.uCullMargin.value = CULL_MARGIN / cameraDepth;
}

// ── Grid initialization ────────────────────────────────────────────

function initGrid() {
  if (mesh) {
    scene.remove(mesh);
    cubes = [];
  }

  const aspect = window.innerWidth / window.innerHeight;
  const viewHeight = cameraDepth * 2;
  const viewWidth = viewHeight * aspect;

  const widthCount = Math.ceil(viewWidth / (cubeSpacing * 0.8)) + 10;
  const heightCount = Math.ceil(viewHeight / (cubeSpacing * 0.8)) + 10;

  const totalCubes = widthCount * heightCount;
  const totalInstances = totalCubes * CUBIES_PER_CUBE;

  instancedGeom = new THREE.InstancedBufferGeometry().copy(baseGeom as unknown as THREE.InstancedBufferGeometry);
  instancedGeom.instanceCount = totalInstances;

  aCubieType = new THREE.InstancedBufferAttribute(new Float32Array(totalInstances), 1);
  aInstancePos = new THREE.InstancedBufferAttribute(new Float32Array(totalInstances * 3), 3);
  aLocalPos = new THREE.InstancedBufferAttribute(new Float32Array(totalInstances * 3), 3);
  aQuatA = new THREE.InstancedBufferAttribute(new Float32Array(totalInstances * 4), 4);
  aQuatB = new THREE.InstancedBufferAttribute(new Float32Array(totalInstances * 4), 4);
  aProgress = new THREE.InstancedBufferAttribute(new Float32Array(totalInstances), 1);

  instancedGeom.setAttribute('aCubieType', aCubieType);
  instancedGeom.setAttribute('aInstancePos', aInstancePos);
  instancedGeom.setAttribute('aLocalPos', aLocalPos);
  instancedGeom.setAttribute('aQuatA', aQuatA);
  instancedGeom.setAttribute('aQuatB', aQuatB);
  instancedGeom.setAttribute('aProgress', aProgress);

  mesh = new THREE.Mesh(instancedGeom, material);
  mesh.frustumCulled = false;
  scene.add(mesh);

  // Ensure vignette is always on top
  scene.remove(vignetteMesh);
  scene.add(vignetteMesh);

  for (let i = 0; i < widthCount; i++) {
    for (let j = 0; j < heightCount; j++) {
      const u = i - widthCount / 2;
      const v = j - heightCount / 2;
      const w = -(u + v);

      const worldPos = new THREE.Vector3(u, v, w).multiplyScalar(cubeSpacing);
      cubes.push(new Cube(worldPos, config, randomStartingRotation));
    }
  }

  applyWaveStagger();
  uploadInitialBuffers();
}

function applyWaveStagger() {
  const mode = config.animationMode;

  // Screen-space X = worldPos.x - worldPos.z (right vector is (1,0,-1) in this isometric view)
  const screenXValues = cubes.map(c => c.worldPos.x - c.worldPos.z);
  const screenXMin = Math.min(...screenXValues);
  const screenXRange = Math.max(...screenXValues) - screenXMin || 1;

  for (const cube of cubes) {
    cube.waveMoveFactor = (cube.worldPos.x - cube.worldPos.z - screenXMin) / screenXRange;

    if (mode === AnimationMode.Synchronized || mode === AnimationMode.NPermutations) {
      cube.waitTimer = 0;
      cube.waveStaggerOffset = 0;
    } else if (mode === AnimationMode.WaveRight || mode === AnimationMode.Wave) {
      // Wave Right and Wave (bidirectional, first pass): left starts first
      cube.waveStaggerOffset = mode === AnimationMode.WaveRight ? cube.waveMoveFactor * WAVE_STAGGER : 0;
      cube.waitTimer = cube.waveMoveFactor * WAVE_STAGGER;
    } else if (mode === AnimationMode.WaveLeft) {
      cube.waveStaggerOffset = (1 - cube.waveMoveFactor) * WAVE_STAGGER;
      cube.waitTimer = cube.waveStaggerOffset;
    }
    // AnimationMode.Random and Ripple: no stagger override needed here
  }

  if (mode === AnimationMode.Ripple) {
    const distances = cubes.map(c => c.worldPos.length());
    const maxDist = Math.max(...distances);
    for (let i = 0; i < cubes.length; i++) {
      const normalizedDist = maxDist > 0 ? distances[i] / maxDist : 0;
      cubes[i].waveStaggerOffset = (1 - normalizedDist) * WAVE_STAGGER;
      cubes[i].waitTimer = cubes[i].waveStaggerOffset;
    }
  }
}

function uploadInitialBuffers() {
  let idx = 0;
  for (const cube of cubes) {
    for (const cubie of cube.cubies) {
      aCubieType.setX(idx, cubie.typeMask);
      aInstancePos.setXYZ(idx, cube.worldPos.x, cube.worldPos.y, cube.worldPos.z);
      aLocalPos.setXYZ(idx, cubie.initialPos.x, cubie.initialPos.y, cubie.initialPos.z);
      aQuatA.setXYZW(idx, cubie.currentQuat.x, cubie.currentQuat.y, cubie.currentQuat.z, cubie.currentQuat.w);
      aQuatB.setXYZW(idx, cubie.targetQuat.x, cubie.targetQuat.y, cubie.targetQuat.z, cubie.targetQuat.w);
      aProgress.setX(idx, 0);
      idx++;
    }
  }
}

initGrid();

// ── Animation loop ─────────────────────────────────────────────────

// Back ease-out: t goes slightly above 1.0 before settling, producing overshoot in slerp
function easeOutBack(t: number, overshoot: number): number {
  const c3 = overshoot + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + overshoot * Math.pow(t - 1, 2);
}

function shouldSkipFrame(now: number): boolean {
  const dt = Math.min(now - lastFrameTime, 1);
  lastFrameTime = now;

  if (targetFPS > 0) {
    fpsThreshold += dt;
    if (fpsThreshold < 1.0 / targetFPS) {
      return true;
    }
    fpsThreshold -= 1.0 / targetFPS;
  }
  return false;
}

function updateCubes(delta: number) {
  let idx = 0;
  let updateNecessary = false;

  for (const cube of cubes) {
    const wasAnimating = cube.animating;
    cube.update(delta);

    if (wasAnimating || cube.animating) {
      for (const cubie of cube.cubies) {
        aQuatA.setXYZW(idx, cubie.currentQuat.x, cubie.currentQuat.y, cubie.currentQuat.z, cubie.currentQuat.w);
        aQuatB.setXYZW(idx, cubie.targetQuat.x, cubie.targetQuat.y, cubie.targetQuat.z, cubie.targetQuat.w);
        const displayProgress = cube.moveOvershoot > 0
          ? easeOutBack(cube.progress, cube.moveOvershoot)
          : cube.progress;
        aProgress.setX(idx, displayProgress);
        idx++;
      }
      updateNecessary = true;
    } else {
      idx += CUBIES_PER_CUBE;
    }
  }

  if (updateNecessary) {
    aQuatA.needsUpdate = true;
    aQuatB.needsUpdate = true;
    aProgress.needsUpdate = true;
  }
}

const timer = new THREE.Timer();

function animate() {
  requestAnimationFrame(animate);

  const now = performance.now() / 1000;
  if (shouldSkipFrame(now)) return;

  timer.update();
  updateCubes(timer.getDelta());
  renderer.render(scene, camera);
}

// ── Event handlers ─────────────────────────────────────────────────

function updateCamera() {
  const aspect = window.innerWidth / window.innerHeight;
  camera.left = -cameraDepth * aspect;
  camera.right = cameraDepth * aspect;
  camera.top = cameraDepth;
  camera.bottom = -cameraDepth;
  camera.updateProjectionMatrix();
}

window.addEventListener('resize', () => {
  updateCamera();
  renderer.setSize(window.innerWidth, window.innerHeight);
  vignetteMaterial.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
  initGrid();
});

function applyWallpaperColor(index: number, value: string) {
  const parts = value.split(' ');
  material.uniforms.palette.value[index].setRGB(
    parseFloat(parts[0]),
    parseFloat(parts[1]),
    parseFloat(parts[2])
  );
}

(window as any).wallpaperPropertyListener = {
  applyGeneralProperties(properties: Record<string, any>) {
    if (properties.fps) {
      targetFPS = properties.fps;
    }
  },

  applyUserProperties(properties: Record<string, { value: any }>) {
    for (let i = 0; i < 6; i++) {
      const key = `color_face_${i}`;
      if (properties[key]) applyWallpaperColor(i, properties[key].value);
    }

    let needsReset = false;

    if (properties.animation_mode) {
      config.animationMode = ANIMATION_MODE_MAP[properties.animation_mode.value] ?? AnimationMode.Random;
      needsReset = true;
    }

    if (properties.natural_rotations) {
      config.naturalRotations = properties.natural_rotations.value as boolean;
      for (const cube of cubes) {
        cube.config.naturalRotations = config.naturalRotations;
      }
    }

    if (properties.random_starting_orientation) {
      randomStartingRotation = properties.random_starting_orientation.value as boolean;
      needsReset = true;
    }

    if (properties.time_between_rotations) {
      config.timeBetweenRotations = properties.time_between_rotations.value;
      needsReset = true;
    }

    if (properties.time_between_animations) {
      config.timeBetweenAnimations = properties.time_between_animations.value;
      needsReset = true;
    }

    if (properties.num_permutations) {
      config.numPermutations = properties.num_permutations.value;
      for (const cube of cubes) {
        cube.config.numPermutations = config.numPermutations;
      }
    }

    if (properties.cube_spacing) {
      cubeSpacing = 30 + properties.cube_spacing.value;
      needsReset = true;
    }

    if (properties.move_speed) {
      config.moveSpeed = properties.move_speed.value;
      needsReset = true;
    }

    if (properties.color_background) {
      const parts = properties.color_background.value.split(' ');
      const color = new THREE.Color(
        parseFloat(parts[0]),
        parseFloat(parts[1]),
        parseFloat(parts[2])
      );
      renderer.setClearColor(color);
      vignetteMaterial.uniforms.uColor.value.copy(color);
    }

    if (properties.vignette) {
      vignetteMaterial.uniforms.uAmount.value = properties.vignette.value / 100.0;
    }

    if (properties.camera_depth) {
      cameraDepth = properties.camera_depth.value;
      updateCamera();
      updateCullMargin();
      needsReset = true;
    }

    if (needsReset) initGrid();
  }
};

animate();

declare const __DEV_MENU__: boolean;
if (import.meta.env.DEV || __DEV_MENU__) {
  initDevMenu();
}
