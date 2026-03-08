import * as THREE from 'three';
import { Cube } from './Cube';
import vert from './shaders/cubie.vert.glsl';
import frag from './shaders/cubie.frag.glsl';
import './style.css';

const WIDTH = 30; // 30x20 is safer for performance while debugging
const HEIGHT = 20;
const CUBE_COUNT = WIDTH * HEIGHT;
const CUBIES_PER_CUBE = 26;
const TOTAL_INSTANCES = CUBE_COUNT * CUBIES_PER_CUBE;

const scene = new THREE.Scene();
const aspect = window.innerWidth / window.innerHeight;
const d = 150;
const camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 100000);

camera.position.set(200, 200, 200);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
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

const instancedGeom = new THREE.InstancedBufferGeometry().copy(baseGeom);
instancedGeom.instanceCount = TOTAL_INSTANCES;

const aCubieType = new THREE.InstancedBufferAttribute(new Float32Array(TOTAL_INSTANCES), 1);
const aInstancePos = new THREE.InstancedBufferAttribute(new Float32Array(TOTAL_INSTANCES * 3), 3);
const aLocalPos = new THREE.InstancedBufferAttribute(new Float32Array(TOTAL_INSTANCES * 3), 3);
const aQuatA = new THREE.InstancedBufferAttribute(new Float32Array(TOTAL_INSTANCES * 4), 4);
const aQuatB = new THREE.InstancedBufferAttribute(new Float32Array(TOTAL_INSTANCES * 4), 4);
const aProgress = new THREE.InstancedBufferAttribute(new Float32Array(TOTAL_INSTANCES), 1);

instancedGeom.setAttribute('aCubieType', aCubieType);
instancedGeom.setAttribute('aInstancePos', aInstancePos);
instancedGeom.setAttribute('aLocalPos', aLocalPos);
instancedGeom.setAttribute('aQuatA', aQuatA);
instancedGeom.setAttribute('aQuatB', aQuatB);
instancedGeom.setAttribute('aProgress', aProgress);

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

const mesh = new THREE.Mesh(instancedGeom, material);
mesh.frustumCulled = false;
scene.add(mesh);

const cubes: Cube[] = [];
const spacing = 30.0;

for (let i = 0; i < WIDTH; i++) {
  for (let j = 0; j < HEIGHT; j++) {
    const u = i - WIDTH / 2;
    const v = j - HEIGHT / 2;
    const w = -(u + v);

    const worldPos = new THREE.Vector3(u, v, w).multiplyScalar(spacing);
    const cube = new Cube(worldPos);
    cubes.push(cube);
  }
}

// Initial upload
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
aCubieType.needsUpdate = true;
aInstancePos.needsUpdate = true;
aLocalPos.needsUpdate = true;
aQuatA.needsUpdate = true;
aQuatB.needsUpdate = true;
aProgress.needsUpdate = true;

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
  const aspect = window.innerWidth / window.innerHeight;
  camera.left = -d * aspect;
  camera.right = d * aspect;
  camera.top = d;
  camera.bottom = -d;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
