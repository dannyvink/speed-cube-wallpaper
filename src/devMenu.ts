// Dev-only settings panel. Only imported when import.meta.env.DEV is true.

type UserProps = Record<string, { value: any }>;

const FACE_LABELS = ['+X (White)', '-X (Yellow)', '+Y (Green)', '-Y (Blue)', '+Z (Red)', '-Z (Orange)'];
const FACE_DEFAULTS = ['#fcfcfc', '#f6ec21', '#009e5b', '#0050a4', '#d72828', '#ff5800'];

const ANIM_MODES = [
  { label: 'Random',          value: 'random' },
  { label: 'Synchronized',    value: 'synchronized' },
  { label: 'Wave',            value: 'wave' },
  { label: 'Wave Right',      value: 'wave_right' },
  { label: 'Wave Left',       value: 'wave_left' },
  { label: 'Ripple',          value: 'ripple' },
  { label: 'N Permutations',  value: 'n_permutations' },
];

function hexToWEColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return `${r.toFixed(4)} ${g.toFixed(4)} ${b.toFixed(4)}`;
}

function applyUser(props: UserProps) {
  (window as any).wallpaperPropertyListener.applyUserProperties(props);
}

function applyGeneral(props: Record<string, any>) {
  (window as any).wallpaperPropertyListener.applyGeneralProperties(props);
}

// ── DOM helpers ─────────────────────────────────────────────────────

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Partial<HTMLElementTagNameMap[K]> = {},
  style: Partial<CSSStyleDeclaration> = {}
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  Object.assign(e, attrs);
  Object.assign(e.style, style);
  return e;
}

function row(label: string, input: HTMLElement): HTMLElement {
  const wrapper = el('div', {}, {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    gap: '8px', marginBottom: '6px',
  });
  const lbl = el('label', { textContent: label }, { flex: '1', opacity: '0.75', fontSize: '11px' });
  wrapper.append(lbl, input);
  return wrapper;
}

function section(title: string): HTMLElement {
  return el('div', { textContent: title }, {
    fontSize: '10px', fontWeight: 'bold', letterSpacing: '0.08em',
    textTransform: 'uppercase', opacity: '0.5', marginTop: '10px',
    marginBottom: '4px', borderBottom: '1px solid rgba(255,255,255,0.1)',
    paddingBottom: '3px',
  });
}

// ── Input builders ──────────────────────────────────────────────────

const INPUT_STYLE: Partial<CSSStyleDeclaration> = {
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: '4px',
  color: 'inherit',
  fontSize: '11px',
};

function numInput(value: number, min: number, max: number, step: number, onChange: (v: number) => void): HTMLElement {
  const wrapper = el('div', {}, { display: 'flex', gap: '4px', alignItems: 'center' });

  const slider = el('input', {}, { width: '80px', cursor: 'pointer', accentColor: '#646cff' });
  slider.type = 'range';
  slider.min = String(min);
  slider.max = String(max);
  slider.step = String(step);
  slider.value = String(value);

  const num = el('input', {}, {
    ...INPUT_STYLE, width: '42px', padding: '2px 4px', textAlign: 'right',
  });
  num.type = 'number';
  num.min = String(min);
  num.max = String(max);
  num.step = String(step);
  num.value = String(value);

  slider.addEventListener('input', () => { num.value = slider.value; onChange(parseFloat(slider.value)); });
  num.addEventListener('change', () => { slider.value = num.value; onChange(parseFloat(num.value)); });

  wrapper.append(slider, num);
  return wrapper;
}

function colorInput(defaultHex: string, onChange: (hex: string) => void): HTMLInputElement {
  const inp = el('input', {}, { cursor: 'pointer', width: '36px', height: '22px', border: 'none', background: 'none', padding: '0' });
  inp.type = 'color';
  inp.value = defaultHex;
  inp.addEventListener('input', () => onChange(inp.value));
  return inp;
}

function checkboxInput(checked: boolean, onChange: (v: boolean) => void): HTMLInputElement {
  const inp = el('input', {}, { cursor: 'pointer', accentColor: '#646cff' });
  inp.type = 'checkbox';
  inp.checked = checked;
  inp.addEventListener('change', () => onChange(inp.checked));
  return inp;
}

function selectInput(options: { label: string; value: string }[], current: string, onChange: (v: string) => void): HTMLSelectElement {
  const sel = el('select', {}, {
    ...INPUT_STYLE, background: '#1a1a2a', color: '#e0e0e0',
    padding: '2px 4px', cursor: 'pointer',
  });
  for (const opt of options) {
    const o = document.createElement('option');
    o.value = opt.value;
    o.textContent = opt.label;
    o.style.background = '#1a1a2a';
    o.style.color = '#e0e0e0';
    if (opt.value === current) o.selected = true;
    sel.appendChild(o);
  }
  sel.addEventListener('change', () => onChange(sel.value));
  return sel;
}

