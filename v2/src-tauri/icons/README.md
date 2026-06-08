# Tauri Icons

This directory needs icon files for Tauri to build the .exe. Generate them with:

```bash
cd v2
npx @tauri-apps/cli icon path/to/source-1024x1024.png
```

Required files:
- `32x32.png`
- `128x128.png`
- `128x128@2x.png` (256x256 actually)
- `icon.ico` (Windows installer)
- `icon.icns` (macOS, optional)

For first-time setup without a custom icon, you can use the Tauri default placeholder:

```bash
npx @tauri-apps/cli icon https://raw.githubusercontent.com/tauri-apps/tauri/dev/.github/icon.png
```

The build will fail until these files exist. See `../TAURI_BUILD.md`.
