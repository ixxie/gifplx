<script lang="ts">
  let {
    color,
    oncolor
  }: {
    color: string;
    oncolor: (v: string) => void;
  } = $props();

  // HSV state
  let hue = $state(0);
  let sat = $state(0);
  let val = $state(100);
  let hex = $state(color);

  // sync from prop on mount
  $effect(() => {
    const rgb = hexToRgb(color);
    if (rgb) {
      const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
      hue = hsv.h;
      sat = hsv.s;
      val = hsv.v;
      hex = color;
    }
  });

  let svEl: HTMLDivElement;
  let hueEl: HTMLDivElement;
  let draggingSv = false;
  let draggingHue = false;

  function hexToRgb(h: string) {
    const m = h.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
    if (!m) {
      return null;
    }
    return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
  }

  function rgbToHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('');
  }

  function hsvToRgb(h: number, s: number, v: number) {
    s /= 100;
    v /= 100;
    const c = v * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = v - c;
    let r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; }
    else if (h < 120) { r = x; g = c; }
    else if (h < 180) { g = c; b = x; }
    else if (h < 240) { g = x; b = c; }
    else if (h < 300) { r = x; b = c; }
    else { r = c; b = x; }
    return {
      r: Math.round((r + m) * 255),
      g: Math.round((g + m) * 255),
      b: Math.round((b + m) * 255)
    };
  }

  function rgbToHsv(r: number, g: number, b: number) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const d = max - min;
    let h = 0;
    if (d !== 0) {
      if (max === r) {
        h = 60 * (((g - b) / d) % 6);
      } else if (max === g) {
        h = 60 * ((b - r) / d + 2);
      } else {
        h = 60 * ((r - g) / d + 4);
      }
    }
    if (h < 0) {
      h += 360;
    }
    const s = max === 0 ? 0 : (d / max) * 100;
    const v = max * 100;
    return { h, s, v };
  }

  function emit() {
    const rgb = hsvToRgb(hue, sat, val);
    const h = rgbToHex(rgb.r, rgb.g, rgb.b);
    hex = h;
    oncolor(h);
  }

  // SV area drag
  function svDown(e: PointerEvent) {
    draggingSv = true;
    svEl.setPointerCapture(e.pointerId);
    svMove(e);
  }

  function svMove(e: PointerEvent) {
    if (!draggingSv) {
      return;
    }
    const rect = svEl.getBoundingClientRect();
    sat = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    val = Math.max(0, Math.min(100, 100 - ((e.clientY - rect.top) / rect.height) * 100));
    emit();
  }

  function svUp() {
    draggingSv = false;
  }

  // Hue strip drag
  function hueDown(e: PointerEvent) {
    draggingHue = true;
    hueEl.setPointerCapture(e.pointerId);
    hueMove(e);
  }

  function hueMove(e: PointerEvent) {
    if (!draggingHue) {
      return;
    }
    const rect = hueEl.getBoundingClientRect();
    hue = Math.max(0, Math.min(360, ((e.clientY - rect.top) / rect.height) * 360));
    emit();
  }

  function hueUp() {
    draggingHue = false;
  }

  function onHexInput(e: Event) {
    let v = (e.target as HTMLInputElement).value;
    if (!v.startsWith('#')) {
      v = '#' + v;
    }
    hex = v;
    if (/^#[a-fA-F0-9]{6}$/.test(v)) {
      const rgb = hexToRgb(v);
      if (rgb) {
        const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
        hue = hsv.h;
        sat = hsv.s;
        val = hsv.v;
        oncolor(v.toLowerCase());
      }
    }
  }

  let hueColor = $derived(rgbToHex(...Object.values(hsvToRgb(hue, 100, 100)) as [number, number, number]));
</script>

<div class="picker">
  <div class="area">
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="sv"
      bind:this={svEl}
      style="background: linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, {hueColor});"
      onpointerdown={svDown}
      onpointermove={svMove}
      onpointerup={svUp}
    >
      <div
        class="sv-cursor"
        style="left: {sat}%; top: {100 - val}%;"
      ></div>
    </div>

    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="hue-strip"
      bind:this={hueEl}
      onpointerdown={hueDown}
      onpointermove={hueMove}
      onpointerup={hueUp}
    >
      <div
        class="hue-cursor"
        style="top: {(hue / 360) * 100}%;"
      ></div>
    </div>
  </div>

  <div class="hex-row">
    <div class="swatch" style="background: {hex};"></div>
    <input
      type="text"
      class="hex-input"
      value={hex}
      oninput={onHexInput}
      maxlength="7"
    />
  </div>
</div>

<style>
  .picker {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    background: #1a1a1a;
    padding: 0.75rem;
    box-sizing: border-box;
    gap: 0.75rem;
  }

  .area {
    flex: 1;
    min-height: 0;
    display: flex;
    gap: 0.5rem;
  }

  .sv {
    flex: 1;
    min-width: 0;
    position: relative;
    border-radius: 6px;
    cursor: crosshair;
    touch-action: none;
  }

  .sv-cursor {
    position: absolute;
    width: 14px;
    height: 14px;
    border: 2px solid #fff;
    border-radius: 50%;
    box-shadow: 0 0 2px rgba(0,0,0,0.8);
    transform: translate(-50%, -50%);
    pointer-events: none;
  }

  .hue-strip {
    width: 20px;
    flex-shrink: 0;
    border-radius: 6px;
    background: linear-gradient(
      to bottom,
      #f00 0%,
      #ff0 17%,
      #0f0 33%,
      #0ff 50%,
      #00f 67%,
      #f0f 83%,
      #f00 100%
    );
    position: relative;
    cursor: pointer;
    touch-action: none;
  }

  .hue-cursor {
    position: absolute;
    left: -2px;
    right: -2px;
    height: 6px;
    border: 2px solid #fff;
    border-radius: 4px;
    box-shadow: 0 0 2px rgba(0,0,0,0.8);
    transform: translateY(-50%);
    pointer-events: none;
  }

  .hex-row {
    flex-shrink: 0;
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .swatch {
    width: 28px;
    height: 28px;
    border-radius: 6px;
    border: 2px solid #555;
    flex-shrink: 0;
  }

  .hex-input {
    flex: 1;
    min-width: 0;
    padding: 0.4rem 0.5rem;
    background: #222;
    border: 1px solid #555;
    border-radius: 4px;
    color: #eee;
    font-family: monospace;
    font-size: 0.85rem;
    outline: none;
  }
  .hex-input:focus {
    border-color: #7c4dff;
  }
</style>
