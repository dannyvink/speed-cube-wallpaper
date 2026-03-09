# Cubie - Multi-Rubik's Cube Animation

A high-performance 3D animation of a grid of Rubik's cubes being solved, built with Three.js, TypeScript, and GLSL. Deployed as a **Wallpaper Engine** wallpaper (title: "Speed Cube").

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
  - **Isometric Grid:** Cubes are arranged on a 3D grid using isometric orthographic projection. Grid axes follow `u`, `v`, `w = -(u+v)` to approximate a hexagonal layout.
  - **Dirty-only Updates:** Per-frame GPU buffer writes are skipped for cubes that aren't animating, reducing bandwidth.

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

- `src/main.ts`: Entry point. Handles scene setup, grid generation, the animation loop, Wallpaper Engine property integration, and resize logic.
- `src/Cube.ts`: Logic for a single Rubik's cube, including move execution (R, L, U, D, F, B and primes), scramble/unscramble looping, animation state, and all animation mode behaviours.
- `src/shaders/cubie.vert.glsl`: Vertex shader. Handles quaternion rotation, instanced positioning, and passing normals/face indices for shading.
- `src/shaders/cubie.frag.glsl`: Fragment shader. Implements multi-source lighting, rim lighting, and anti-aliased sticker edge masking.
- `project.json`: Wallpaper Engine project manifest. Defines all user-configurable properties.

## Key Configurations

All of the following are exposed as Wallpaper Engine properties (see `project.json`) and handled in `wallpaperPropertyListener` in `main.ts`:

| Property | Type | Description |
|---|---|---|
| `animation_mode` | combo | Animation timing mode (see below) |
| `num_permutations` | slider (1–100) | Move count for N Permutations mode |
| `imperfect_rotations` | bool | Adds random overshoot/ease-out-back to rotations |
| `time_between_rotations` | slider (0–10 s) | Pause between individual moves |
| `cube_spacing` | slider (0–100) | Extra spacing between cubes (base = 30 units) |
| `move_speed` | slider (0–10) | Rotation speed multiplier |
| `camera_depth` | slider (1–300) | Orthographic camera frustum half-height |
| `color_face_0..5` | color | Six sticker colors (White, Yellow, Green, Blue, Red, Orange) |
| `color_background` | color | Scene background color |

## Animation Modes

| Mode | Value | Behaviour |
|---|---|---|
| Random | `0` | Each cube picks a random move count (10–19) and random wait (2–7 s) independently |
| Synchronized | `1` | All cubes start and wait together (10 moves, 3 s pause) |
| Wave Right | `2` | Left-side cubes start first; staggered by screen-X position |
| N Permutations | `3` | Like Synchronized but move count is user-defined |
| Wave Left | `4` | Right-side cubes start first |
| Ripple | `5` | Outer cubes start first, center starts last |
| Wave | `6` | Bidirectional: alternates Wave Right → Wave Left each cycle |

## Development Conventions

- **Surgical Updates:** When modifying shaders or core logic, ensure performance remains a priority due to the high instance count.
- **Coordination:** The `Cube` class manages logical state; `main.ts` pushes that state to the GPU via `InstancedBufferAttribute.needsUpdate`.
- **No unscramble tracking:** The scramble/unscramble sequence is generated up-front as moves + their inverse, queued together. There is no separate "solved state" check.
- **Ease-out-back overshoot:** When `imperfectRotations` is on, `moveOvershoot` is set to a random value and applied via `easeOutBack()` in the animate loop before writing `aProgress`.
