# GIFPLX

A desktop app for adding text overlays to GIFs. Search for GIFs via Giphy, pick a font from Google Fonts, customize text styling, and export.

![GIFPLX demo](lol.gif)

Built with Svelte 5, Tauri 2, and Nix.

## Stack

- **Frontend**: Svelte 5, SvelteKit, Vite
- **Backend**: Tauri 2 (Rust)
- **GIF processing**: gif.js, gifuct-js
- **Build**: Nix flakes, Crane

## API Keys

Copy the example env file and fill in your keys:

```sh
cp .env.example .env
```

- **Giphy**: get a free key at [developers.giphy.com](https://developers.giphy.com)
- **Google Fonts**: get a free key at [console.cloud.google.com](https://console.cloud.google.com) (enable the Web Fonts Developer API)

## Development

### Web (browser only)

```sh
npm install
npm run dev
```

Starts the Svelte frontend on `localhost:1337`. No Rust or Tauri dependencies needed.

### Tauri (desktop app)

Requires Rust and the native Tauri dependencies (gtk3, webkit2gtk, etc).

```sh
npm install
npm run tauri:dev
```

## Nix

### Dev Shell

A Nix dev shell with all dependencies is provided via the flake:

```sh
nix develop
```

### direnv

To automatically load the dev shell and `.env` variables, install [direnv](https://direnv.net/) and run:

```sh
direnv allow
```

The `.envrc` uses `use flake` for the dev shell and `dotenv` to load API keys.

### Building

The Nix build reads API keys from your environment via `--impure`:

```sh
nix build --impure
```

The binary is at `result/bin/app`.

Without `--impure`, the app builds but Giphy search and Google Fonts won't be available (falls back to system fonts).
