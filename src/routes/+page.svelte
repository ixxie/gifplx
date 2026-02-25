<script lang="ts">
  import Search from '$lib/components/Search.svelte';
  import Preview from '$lib/components/Preview.svelte';
  import FontControls from '$lib/components/FontControls.svelte';
  import ColorPicker from '$lib/components/ColorPicker.svelte';
  import { decodeGif, exportGif, type TextOpts } from '$lib/gif';
  import { fetchFonts, loadFont, type FontInfo } from '$lib/fonts';
  import { randomPhrase } from '$lib/words';

  const initialPhrase = randomPhrase();

  interface SelectedGif {
    url: string;
    width: number;
    height: number;
  }

  // gif state
  let selectedGif = $state<SelectedGif | null>(null);

  // text state
  let text = $state(initialPhrase);
  let font = $state('Impact');
  let position = $state<'top' | 'center' | 'bottom'>('bottom');
  let fontSize = $state(32);
  let color = $state('#ffffff');
  let outline = $state(true);
  let outlineColor = $state('#000000');
  let outlineThickness = $state(3);
  let padding = $state(4);
  let bgActive = $state(false);
  let bgColor = $state('#000000');
  let bgOpacity = $state(1);

  // color picker popover
  let activePopover = $state<'text' | 'outline' | 'background' | null>(null);

  function onWindowClick(e: MouseEvent) {
    if (activePopover && !(e.target as HTMLElement).closest('.color-wrap')) {
      activePopover = null;
    }
  }

  // export state
  let exportName = $state('');
  let exporting = $state(false);
  let progress = $state(0);

  // fonts
  let fonts = $state<FontInfo[]>([]);
  let ready = $state(false);
  fetchFonts().then(f => { fonts = f; ready = true; });

  let textOpts = $derived<TextOpts>({
    text, position, font, fontSize, color, outline, outlineColor, outlineThickness, padding,
    bgActive, bgColor, bgOpacity
  });

  // derive default export name from text
  let defaultName = $derived(
    text.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'gif'
  );

  function onSelect(gif: SelectedGif) {
    selectedGif = gif;
    fontSize = Math.round(gif.height * 0.1);
  }

  async function doExport() {
    if (!selectedGif) {
      return;
    }
    exporting = true;
    progress = 0;
    try {
      await loadFont(font);
      const decoded = await decodeGif(selectedGif.url);
      const blob = await exportGif(
        decoded.frames,
        decoded.width,
        decoded.height,
        textOpts,
        (p) => { progress = p; }
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${exportName || defaultName}.gif`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export failed:', e);
      alert('Export failed. Check console for details.');
    }
    exporting = false;
  }
</script>

{#if !ready}
  <div class="loading">
    <span class="logo">GIFPLX</span>
    <p class="loading-text">Loading...</p>
  </div>
{:else}
<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="app" onclick={onWindowClick}>
  <div class="topbar">
    <span class="logo">GIFPLX</span>
    <a class="giphy-attr" href="https://giphy.com" target="_blank">
      Powered by <strong>GIPHY</strong>
    </a>
    <input
      class="export-name"
      type="text"
      bind:value={exportName}
      placeholder="{defaultName}.gif"
    />
    <button
      class="export-btn"
      onclick={doExport}
      disabled={exporting || !selectedGif || !text.trim()}
    >
      {#if exporting}
        {Math.round(progress * 100)}%
      {:else}
        Export
      {/if}
    </button>
  </div>

  <div class="body">
    <div class="left">
      <Search onselect={onSelect} initialQuery={initialPhrase} />
    </div>

    <div class="right">
      <div class="right-top">
        {#if selectedGif}
          <Preview
            gifUrl={selectedGif.url}
            gifWidth={selectedGif.width}
            {textOpts}
          />
        {:else}
          <p class="placeholder">Select a GIF to start editing</p>
        {/if}
      </div>

      <div class="right-bottom">
        <div class="cell">
          <FontControls
            {fonts}
            {font}
            {text}
            onfont={(v) => { font = v; }}
          />
        </div>
        <div class="cell settings">
          <div class="section content-section">
            <h3 class="section-head">Content</h3>
            <textarea
              class="text-input"
              bind:value={text}
              placeholder="Enter text..."
            ></textarea>
          </div>

          <div class="section">
            <h3 class="section-head">Text</h3>
            <div class="section-opts">
              <label class="option">
                <span>Color</span>
                <div class="color-wrap">
                  <button class="swatch-btn" style="background: {color};" onclick={() => { activePopover = activePopover === 'text' ? null : 'text'; }}></button>
                  {#if activePopover === 'text'}
                    <div class="popover">
                      <ColorPicker {color} oncolor={(v) => { color = v; }} />
                    </div>
                  {/if}
                </div>
              </label>
              <label class="option">
                <span>Position</span>
                <select
                  value={position}
                  onchange={(e) => { position = (e.target as HTMLSelectElement).value as any; }}
                >
                  <option value="top">Top</option>
                  <option value="center">Center</option>
                  <option value="bottom">Bottom</option>
                </select>
              </label>
              <label class="option">
                <span>Size</span>
                <input
                  type="number"
                  value={fontSize}
                  oninput={(e) => { fontSize = parseInt((e.target as HTMLInputElement).value) || 8; }}
                  min="8"
                />
              </label>
              <label class="option">
                <span>Padding</span>
                <input
                  type="number"
                  value={padding}
                  oninput={(e) => { padding = Math.max(0, parseInt((e.target as HTMLInputElement).value) || 0); }}
                  min="0"
                />
              </label>
            </div>
          </div>

          <div class="section">
            <label class="section-head">
              <span>Outline</span>
              <input
                type="checkbox"
                checked={outline}
                onchange={(e) => { outline = (e.target as HTMLInputElement).checked; }}
              />
            </label>
            <div class="section-opts">
              <label class="option">
                <span>Color</span>
                <div class="color-wrap">
                  <button class="swatch-btn" style="background: {outlineColor};" onclick={() => { activePopover = activePopover === 'outline' ? null : 'outline'; }}></button>
                  {#if activePopover === 'outline'}
                    <div class="popover">
                      <ColorPicker color={outlineColor} oncolor={(v) => { outlineColor = v; }} />
                    </div>
                  {/if}
                </div>
              </label>
              <label class="option">
                <span>Thickness</span>
                <input
                  type="number"
                  value={outlineThickness}
                  oninput={(e) => { outlineThickness = Math.max(0, parseFloat((e.target as HTMLInputElement).value) || 0); }}
                  min="0"
                  step="0.5"
                />
              </label>
            </div>
          </div>

          <div class="section">
            <label class="section-head">
              <span>Background</span>
              <input
                type="checkbox"
                checked={bgActive}
                onchange={(e) => { bgActive = (e.target as HTMLInputElement).checked; }}
              />
            </label>
            <div class="section-opts">
              <label class="option">
                <span>Color</span>
                <div class="color-wrap">
                  <button class="swatch-btn" style="background: {bgColor};" onclick={() => { activePopover = activePopover === 'background' ? null : 'background'; }}></button>
                  {#if activePopover === 'background'}
                    <div class="popover">
                      <ColorPicker color={bgColor} oncolor={(v) => { bgColor = v; }} />
                    </div>
                  {/if}
                </div>
              </label>
              <label class="option">
                <span>Opacity</span>
                <input
                  type="number"
                  value={bgOpacity}
                  oninput={(e) => { bgOpacity = Math.min(1, Math.max(0, parseFloat((e.target as HTMLInputElement).value) || 0)); }}
                  min="0"
                  max="1"
                  step="0.1"
                />
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
{/if}

<style>
  .loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;
    gap: 1rem;
  }

  .loading-text {
    color: #666;
    font-size: 0.9rem;
  }

  :global(body) {
    margin: 0;
    background: #121212;
    color: #eee;
    font-family: system-ui, -apple-system, sans-serif;
  }

  .app {
    display: flex;
    flex-direction: column;
    height: 100vh;
  }

  /* topbar */
  .topbar {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.5rem 1rem;
    background: #1a1a1a;
    border-bottom: 1px solid #333;
  }

  .logo {
    font-weight: 800;
    font-size: 1.1rem;
    white-space: nowrap;
  }

  .giphy-attr {
    font-size: 0.65rem;
    color: #888;
    text-decoration: none;
    white-space: nowrap;
  }
  .giphy-attr:hover {
    color: #aaa;
  }
  .giphy-attr strong {
    color: #aaa;
  }

  .export-name {
    width: 250px;
    margin-left: auto;
    padding: 0.4rem 0.6rem;
    background: #222;
    border: 1px solid #444;
    border-radius: 4px;
    color: #eee;
    font-size: 0.9rem;
    outline: none;
    text-align: right;
  }
  .export-name:focus {
    border-color: #7c4dff;
  }
  .export-name::placeholder {
    color: #666;
  }

  .export-btn {
    padding: 0.5rem 1.5rem;
    border: none;
    border-radius: 6px;
    background: #7c4dff;
    color: #fff;
    font-weight: bold;
    font-size: 0.9rem;
    cursor: pointer;
    white-space: nowrap;
  }
  .export-btn:hover:not(:disabled) {
    background: #651fff;
  }
  .export-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  /* body */
  .body {
    flex: 1;
    display: flex;
    min-height: 0;
  }

  .left {
    flex: 1;
    min-width: 0;
    border-right: 1px solid #333;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .right {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .right-top {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  .right-bottom {
    flex: 1;
    min-height: 0;
    display: flex;
    border-top: 1px solid #333;
  }

  .right-bottom > .cell {
    min-height: 0;
    min-width: 0;
    overflow: hidden;
    flex: 1;
  }

  .right-bottom > .cell.settings {
    overflow: visible;
  }

  .right-bottom > .cell:nth-child(2) {
    border-left: 1px solid #333;
  }

  /* settings panel */
  .settings {
    display: flex !important;
    flex-direction: column;
    overflow-y: auto;
  }

  .section {
    display: flex;
    flex-direction: column;
    background: #222;
    overflow: visible;
  }

  .section + .section {
    border-top: 1px solid #333;
  }

  .section-head {
    margin: 0;
    padding: 0 0.6rem;
    height: 1.75rem;
    font-size: 0.65rem;
    font-weight: 600;
    color: #777;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    background: #1e1e1e;
    border-bottom: 1px solid #333;
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: default;
  }

  .section-opts {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    padding: 0.5rem 0.6rem;
  }

  .content-section {
    flex: 1;
    min-height: 0;
  }

  .text-input {
    flex: 1;
    width: 100%;
    padding: 0.5rem 0.6rem;
    background: #2a2a2a;
    border: none;
    color: #eee;
    font-size: 0.85rem;
    font-family: inherit;
    outline: none;
    box-sizing: border-box;
    resize: none;
  }

  .option {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    color: #ccc;
    font-size: 0.8rem;
    cursor: pointer;
    user-select: none;
  }

  .option select,
  .option input[type="number"] {
    width: 5rem;
    flex-shrink: 0;
    padding: 0.3rem;
    background: #222;
    border: 1px solid #555;
    border-radius: 4px;
    color: #eee;
    font-size: 0.8rem;
    box-sizing: border-box;
  }

  .color-wrap {
    position: relative;
  }

  .swatch-btn {
    all: unset;
    cursor: pointer;
    width: 2rem;
    height: 1.4rem;
    border-radius: 4px;
    border: 2px solid #555;
    display: block;
  }
  .swatch-btn:hover {
    border-color: #7c4dff;
  }

  .popover {
    position: absolute;
    right: 0;
    bottom: calc(100% + 8px);
    width: 240px;
    height: 200px;
    border-radius: 8px;
    border: 1px solid #444;
    background: #1a1a1a;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
    z-index: 100;
    overflow: hidden;
  }

  .placeholder {
    color: #666;
    text-align: center;
    margin: auto;
    font-size: 1.1rem;
  }
</style>
