<script lang="ts">
  import type { TextOpts } from '$lib/gif';

  let {
    gifUrl,
    gifWidth,
    textOpts
  }: {
    gifUrl: string;
    gifWidth: number;
    textOpts: TextOpts;
  } = $props();

  let bgStyle = $derived(() => {
    let pos = '';
    if (textOpts.position === 'top') {
      pos = 'top: 0';
    } else if (textOpts.position === 'center') {
      pos = 'top: 50%; translate: 0 -50%';
    } else {
      pos = 'bottom: 0';
    }
    return `
      position: absolute;
      left: 0;
      width: 100%;
      ${pos};
      background: ${textOpts.bgColor};
      opacity: ${textOpts.bgOpacity};
      padding: ${textOpts.padding}px 8px;
      box-sizing: border-box;
      line-height: 1.2;
      font-family: "${textOpts.font}", sans-serif;
      font-weight: bold;
      font-size: ${textOpts.fontSize}px;
      text-align: center;
      pointer-events: none;
      word-break: break-word;
    `;
  });

  let overlayStyle = $derived(() => {
    let pos = '';
    if (textOpts.position === 'top') {
      pos = `top: ${textOpts.padding}px`;
    } else if (textOpts.position === 'center') {
      pos = 'top: 50%; translate: 0 -50%';
    } else {
      pos = `bottom: ${textOpts.padding}px`;
    }
    return `
      font-family: "${textOpts.font}", sans-serif;
      font-weight: bold;
      font-size: ${textOpts.fontSize}px;
      color: ${textOpts.color};
      text-align: center;
      width: 100%;
      padding: 0 8px;
      box-sizing: border-box;
      position: absolute;
      left: 0;
      ${pos};
      ${textOpts.outline ? `-webkit-text-stroke: ${textOpts.outlineThickness}px ${textOpts.outlineColor}; paint-order: stroke fill;` : ''}
    `;
  });
</script>

<div class="preview-panel">
  <div class="preview-area">
    <div class="preview" style="max-width: {gifWidth}px;">
      <img src={gifUrl} alt="Selected GIF" />
      {#if textOpts.bgActive}
        <div class="bg-band" style={bgStyle()}>
          <span class="bg-sizer">{textOpts.text}</span>
        </div>
      {/if}
      <div class="overlay" style={overlayStyle()}>
        {textOpts.text}
      </div>
    </div>
  </div>

</div>

<style>
  .preview-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
  }

  .preview-area {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
  }

  .preview {
    position: relative;
    line-height: 0;
    border-radius: 8px;
    overflow: hidden;
    background: #000;
  }
  .preview img {
    width: 100%;
    display: block;
  }

  .bg-sizer {
    visibility: hidden;
  }

  .overlay {
    pointer-events: none;
    line-height: 1.2;
    word-break: break-word;
  }


</style>
