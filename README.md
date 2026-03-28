# Photoloc

Photoloc is a high-function Photoshop-style editor that runs entirely on your device. It is built for privacy-first editing, with all processing kept local in your browser.

Most online photo editors send images to servers, which creates privacy risk. Photoloc does not. Nothing is uploaded or transmitted during editing. If you want to verify this, open Chrome or IE and capture network traffic while editing; you will see that no image or editing data is sent to any server. The tradeoff is that performance can vary depending on your PC’s specs, and very large images may feel slower on lower-end machines.

## Features
- On-device processing only (no uploads, no server-side editing)
- Drag-and-drop or click to open images
- Zoom controls with fit-to-screen
- Pan/drag canvas navigation
- Crop tool with live size readout
- Resize tool with width/height controls
- Rotate 90° clockwise and counterclockwise
- Flip horizontal and vertical
- Adjustment controls:
  brightness, contrast, saturation, hue rotate, sepia, grayscale, blur
- Non-destructive adjustments preview
- Apply adjustments to bake them into the active layer
- Marquee selection with:
  copy, cut, paste, and floating selection move/resize
- Layer system:
  add/delete layers, rename, reorder, merge down, visibility toggle, opacity
- Background color picker (including transparent)
- History timeline with click-to-restore
- Undo/redo with shortcuts
- Export to PNG (lossless), JPEG, WebP with quality control
- Multi-language UI with locale-aware routes

## Tech Stack
- Vite + React + TypeScript
- Tailwind CSS + shadcn-ui (Radix UI)
- React Router

## Getting Started

### Requirements
- Node.js 18+ and npm

### Install
```sh
npm install
```

### Run Dev Server
```sh
npm run dev
```

### Build
```sh
npm run build
```

### Preview
```sh
npm run preview
```

### Lint
```sh
npm run lint
```

### Test
```sh
npm run test
```

## Project Structure
- `src/pages/Index.tsx` main editor page
- `src/hooks/useImageEditor.ts` editor state and image operations
- `src/components/editor` editor UI (toolbar, canvas, sidebars)
- `src/i18n` localization resources

## Contributing
Photoloc is open source and we welcome contributions.
- Report bugs and request features via issues
- Submit pull requests for fixes, improvements, and translations
- Keep changes focused and include a clear description

## TODO
- Fix pen-tool flicker after each completed stroke (canvas flashes briefly when stroke is committed to layer history/composite).

Curated on [LeanVibe](https://leanvibe.io/vibe/photoloc)
