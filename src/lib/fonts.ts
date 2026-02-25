export type FontCategory = 'serif' | 'sans-serif' | 'display' | 'handwriting' | 'monospace';

export interface FontInfo {
  family: string;
  category: FontCategory;
  variants: string[];
  subsets: string[];
}

export const CATEGORIES: { value: FontCategory; label: string }[] = [
  { value: 'sans-serif', label: 'Sans' },
  { value: 'serif', label: 'Serif' },
  { value: 'display', label: 'Display' },
  { value: 'handwriting', label: 'Script' },
  { value: 'monospace', label: 'Mono' },
];

const FALLBACK_FONTS: FontInfo[] = [
  { family: 'Impact', category: 'display', variants: ['regular'], subsets: ['latin'] },
  { family: 'Arial Black', category: 'sans-serif', variants: ['regular'], subsets: ['latin'] },
  { family: 'Comic Sans MS', category: 'handwriting', variants: ['regular'], subsets: ['latin'] },
  { family: 'Courier New', category: 'monospace', variants: ['regular'], subsets: ['latin'] },
  { family: 'Georgia', category: 'serif', variants: ['regular'], subsets: ['latin'] },
  { family: 'Times New Roman', category: 'serif', variants: ['regular'], subsets: ['latin'] },
  { family: 'Trebuchet MS', category: 'sans-serif', variants: ['regular'], subsets: ['latin'] },
  { family: 'Verdana', category: 'sans-serif', variants: ['regular'], subsets: ['latin'] },
];

let cachedFonts: FontInfo[] | null = null;

export async function fetchFonts(): Promise<FontInfo[]> {
  if (cachedFonts) {
    return cachedFonts;
  }

  const apiKey = import.meta.env.VITE_GOOGLE_FONTS_API_KEY;
  if (!apiKey) {
    cachedFonts = FALLBACK_FONTS;
    return cachedFonts;
  }

  try {
    const params = new URLSearchParams({
      key: apiKey,
      sort: 'alpha'
    });
    const resp = await fetch(`https://www.googleapis.com/webfonts/v1/webfonts?${params}`);
    const json = await resp.json();
    cachedFonts = json.items.map((f: any) => ({
      family: f.family,
      category: f.category,
      variants: f.variants ?? [],
      subsets: f.subsets ?? [],
    }));
    return cachedFonts!;
  } catch (e) {
    console.error('Google Fonts API failed:', e);
    cachedFonts = FALLBACK_FONTS;
    return cachedFonts;
  }
}

const loadedFonts = new Set<string>();

export async function loadFont(family: string): Promise<void> {
  if (loadedFonts.has(family)) {
    return;
  }

  const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}&display=swap`;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = url;
  document.head.appendChild(link);

  try {
    await document.fonts.load(`16px "${family}"`);
  } catch {
    // font may still work via CSS even if this fails
  }
  loadedFonts.add(family);
}
