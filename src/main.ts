import * as THREE from 'three';
import { Cube } from './Cube';
import vert from './shaders/cubie.vert.glsl';
import frag from './shaders/cubie.frag.glsl';

let MOVE_SPEED = 2.0;
let CUBE_SPACING = 30.0;
let ANIMATION_MODE = 0; // 0=Random, 1=Synchronized, 2=Wave Right, 3=N Permutations, 4=Wave Left, 5=Ripple, 6=Wave
let NUM_PERMUTATIONS = 5;
let NATURAL_ROTATIONS = false;
let TIME_BETWEEN_ROTATIONS = 0;
let TIME_BETWEEN_ANIMATIONS = 3;
const CUBIES_PER_CUBE = 26;

// FPS Limiter State
let targetFPS = 60;
let lastFrameTime = performance.now() / 1000;
let fpsThreshold = 0;

const scene = new THREE.Scene();
let CAMERA_DEPTH = 150;
const camera = new THREE.OrthographicCamera(
  -CAMERA_DEPTH * (window.innerWidth / window.innerHeight),
  CAMERA_DEPTH * (window.innerWidth / window.innerHeight),
  CAMERA_DEPTH, -CAMERA_DEPTH, 1, 100000
);

camera.position.set(200, 200, 200);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x111111);
document.body.appendChild(renderer.domElement);

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

const baseGeom = new THREE.BoxGeometry(10.0, 10.0, 10.0);
const faceIds = new Float32Array(baseGeom.attributes.position.count);
for (let i = 0; i < 6; i++) {
  for (let j = 0; j < 4; j++) {
    faceIds[i * 4 + j] = i;
  }
}
baseGeom.setAttribute('aFaceId', new THREE.BufferAttribute(faceIds, 1));

