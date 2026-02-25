<script lang="ts">
  import { CATEGORIES, loadFont, type FontCategory, type FontInfo } from '$lib/fonts';

  let {
    fonts,
    font,
    text,
    onfont
  }: {
    fonts: FontInfo[];
    font: string;
    text: string;
    onfont: (v: string) => void;
  } = $props();

  let search = $state('');
  let activeCategories = $state<Set<FontCategory>>(new Set());
  let listEl: HTMLDivElement;

  let filtered = $derived(() => {
    let list = fonts;

    if (activeCategories.size > 0) {
      list = list.filter(f => activeCategories.has(f.category));
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(f => f.family.toLowerCase().includes(q));
    }

    return list;
  });

  function toggleCategory(cat: FontCategory) {
    const next = new Set(activeCategories);
    if (next.has(cat)) {
      next.delete(cat);
    } else {
      next.add(cat);
    }
    activeCategories = next;
  }

  async function pick(family: string) {
    await loadFont(family);
    onfont(family);
  }

  $effect(() => {
    if (!listEl) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const family = (entry.target as HTMLElement).dataset.family;
            if (family) {
              loadFont(family);
            }
            observer.unobserve(entry.target);
          }
        }
      },
      { root: listEl, rootMargin: '100px' }
    );

    const items = listEl.querySelectorAll('.font-item');
    for (const item of items) {
      observer.observe(item);
    }

    return () => observer.disconnect();
  });
</script>

<div class="controls">
  <div class="panel-head">
    <span>Font</span>
    <div class="categories">
      {#each CATEGORIES as cat (cat.value)}
        <button
          class="chip"
          class:active={activeCategories.has(cat.value)}
          onclick={() => toggleCategory(cat.value)}
        >
          {cat.label}
        </button>
      {/each}
    </div>
  </div>
  <div class="font-list" bind:this={listEl}>
    {#each filtered() as f (f.family)}
      <button
        class="font-item"
        class:selected={f.family === font}
        data-family={f.family}
        onclick={() => pick(f.family)}
      >
        <span class="flabel">
          <span class="fname">{f.family}</span>
          <span class="fcat">{f.category}</span>
        </span>
        <span class="fsample" style="font-family: '{f.family}'">{text}</span>
      </button>
    {/each}
    {#if filtered().length === 0}
      <p class="empty">No fonts match</p>
    {/if}
  </div>

  <div class="bottom">
    <input
      type="text"
      bind:value={search}
      placeholder="Search fonts..."
    />
  </div>
</div>

<style>
  .controls {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    background: #222;
  }

  .panel-head {
    flex-shrink: 0;
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
    gap: 0.4rem;
  }

  .font-list {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
  }

  .font-item {
    all: unset;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.8rem 0.75rem;
    box-sizing: border-box;
    border-bottom: 1px solid #222;
    transition: background 0.1s;
  }
  .font-item:hover {
    background: #252525;
  }
  .font-item.selected {
    background: #2a2244;
  }

  .flabel {
    display: flex;
    align-items: baseline;
    gap: 0.35rem;
    flex-shrink: 0;
  }

  .fname {
    color: #eee;
    font-size: 1rem;
  }
  .fcat {
    color: #666;
    font-size: 0.75rem;
  }

  .fsample {
    color: #999;
    font-size: 1rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin-left: auto;
    text-align: right;
  }

  .empty {
    color: #666;
    text-align: center;
    padding: 1.5rem;
    font-size: 0.85rem;
  }

  .bottom {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    padding: 0.5rem 0.75rem;
    border-top: 1px solid #333;
  }

  .categories {
    display: flex;
    gap: 0.2rem;
  }

  .chip {
    all: unset;
    cursor: pointer;
    padding: 0.05rem 0.35rem;
    border-radius: 6px;
    font-size: 0.55rem;
    color: #aaa;
    background: #2a2a2a;
    border: 1px solid #444;
    transition: all 0.1s;
  }
  .chip:hover {
    border-color: #7c4dff;
    color: #ddd;
  }
  .chip.active {
    background: #7c4dff;
    border-color: #7c4dff;
    color: #fff;
  }

  .bottom input[type="text"] {
    width: 100%;
    padding: 0.4rem 0.5rem;
    background: #222;
    border: 1px solid #555;
    border-radius: 4px;
    color: #eee;
    font-size: 0.85rem;
    outline: none;
    box-sizing: border-box;
  }
  .bottom input[type="text"]:focus {
    border-color: #7c4dff;
  }
</style>
