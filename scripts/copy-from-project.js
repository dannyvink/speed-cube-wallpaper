import { readFileSync, copyFileSync, existsSync } from 'fs';
import { resolve, join } from 'path';

// Prefer WALLPAPER_ENGINE_PROJECT_DIR already in the environment, otherwise read .env
let projectDir = process.env.WALLPAPER_ENGINE_PROJECT_DIR;

if (!projectDir) {
  const envPath = resolve('.env');
  if (existsSync(envPath)) {
    const match = readFileSync(envPath, 'utf-8').match(/^WALLPAPER_ENGINE_PROJECT_DIR=(.+)$/m);
    if (match) projectDir = match[1].trim().replace(/^["']|["']$/g, '');
  }
}

if (!projectDir) {
  console.error('WALLPAPER_ENGINE_PROJECT_DIR is not set. Create a .env file with:');
  console.error('WALLPAPER_ENGINE_PROJECT_DIR=C:\\path\\to\\wallpaper_engine\\projects\\myprojects\\your_project');
  process.exit(1);
}

if (!existsSync(projectDir)) {
  console.error(`Project directory does not exist: ${projectDir}`);
  process.exit(1);
}

const src = join(projectDir, 'project.json');
const dest = resolve('project.json');

if (!existsSync(src)) {
  console.error(`Source file not found: ${src}`);
  process.exit(1);
}

copyFileSync(src, dest);
console.log(`Copied ${src} → ${dest}`);
