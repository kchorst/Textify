# Textify 4.47.1 Release Notes

## Release basis

This release promotes the browser-qualified RC93 rendering and control state to shipping status.

The **rendering/UI core is frozen from RC93**. `output.js`, `output.html`, `output.css`, `content.js`, and `content.css` are byte-identical to RC93.

## Final calibrated defaults

### Stipple

- Classic / Adaptive: 16,000 / 0.7 / contrast 1.4
- Blue Noise / Poisson: 23,500 / 0.8 / contrast 0.7 / zoom 35% / Spacing 27
- Dithered / Bayer: 16,000 / 0.7 / contrast 1.2
- Structure / Contour: 16,000 / 0.7 / contrast 1.5

### Single-Line / TSP

- Classic / Marilyn: 22,006 / 0.45 / contrast 0.8 / zoom 40% / Tone 100 / Feature 100
- Voronoi / Organic: 11,225 / 0.95 / contrast 3.0 / zoom 40% / Tone 100 / Smoothness 100
- Dithered / Maze: 11,000 / 1.0 / contrast 1.3
- Textured / Directional: 12,000 / 1.20 / contrast 1.4 / zoom 30% / Direction 65 / Texture 50

## UI state

- Width, Contrast, and Zoom remain grouped together vertically.
- Transformation-specific controls are grouped by mode/style.
- Color controls remain grouped at the bottom.
- Negative and Half-Tone Transparent PNG remain bottom toggle buttons rather than standalone checkbox rows.
- Contextual slider headroom remains in place for the calibrated presets.

## 4.47.1 release-hardening changes

No artistic or transformation algorithm was changed after RC93.

Two shipping issues found during final QA were corrected:

1. **Manifest V3 overlay-toggle lifecycle** — the background worker no longer relies on an in-memory set of injected tabs. It probes the existing content-script listener first, so toolbar toggling remains reliable after the service worker is suspended/restarted.
2. **License/package cleanup** — the corrupted RC license file was replaced with the official PolyForm Noncommercial 1.0.0 notice URL, historical RC/ECO/QA debris was removed from the shipping repository, and unnecessary `web_accessible_resources` exposure was removed from the manifest.

## Release decision

Accepted for release. See `QA_REPORT.md` and `RELEASE_ACCEPTANCE.md`.

## Documentation

The public release documentation now includes `REFERENCES_AND_INFLUENCES.md`, which records the weighted-Voronoi, TSP-art, ordered-dithering, public-code-reference, and visual-qualification lineage behind the final Stipple and Single-Line modes. The README, User Guide, Process, Acknowledgments, and Third-Party Notices cross-reference this development history.

