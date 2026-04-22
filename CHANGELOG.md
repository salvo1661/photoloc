# Changelog
All notable changes to this project will be documented in this file.

## 2026-04-22
### Added
- Added PSD workflow support in the browser: layered PSD import and layered PSD export.
- Added a multilingual text tool powered by Noto family web fonts with language-based default font selection.
- Expanded text editing capabilities with re-edit support, alignment, line height, letter spacing, stroke, and shadow controls.

### Fixed
- Prevented malformed stacked language URLs by normalizing localized paths and redirecting repeated language segments to canonical routes.
- Improved editor interaction handling to avoid accidental browser text selection during canvas drag operations.
- Updated text-layer movement behavior to follow selection workflow (move selected text layers with the Select tool).
- Refined right-sidebar usability with independent scrolling for tool controls and a draggable divider to resize controls vs. layers/history panels.

## 2026-03-23
### Added
- Added new UI locales: Vietnamese, Italian, Dutch, Turkish, and Persian.
- Reordered language list roughly by global speaker scale for easier selection.
### Fixed
- Center large images in the editor workspace and keep panning reachable after load/zoom.
- Apply current adjustment filters during export even if "Apply" was not pressed.
