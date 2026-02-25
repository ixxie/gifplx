{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    rust-overlay.url = "github:oxalica/rust-overlay";
    crane.url = "github:ipetkov/crane";
  };

  outputs = { nixpkgs, flake-utils, rust-overlay, crane, ... }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs {
          inherit system;
          overlays = [ rust-overlay.overlays.default ];
        };

        rust = pkgs.rust-bin.stable.latest.default;
        craneLib = (crane.mkLib pkgs).overrideToolchain rust;

        tauriDeps = with pkgs; [
          webkitgtk_4_1
          gtk3
          cairo
          gdk-pixbuf
          glib
          dbus
          openssl
          librsvg
          libsoup_3
        ];

        nativeDeps = with pkgs; [
          pkg-config
          gobject-introspection
        ];

        # Frontend build
        frontend = pkgs.buildNpmPackage {
          pname = "gifplx-frontend";
          version = "0.1.0";
          src = pkgs.lib.cleanSourceWith {
            src = ./.;
            filter = path: _type:
              let b = builtins.baseNameOf path; in
              b != "src-tauri" && b != "target" && b != "node_modules";
          };
          npmDepsHash = "sha256-Dhl1cfQa3M4WJIWCBUATsHaVTKSxKw4p76J4GnbdwIE=";
          VITE_GIPHY_API_KEY = builtins.getEnv "VITE_GIPHY_API_KEY";
          VITE_GOOGLE_FONTS_API_KEY = builtins.getEnv "VITE_GOOGLE_FONTS_API_KEY";
          buildPhase = ''
            runHook preBuild
            npm run build
            runHook postBuild
          '';
          installPhase = ''
            runHook preInstall
            cp -r build $out
            runHook postInstall
          '';
        };

        # Rust source: cargo files + tauri config/icons/capabilities
        rustSrc = let
          tauriFilter = path: _type:
            builtins.match ".*\\.json$" path != null ||
            builtins.match ".*/icons(/.*)?$" path != null ||
            builtins.match ".*/capabilities(/.*)?$" path != null;
        in
          pkgs.lib.cleanSourceWith {
            src = ./src-tauri;
            filter = path: type:
              (craneLib.filterCargoSources path type) || (tauriFilter path type);
          };

        commonArgs = {
          src = rustSrc;
          strictDeps = true;
          cargoExtraArgs = "--features custom-protocol";
          buildInputs = tauriDeps;
          nativeBuildInputs = nativeDeps;
        };

        # Cache cargo deps (dummy frontend dist for build.rs)
        cargoArtifacts = craneLib.buildDepsOnly (commonArgs // {
          preBuild = ''
            mkdir -p ../build
            touch ../build/index.html
          '';
        });

        # Full build with real frontend
        gifplxUnwrapped = craneLib.buildPackage (commonArgs // {
          inherit cargoArtifacts;
          preBuild = ''
            cp -r ${frontend} ../build
          '';
        });

        # Wrap binary with runtime env vars
        gifplx = pkgs.symlinkJoin {
          name = "gifplx-${gifplxUnwrapped.version or "0.1.0"}";
          paths = [ gifplxUnwrapped ];
          nativeBuildInputs = [ pkgs.makeWrapper ];
          postBuild = ''
            wrapProgram $out/bin/app \
              --set GIO_MODULE_PATH "${pkgs.glib-networking}/lib/gio/modules"
          '';
        };

      in {
        packages = {
          inherit gifplx gifplxUnwrapped frontend;
          default = gifplx;
        };

        devShells.default = pkgs.mkShell {
          nativeBuildInputs = nativeDeps ++ [ rust pkgs.nodejs ];
          buildInputs = tauriDeps;
          shellHook = ''
            export GIO_MODULE_PATH="${pkgs.glib-networking}/lib/gio/modules"
          '';
        };
      }
    );
}