const material = new THREE.ShaderMaterial({
  uniforms: {
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

let mesh: THREE.Mesh | null = null;
let cubes: Cube[] = [];
let instancedGeom: THREE.InstancedBufferGeometry;

let aCubieType: THREE.InstancedBufferAttribute;
let aInstancePos: THREE.InstancedBufferAttribute;
let aLocalPos: THREE.InstancedBufferAttribute;
let aQuatA: THREE.InstancedBufferAttribute;
let aQuatB: THREE.InstancedBufferAttribute;
let aProgress: THREE.InstancedBufferAttribute;

function initGrid() {
  if (mesh) {
    scene.remove(mesh);
    cubes = [];
  }

  const aspect = window.innerWidth / window.innerHeight;

  // Calculate needed width and height to fill screen based on 'CAMERA_DEPTH' and 'aspect'
  const viewHeight = CAMERA_DEPTH * 2;
  const viewWidth = viewHeight * aspect;
  
  const widthCount = Math.ceil(viewWidth / (CUBE_SPACING * 0.8)) + 10;
  const heightCount = Math.ceil(viewHeight / (CUBE_SPACING * 0.8)) + 10;
  
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

      const worldPos = new THREE.Vector3(u, v, w).multiplyScalar(CUBE_SPACING);
      const cube = new Cube(worldPos, MOVE_SPEED);
      cubes.push(cube);
    }
  }

  // Screen-space X = worldPos.x - worldPos.z (right vector is (1,0,-1) in this isometric view)
  const screenXValues = cubes.map(c => c.worldPos.x - c.worldPos.z);
  const screenXMin = Math.min(...screenXValues);
  const screenXRange = Math.max(...screenXValues) - screenXMin || 1;
  const WAVE_STAGGER = 8;
  for (const cube of cubes) {
    cube.waveMoveFactor = (cube.worldPos.x - cube.worldPos.z - screenXMin) / screenXRange;
    cube.animationMode = ANIMATION_MODE;
    cube.numPermutations = NUM_PERMUTATIONS;
    cube.naturalRotations = NATURAL_ROTATIONS;
    cube.timeBetweenRotations = TIME_BETWEEN_ROTATIONS;
    cube.timeBetweenAnimations = TIME_BETWEEN_ANIMATIONS;
    if (ANIMATION_MODE === 1 || ANIMATION_MODE === 3) {
      cube.waitTimer = 0;
    } else if (ANIMATION_MODE === 2 || ANIMATION_MODE === 6) {
      // Wave Right and Wave (bidirectional, first pass): left starts first
      cube.waitTimer = cube.waveMoveFactor * WAVE_STAGGER;
    } else if (ANIMATION_MODE === 4) {
      // Wave (to left): right starts first
      cube.waitTimer = (1 - cube.waveMoveFactor) * WAVE_STAGGER;
    }
  }

  if (ANIMATION_MODE === 5) {
    // Ripple: outer cubes start first, center starts last
    const distances = cubes.map(c => c.worldPos.length());
    const maxDist = Math.max(...distances);
    for (let i = 0; i < cubes.length; i++) {
      const normalizedDist = maxDist > 0 ? distances[i] / maxDist : 0;
      cubes[i].waitTimer = (1 - normalizedDist) * WAVE_STAGGER;
    }
  }

  let idx = 0;
  for (const cube of cubes) {
    for (const cubie of cube.cubies) {
      aCubieType.setX(idx, cubie.typeMask);
      aInstancePos.setXYZ(idx, cube.worldPos.x, cube.worldPos.y, cube.worldPos.z);
      aLocalPos.setXYZ(idx, cubie.initialPos.x, cubie.initialPos.y, cubie.initialPos.z);
      aQuatA.setXYZW(idx, 0, 0, 0, 1);
      aQuatB.setXYZW(idx, 0, 0, 0, 1);
      aProgress.setX(idx, 0);
      idx++;
    }
  }
}

initGrid();

// Back ease-out: t goes slightly above 1.0 before settling, producing overshoot in slerp
function easeOutBack(t: number, overshoot: number): number {
  const c3 = overshoot + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + overshoot * Math.pow(t - 1, 2);
}

const timer = new THREE.Timer();

function animate() {
  requestAnimationFrame(animate);
  
  // FPS Limiter Logic
  const now = performance.now() / 1000;
  const dt = Math.min(now - lastFrameTime, 1); // Cap delta to 1s to prevent jumps
  lastFrameTime = now;

  if (targetFPS > 0) {
    fpsThreshold += dt;
    if (fpsThreshold < 1.0 / targetFPS) {
      return; // Skip rendering
    }
    fpsThreshold -= 1.0 / targetFPS;
  }

  timer.update();
  const delta = timer.getDelta();

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

  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  const newAspect = window.innerWidth / window.innerHeight;
  camera.left = -CAMERA_DEPTH * newAspect;
  camera.right = CAMERA_DEPTH * newAspect;
  camera.top = CAMERA_DEPTH;
  camera.bottom = -CAMERA_DEPTH;
  camera.updateProjectionMatrix();
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
    if (properties.color_face_0) applyWallpaperColor(0, properties.color_face_0.value);
    if (properties.color_face_1) applyWallpaperColor(1, properties.color_face_1.value);
    if (properties.color_face_2) applyWallpaperColor(2, properties.color_face_2.value);
    if (properties.color_face_3) applyWallpaperColor(3, properties.color_face_3.value);
    if (properties.color_face_4) applyWallpaperColor(4, properties.color_face_4.value);
    if (properties.color_face_5) applyWallpaperColor(5, properties.color_face_5.value);

    let needsReset = false;

    if (properties.animation_mode) {
      const mode = properties.animation_mode.value as string;
      ANIMATION_MODE = mode === 'synchronized' ? 1
        : mode === 'wave_right' ? 2
        : mode === 'n_permutations' ? 3
        : mode === 'wave_left' ? 4
        : mode === 'ripple' ? 5
        : mode === 'wave' ? 6
        : 0;
      needsReset = true;
    }

    if (properties.natural_rotations) {
      NATURAL_ROTATIONS = properties.natural_rotations.value as boolean;
      for (const cube of cubes) {
        cube.naturalRotations = NATURAL_ROTATIONS;
      }
    }

    if (properties.time_between_rotations) {
      TIME_BETWEEN_ROTATIONS = properties.time_between_rotations.value;
      needsReset = true;
    }

    if (properties.time_between_animations) {
      TIME_BETWEEN_ANIMATIONS = properties.time_between_animations.value;
      needsReset = true;
    }

    if (properties.num_permutations) {
      NUM_PERMUTATIONS = properties.num_permutations.value;
      for (const cube of cubes) {
        cube.numPermutations = NUM_PERMUTATIONS;
      }
    }

    if (properties.cube_spacing) {
      CUBE_SPACING = 30 + properties.cube_spacing.value;
      needsReset = true;
    }

    if (properties.move_speed) {
      MOVE_SPEED = properties.move_speed.value;
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
      CAMERA_DEPTH = properties.camera_depth.value;
      const aspect = window.innerWidth / window.innerHeight;
      camera.left = -CAMERA_DEPTH * aspect;
      camera.right = CAMERA_DEPTH * aspect;
      camera.top = CAMERA_DEPTH;
      camera.bottom = -CAMERA_DEPTH;
      camera.updateProjectionMatrix();
      needsReset = true;
    }

    if (needsReset) initGrid();
  }
};

animate();