// ── Convenience: create a row that applies a single user property ──

function userPropNum(label: string, prop: string, value: number, min: number, max: number, step: number): HTMLElement {
  return row(label, numInput(value, min, max, step, v => applyUser({ [prop]: { value: v } })));
}

function userPropColor(label: string, prop: string, defaultHex: string): HTMLElement {
  return row(label, colorInput(defaultHex, hex => applyUser({ [prop]: { value: hexToWEColor(hex) } })));
}

function userPropCheckbox(label: string, prop: string, checked: boolean): HTMLElement {
  return row(label, checkboxInput(checked, v => applyUser({ [prop]: { value: v } })));
}

// ── Init ────────────────────────────────────────────────────────────

export function initDevMenu() {
  const host = el('div', {}, {
    position: 'fixed', top: '12px', right: '12px', zIndex: '9999',
    fontFamily: 'ui-monospace, monospace', fontSize: '12px',
    color: '#e0e0e0', userSelect: 'none',
  });

  const toggle = el('button', { textContent: '⚙ SETTINGS' }, {
    display: 'block', marginLeft: 'auto', padding: '4px 10px',
    fontSize: '11px', fontFamily: 'inherit',
    background: 'rgba(20,20,30,0.85)', border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '6px', color: '#e0e0e0', cursor: 'pointer',
    backdropFilter: 'blur(6px)', marginBottom: '6px',
  });

  const panel = el('div', {}, {
    background: 'rgba(18,18,28,0.92)', border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '8px', padding: '10px 12px', width: '260px',
    maxHeight: '90vh', overflowY: 'auto', backdropFilter: 'blur(10px)',
    display: 'none', boxSizing: 'border-box',
  });

  toggle.addEventListener('click', () => {
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
  });

  // ── General ──
  panel.appendChild(section('General'));
  panel.appendChild(row('FPS limit', numInput(60, 1, 240, 1, v => applyGeneral({ fps: v }))));

  // ── Colors ──
  panel.appendChild(section('Face Colors'));
  for (let i = 0; i < 6; i++) {
    panel.appendChild(userPropColor(FACE_LABELS[i], `color_face_${i}`, FACE_DEFAULTS[i]));
  }

  panel.appendChild(section('Background'));
  panel.appendChild(userPropColor('Color', 'color_background', '#111111'));
  panel.appendChild(userPropNum('Vignette', 'vignette', 0, 0, 100, 1));

  // ── Animation ──
  panel.appendChild(section('Animation'));

  let currentMode = 'random';
  const timeBetweenAnimsRow = userPropNum('Time Between Anims', 'time_between_animations', 3, 0, 10, 0.1);
  const numPermRow = userPropNum('N Permutations', 'num_permutations', 5, 1, 100, 1);

  function updateConditionals(mode: string) {
    timeBetweenAnimsRow.style.display = mode !== 'random' ? 'flex' : 'none';
    numPermRow.style.display = mode === 'n_permutations' ? 'flex' : 'none';
  }

  panel.appendChild(row('Mode', selectInput(ANIM_MODES, currentMode, v => {
    currentMode = v;
    applyUser({ animation_mode: { value: v } });
    updateConditionals(v);
  })));

  panel.appendChild(userPropCheckbox('Natural Rotations', 'natural_rotations', true));
  panel.appendChild(userPropCheckbox('Random Starting Orientation', 'random_starting_orientation', false));
  panel.appendChild(userPropNum('Rotation Speed', 'move_speed', 2.0, 0, 10, 0.1));
  panel.appendChild(userPropNum('Time Between Rotations', 'time_between_rotations', 0, 0, 10, 0.1));
  panel.appendChild(timeBetweenAnimsRow);
  panel.appendChild(numPermRow);
  updateConditionals(currentMode);

  const seedInput = el('input', { placeholder: 'leave blank for random' }, {
    ...INPUT_STYLE, width: '140px', padding: '2px 6px',
  });
  seedInput.type = 'text';
  seedInput.addEventListener('change', () => applyUser({ seed: { value: seedInput.value } }));
  panel.appendChild(row('Seed', seedInput));

  // ── Layout ──
  panel.appendChild(section('Layout'));
  panel.appendChild(userPropNum('Cube Spacing', 'cube_spacing', 0, 0, 100, 1));
  panel.appendChild(userPropNum('Camera Depth', 'camera_depth', 150, 1, 300, 1));

  const restartBtn = el('button', { textContent: 'Restart Animation' }, {
    display: 'block', width: '100%', marginTop: '10px', padding: '5px 0',
    fontSize: '11px', fontFamily: 'inherit',
    background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '4px', color: 'inherit', cursor: 'pointer',
  });
  restartBtn.addEventListener('click', () => (window as any).wallpaperPropertyListener.restartAnimation());
  panel.appendChild(restartBtn);

  host.appendChild(toggle);
  host.appendChild(panel);
  document.body.appendChild(host);
}
