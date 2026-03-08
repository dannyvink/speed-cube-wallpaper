import * as THREE from 'three';
import { Cube } from './Cube';
import vert from './shaders/cubie.vert.glsl';
import frag from './shaders/cubie.frag.glsl';

const MOVE_SPEED = 4.0;
const spacing = 30.0;
const CUBIES_PER_CUBE = 26;

const scene = new THREE.Scene();
const aspect = window.innerWidth / window.innerHeight;
const d = 150;
const camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 100000);

camera.position.set(200, 200, 200);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x111111);
document.body.appendChild(renderer.domElement);

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

  // Calculate needed width and height to fill screen based on 'd' and 'aspect'
  // In orthographic with d=150, the vertical view is -150 to 150 (300 units)
  // Horizontal is 300 * aspect. 
  // We add a buffer of 5 cubes on each side to ensure coverage during rotation
  const viewHeight = d * 2;
  const viewWidth = viewHeight * aspect;
  
  const widthCount = Math.ceil(viewWidth / (spacing * 0.8)) + 10;
  const heightCount = Math.ceil(viewHeight / (spacing * 0.8)) + 10;
  
  const totalCubes = widthCount * heightCount;
  const totalInstances = totalCubes * CUBIES_PER_CUBE;

  instancedGeom = new THREE.InstancedBufferGeometry().copy(baseGeom);
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

  for (let i = 0; i < widthCount; i++) {
    for (let j = 0; j < heightCount; j++) {
      const u = i - widthCount / 2;
      const v = j - heightCount / 2;
      const w = -(u + v);

      const worldPos = new THREE.Vector3(u, v, w).multiplyScalar(spacing);
      const cube = new Cube(worldPos, MOVE_SPEED);
      cubes.push(cube);
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

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();

  let idx = 0;
  let updateNecessary = false;
  for (const cube of cubes) {
    const wasAnimating = cube.animating;
    cube.update(delta);

    if (wasAnimating || cube.animating) {
        for (const cubie of cube.cubies) {
            aQuatA.setXYZW(idx, cubie.currentQuat.x, cubie.currentQuat.y, cubie.currentQuat.z, cubie.currentQuat.w);
            aQuatB.setXYZW(idx, cubie.targetQuat.x, cubie.targetQuat.y, cubie.targetQuat.z, cubie.targetQuat.w);
            aProgress.setX(idx, cube.progress);
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
  camera.left = -d * newAspect;
  camera.right = d * newAspect;
  camera.top = d;
  camera.bottom = -d;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  
  // Re-init grid if aspect ratio changed significantly to ensure coverage
  initGrid();
});

animate();
