# Cubie - Multi-Rubik's Cube Animation

A high-performance 3D animation of a grid of Rubik's cubes being solved, built with Three.js, TypeScript, and GLSL.

## Project Overview

- **Purpose:** Recreate a complex Rubik's cube animation with thousands of independent moving parts.
- **Tech Stack:**
  - **Framework:** [Vite](https://vitejs.dev/)
  - **3D Engine:** [Three.js](https://threejs.org/)
  - **Language:** TypeScript
  - **Shaders:** GLSL (via `vite-plugin-glsl`)
- **Architecture:**
  - **GPU Instancing:** Uses `THREE.InstancedBufferGeometry` to render all cubies (26 per cube) in a single draw call.
  - **Fixed Position Model:** Cubies are logically fixed in their solved positions, and their physical positions and orientations are calculated via quaternions and offsets in the vertex shader.
  - **Shader-based Animation:** Rotation interpolation (Slerp) is performed on the GPU to minimize CPU overhead.
  - **Hexagonal Grid:** Cubes are arranged on a 3D hexagonal grid using isometric orthographic projection.

## Building and Running

### Development
```bash
npm install
npm run dev
```

### Production Build
```bash
npm run build
```

### Preview Build
```bash
npm run preview
```

## Core Components

- `src/main.ts`: Entry point. Handles scene setup, grid generation, the animation loop, and resizing logic.
- `src/Cube.ts`: Logic for a single Rubik's cube, including move execution (R, L, U, D, F, B), scramble/unscramble looping, and animation state.
- `src/shaders/cubie.vert.glsl`: Vertex shader. Handles quaternion rotation, instanced positioning, and passing normals/face indices for shading.
- `src/shaders/cubie.frag.glsl`: Fragment shader. Implements multi-source lighting, rim lighting, and anti-aliased sticker edge masking.

## Key Configurations

- **Grid Size:** Dynamically calculated in `src/main.ts` based on viewport size.
- **Move Speed:** Configurable `MOVE_SPEED` constant in `src/main.ts`.
- **Palette:** Realistic Rubik's cube colors defined in the shader uniforms.

## Development Conventions

- **Surgical Updates:** When modifying shaders or core logic, ensure performance remains a priority due to the high instance count.
- **Coordination:** The `Cube` class manages the logical state, while `main.ts` pushes that state to the GPU via `InstancedBufferAttribute.needsUpdate`.
