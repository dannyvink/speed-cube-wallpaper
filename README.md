# Speed Cube

An animated wallpaper featuring an infinite isometric grid of speed cubes (Rubik's cubes), each continuously rotating through random or choreographed sequences.

## Features

- Fully customizable face colors matching standard speed cube schemes (or anything you want)
- Seven animation modes controlling how cubes move across the grid
- Adjustable rotation speed, spacing, and camera zoom
- Optional vignette overlay
- Respects Wallpaper Engine's FPS limit setting

## Properties

| Property | Description |
|---|---|
| **Background Color** | Color of the scene background. |
| **Color 1-6** | Colors assigned to each of the six cube faces. Defaults match a standard speed cube. |
| **Animation Mode** | Controls how rotations are sequenced across the grid. See modes below. |
| **Rotation Speed** | How fast each cube rotates during a move. Higher values = faster spins. |
| **Time Between Rotations** | Pause duration between individual moves within a single cube's sequence. |
| **Time Between Animations** | Pause duration before a cube starts its next animation cycle. |
| **Natural Rotations** | When enabled, rotations will be eased and appear more realistic. |
| **Random Starting Orientation** | When enabled, each cube starts with a random side facing up. |
| **Cube Spacing** | Controls the gap between cubes in the grid. |
| **Camera Depth** | Adjusts the zoom level of the orthographic camera. Lower values = closer/larger cubes. |
| **Vignette** | Adds a darkened border overlay that fades toward the edges of the screen. |
| **Number of Permutations** | (N Permutations mode only) Number of moves each cube performs before solving. |

## Animation Modes

| Mode | Description |
|---|---|
| **Random** | Each cube animates independently on its own random timing. |
| **Synchronized** | All cubes animate simultaneously. |
| **Wave** | A wave of rotations sweeps right, then reverses back left in a continuous loop. |
| **Wave Right** | A wave sweeps continuously from left to right. |
| **Wave Left** | A wave sweeps continuously from right to left. |
| **Ripple** | Rotations radiate outward from the center of the grid. |
| **N Permutations** | Each cube performs a fixed number of moves, then resets and repeats. |
