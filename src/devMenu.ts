// Dev-only settings panel. Only imported when import.meta.env.DEV is true.

type UserProps = Record<string, { value: any }>;

const FACE_LABELS = ['+X (White)', '-X (Yellow)', '+Y (Green)', '-Y (Blue)', '+Z (Red)', '-Z (Orange)'];
const FACE_DEFAULTS = ['#fcfcfc', '#f6ec21', '#009e5b', '#0050a4', '#d72828', '#ff5800'];

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
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
    marginBottom: '6px',
  });
  const lbl = el('label', { textContent: label }, { flex: '1', opacity: '0.75', fontSize: '11px' });
  wrapper.append(lbl, input);
  return wrapper;
}

function section(title: string): HTMLElement {
  const s = el('div', { textContent: title }, {
    fontSize: '10px',
    fontWeight: 'bold',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    opacity: '0.5',
    marginTop: '10px',
    marginBottom: '4px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    paddingBottom: '3px',
  });
  return s;
}

function numInput(value: number, min: number, max: number, step: number, onChange: (v: number) => void): HTMLElement {
  const wrapper = el('div', {}, { display: 'flex', gap: '4px', alignItems: 'center' });

  const slider = el('input', {}, { width: '80px', cursor: 'pointer', accentColor: '#646cff' });
  slider.type = 'range';
  slider.min = String(min);
  slider.max = String(max);
  slider.step = String(step);
  slider.value = String(value);

  const num = el('input', {}, {
    width: '42px',
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '4px',
    color: 'inherit',
    padding: '2px 4px',
    fontSize: '11px',
    textAlign: 'right',
  });
  num.type = 'number';
  num.min = String(min);
  num.max = String(max);
  num.step = String(step);
  num.value = String(value);

  slider.addEventListener('input', () => {
    num.value = slider.value;
    onChange(parseFloat(slider.value));
  });
  num.addEventListener('change', () => {
    slider.value = num.value;
    onChange(parseFloat(num.value));
  });

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
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '4px',
    color: 'inherit',
    padding: '2px 4px',
    fontSize: '11px',
    cursor: 'pointer',
  });
  for (const opt of options) {
    const o = document.createElement('option');
    o.value = opt.value;
    o.textContent = opt.label;
    if (opt.value === current) o.selected = true;
    sel.appendChild(o);
  }
  sel.addEventListener('change', () => onChange(sel.value));
  return sel;
}

export function initDevMenu() {
  // Outer container
  const host = el('div', {}, {
    position: 'fixed',
    top: '12px',
    right: '12px',
    zIndex: '9999',
    fontFamily: 'ui-monospace, monospace',
    fontSize: '12px',
    color: '#e0e0e0',
    userSelect: 'none',
  });

  // Toggle button
  const toggle = el('button', { textContent: '⚙ DEV' }, {
    display: 'block',
    marginLeft: 'auto',
    padding: '4px 10px',
    fontSize: '11px',
    fontFamily: 'inherit',
    background: 'rgba(20,20,30,0.85)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '6px',
    color: '#e0e0e0',
    cursor: 'pointer',
    backdropFilter: 'blur(6px)',
    marginBottom: '6px',
  });

  // Panel
  const panel = el('div', {}, {
    background: 'rgba(18,18,28,0.92)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '8px',
    padding: '10px 12px',
    width: '260px',
    maxHeight: '90vh',
    overflowY: 'auto',
    backdropFilter: 'blur(10px)',
    display: 'none',
    boxSizing: 'border-box',
  });

  toggle.addEventListener('click', () => {
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
  });

  // ── General ──────────────────────────────────────────────
  panel.appendChild(section('General'));

  panel.appendChild(row('FPS limit',
    numInput(60, 1, 240, 1, v => applyGeneral({ fps: v }))
  ));

  // ── Colors ───────────────────────────────────────────────
  panel.appendChild(section('Face Colors'));

  for (let i = 0; i < 6; i++) {
    const idx = i;
    panel.appendChild(row(FACE_LABELS[idx],
      colorInput(FACE_DEFAULTS[idx], hex => {
        applyUser({ [`color_face_${idx}`]: { value: hexToWEColor(hex) } });
      })
    ));
  }

  panel.appendChild(section('Background'));
  panel.appendChild(row('Color',
    colorInput('#111111', hex => {
      applyUser({ color_background: { value: hexToWEColor(hex) } });
    })
  ));

  panel.appendChild(row('Vignette',
    numInput(0, 0, 100, 1, v => applyUser({ vignette: { value: v } }))
  ));

  // ── Animation ────────────────────────────────────────────
  panel.appendChild(section('Animation'));

  const animModes = [
    { label: 'Random',          value: 'random' },
    { label: 'Synchronized',    value: 'synchronized' },
    { label: 'Wave Right',      value: 'wave_right' },
    { label: 'N Permutations',  value: 'n_permutations' },
    { label: 'Wave Left',       value: 'wave_left' },
    { label: 'Ripple',          value: 'ripple' },
    { label: 'Wave',            value: 'wave' },
  ];
  panel.appendChild(row('Mode',
    selectInput(animModes, 'random', v => applyUser({ animation_mode: { value: v } }))
  ));

  panel.appendChild(row('Natural Rotations',
    checkboxInput(false, v => applyUser({ natural_rotations: { value: v } }))
  ));

  panel.appendChild(row('Move Speed',
    numInput(2.0, 0.1, 10, 0.1, v => applyUser({ move_speed: { value: v } }))
  ));

  panel.appendChild(row('Time Between Rotations',
    numInput(0, 0, 5, 0.1, v => applyUser({ time_between_rotations: { value: v } }))
  ));

  panel.appendChild(row('Time Between Anims',
    numInput(3, 0, 15, 0.5, v => applyUser({ time_between_animations: { value: v } }))
  ));

  panel.appendChild(row('N Permutations',
    numInput(5, 1, 30, 1, v => applyUser({ num_permutations: { value: v } }))
  ));

  // ── Layout ───────────────────────────────────────────────
  panel.appendChild(section('Layout'));

  panel.appendChild(row('Cube Spacing',
    numInput(0, -20, 100, 1, v => applyUser({ cube_spacing: { value: v } }))
  ));

  panel.appendChild(row('Camera Depth',
    numInput(150, 50, 500, 10, v => applyUser({ camera_depth: { value: v } }))
  ));

  host.appendChild(toggle);
  host.appendChild(panel);
  document.body.appendChild(host);
}
