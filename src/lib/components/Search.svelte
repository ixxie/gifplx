<script lang="ts">
  interface GifResult {
    id: string;
    title: string;
    url: string;
    thumb: string;
    width: number;
    height: number;
    thumbWidth: number;
    thumbHeight: number;
  }

  let {
    onselect,
    initialQuery = ''
  }: {
    onselect: (gif: GifResult) => void;
    initialQuery?: string;
  } = $props();

  let query = $state(initialQuery);
  let hasSelected = false;
  let results = $state<GifResult[]>([]);
  let colCount = $state(2);
  let gridEl: HTMLDivElement;
  let loading = $state(false);
  let loadingMore = $state(false);
  let hasMore = $state(false);
  let offset = $state(0);
  let timer: ReturnType<typeof setTimeout>;
  let scrollEl: HTMLDivElement;

  const PAGE = 48;
  const apiKey = import.meta.env.VITE_GIPHY_API_KEY;

  function mapResults(data: any[]): GifResult[] {
    return data.map((g: any) => ({
      id: g.id,
      title: g.title,
      url: g.images.original.url,
      thumb: g.images.fixed_width.url,
      width: parseInt(g.images.original.width),
      height: parseInt(g.images.original.height),
      thumbWidth: parseInt(g.images.fixed_width.width),
      thumbHeight: parseInt(g.images.fixed_width.height),
    }));
  }

  // distribute gifs into columns by shortest-column-first
  let columns = $derived.by(() => {
    const cols: GifResult[][] = Array.from({ length: colCount }, () => []);
    const heights = new Array(colCount).fill(0);

    for (const gif of results) {
      let shortest = 0;
      for (let i = 1; i < colCount; i++) {
        if (heights[i] < heights[shortest]) {
          shortest = i;
        }
      }
      cols[shortest].push(gif);
      heights[shortest] += gif.thumbHeight / gif.thumbWidth;
    }

    return cols;
  });

  function updateColCount() {
    if (!gridEl) {
      return;
    }
    const w = gridEl.clientWidth;
    colCount = Math.max(1, Math.floor(w / 200));
  }


  async function search(q: string) {
    if (!q.trim()) {
      results = [];
      hasMore = false;
      return;
    }
    loading = true;
    offset = 0;
    try {
      const params = new URLSearchParams({
        api_key: apiKey,
        q,
        limit: String(PAGE),
        offset: '0',
        rating: 'g'
      });
      const resp = await fetch(`https://api.giphy.com/v1/gifs/search?${params}`);
      const json = await resp.json();
      results = mapResults(json.data);
      offset = results.length;
      hasMore = json.pagination.total_count > offset;
      if (!hasSelected && results.length > 0) {
        const pick = results[Math.floor(Math.random() * results.length)];
        onselect(pick);
        hasSelected = true;
      }
    } catch (e) {
      console.error('GIPHY search failed:', e);
      results = [];
      hasMore = false;
    }
    loading = false;
  }

  async function loadMore() {
    if (loadingMore || !hasMore || !query.trim()) {
      return;
    }
    loadingMore = true;
    try {
      const params = new URLSearchParams({
        api_key: apiKey,
        q: query,
        limit: String(PAGE),
        offset: String(offset),
        rating: 'g'
      });
      const resp = await fetch(`https://api.giphy.com/v1/gifs/search?${params}`);
      const json = await resp.json();
      const newResults = mapResults(json.data);
      results = [...results, ...newResults];
      offset += newResults.length;
      hasMore = json.pagination.total_count > offset;
    } catch (e) {
      console.error('GIPHY load more failed:', e);
    }
    loadingMore = false;
  }

  $effect(() => {
    if (!gridEl) {
      return;
    }
    updateColCount();
    const ro = new ResizeObserver(updateColCount);
    ro.observe(gridEl);
    return () => ro.disconnect();
  });

  if (initialQuery) {
    search(initialQuery);
  }

  function onInput() {
    clearTimeout(timer);
    timer = setTimeout(() => search(query), 400);
  }

  function onScroll() {
    if (!scrollEl) {
      return;
    }
    const { scrollTop, scrollHeight, clientHeight } = scrollEl;
    if (scrollHeight - scrollTop - clientHeight < 200) {
      loadMore();
    }
  }
</script>

<div class="search">
  {#if !apiKey}
    <p class="warning">
      Set <code>VITE_GIPHY_API_KEY</code> in your <code>.env</code> file.
      Get a free key at <a href="https://developers.giphy.com" target="_blank">developers.giphy.com</a>.
    </p>
  {/if}

  <div class="scroll" bind:this={scrollEl} onscroll={onScroll}>
    {#if loading}
      <p class="status">Searching...</p>
    {/if}

    <div class="grid" bind:this={gridEl}>
      {#each columns as col, i (i)}
        <div class="col">
          {#each col as gif (gif.id)}
            <button class="thumb" onclick={() => onselect(gif)}>
              <img src={gif.thumb} alt={gif.title} loading="lazy" />
            </button>
          {/each}
        </div>
      {/each}
    </div>

    {#if loadingMore}
      <p class="status">Loading more...</p>
    {/if}

    {#if !loading && query && results.length === 0}
      <p class="status">No results found.</p>
    {/if}
  </div>

  <div class="bar">
    <input
      type="text"
      bind:value={query}
      oninput={onInput}
      placeholder="Search for GIFs..."
    />
  </div>
</div>

<style>
  .search {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    min-height: 0;
  }

  .scroll {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
    padding: 0 0.25rem;
  }

  .bar {
    flex-shrink: 0;
    padding: 0.75rem;
    background: #1a1a1a;
    border-radius: 8px 8px 0 0;
  }

  .bar input {
    width: 100%;
    padding: 0.5rem;
    font-size: 1rem;
    border: 1px solid #555;
    border-radius: 4px;
    background: #222;
    color: #eee;
    outline: none;
    box-sizing: border-box;
  }
  .bar input:focus {
    border-color: #7c4dff;
  }

  .warning {
    color: #ff9800;
    font-size: 0.9rem;
    flex-shrink: 0;
    padding: 0.5rem;
  }
  .status {
    color: #999;
    text-align: center;
  }

  .grid {
    display: flex;
    gap: 8px;
  }

  .col {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .thumb {
    all: unset;
    cursor: pointer;
    display: block;
    border-radius: 6px;
    overflow: hidden;
    background: #222;
    transition: transform 0.15s;
  }
  .thumb:hover {
    transform: scale(1.05);
  }
  .thumb img {
    width: 100%;
    display: block;
  }
</style>
