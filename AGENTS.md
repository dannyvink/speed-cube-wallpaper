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

- `src/main.ts`: Entry point. Handles scene setup, grid generation (`initGrid`, `applyWaveStagger`, `uploadInitialBuffers`), the animation loop (`shouldSkipFrame`, `updateCubes`, `animate`), Wallpaper Engine property integration, and resize logic.
- `src/cube.ts`: Logic for a single Rubik's cube, including move execution (R, L, U, D, F, B and primes), scramble/unscramble looping, animation state, and all animation mode behaviours.
- `src/types.ts`: Shared types — `AnimationMode` const object + type, `Face` const object + type, `Move` interface, `CubieState` interface, `CubeConfig` interface, `ANIMATION_MODE_MAP`, and helper functions (`invertMove`, `moveToString`).
- `src/constants.ts`: All magic numbers in one place — `CUBIE_SIZE`, `CUBIES_PER_CUBE`, `CULL_MARGIN`, `WAVE_STAGGER`, `WAVE_BIDIR_STAGGER`, scramble/wait ranges.
- `src/shaders/cubie.vert.glsl`: Vertex shader. Handles quaternion rotation, instanced positioning, and passing normals/face indices for shading.
- `src/shaders/cubie.frag.glsl`: Fragment shader. Implements multi-source lighting, rim lighting, and anti-aliased sticker edge masking.
- `project.json`: Wallpaper Engine project manifest. Defines all user-configurable properties.

## Key Configurations

All of the following are exposed as Wallpaper Engine properties (see `project.json`) and handled in `wallpaperPropertyListener` in `main.ts`:

| Property | Type | Description |
|---|---|---|
| `animation_mode` | combo | Animation timing mode (see below) |
| `num_permutations` | slider (1–100) | Move count for N Permutations mode |
| `natural_rotations` | bool | Adds random overshoot/ease-out-back to rotations |
| `random_starting_orientation` | bool | Each cube starts with a random orientation |
| `time_between_rotations` | slider (0–10 s) | Pause between individual moves |
| `time_between_animations` | slider (0–10 s) | Pause before a cube's next animation cycle |
| `cube_spacing` | slider (0–100) | Extra spacing between cubes (base = 30 units) |
| `move_speed` | slider (0–10) | Rotation speed multiplier |
| `camera_depth` | slider (1–300) | Orthographic camera frustum half-height |
| `color_face_0..5` | color | Six sticker colors (White, Yellow, Green, Blue, Red, Orange) |
| `color_background` | color | Scene background color |
| `vignette` | slider (0–100) | Darkened border overlay intensity |

## Animation Modes

Defined in `src/types.ts` as the `AnimationMode` const object. The `ANIMATION_MODE_MAP` maps Wallpaper Engine string values to numeric modes.

| Mode | Value | Behaviour |
|---|---|---|
| Random | `0` | Each cube picks a random move count (10–19) and random wait (2–7 s) independently |
| Synchronized | `1` | All cubes start and wait together (10 moves, `timeBetweenAnimations` pause) |
| Wave Right | `2` | Left-side cubes start first; staggered by screen-X position |
| N Permutations | `3` | Like Synchronized but move count is user-defined via `num_permutations` |
| Wave Left | `4` | Right-side cubes start first |
| Ripple | `5` | Outer cubes start first, center starts last |
| Wave | `6` | Bidirectional: alternates Wave Right → Wave Left each cycle |

Wave stagger is applied in `applyWaveStagger()` in `main.ts` using `WAVE_STAGGER = 8`. The bidirectional Wave mode uses `WAVE_BIDIR_STAGGER = 16` (2×) to account for the full round-trip cycle, toggled via `waveBidirFlipped` on each `Cube`.

## Config Flow

Global animation settings live in a single `CubeConfig` object in `main.ts`. On `initGrid()`, each `Cube` is constructed with a copy of this config. Settings that take effect immediately without a reset (e.g. `natural_rotations`, `num_permutations`) are written directly to `cube.config` on each existing cube, bypassing `initGrid()`. Settings that require a full reset (e.g. `animation_mode`, `move_speed`, `cube_spacing`) set `needsReset = true` and trigger `initGrid()`.

## Development Conventions

- **Surgical Updates:** When modifying shaders or core logic, ensure performance remains a priority due to the high instance count.
- **Coordination:** The `Cube` class manages logical state; `main.ts` pushes that state to the GPU via `InstancedBufferAttribute.needsUpdate`.
- **No unscramble tracking:** The scramble/unscramble sequence is generated up-front as moves + their inverse, queued together. There is no separate "solved state" check.
- **Ease-out-back overshoot:** When `naturalRotations` is on, `moveOvershoot` is set to a random value and applied via `easeOutBack()` in `updateCubes()` before writing `aProgress`.
- **Full reset on most property changes:** `initGrid()` rebuilds the entire grid (all cubes reset to initial state). This is intentional — it prevents animation sync issues and ensures settings like `randomStartingOrientation` take immediate effect.
- **File naming:** All source files use lowercase/camelCase (e.g. `cube.ts`, `devMenu.ts`).
- **No TypeScript enums:** `erasableSyntaxOnly` is enabled in `tsconfig.json`. Use `const` objects with `as const` + a type alias instead of `enum`.
