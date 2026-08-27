# Textify

**Version 4.47.1 — release build**

Textify is a Manifest V3 browser extension that converts images found on webpages into stylized text and graphic renditions. It runs locally in the browser and includes eight transformation modes:

- **BW** — monochrome ASCII text
- **Color ASCII** — ASCII characters colored from the source image
- **Color Block** — full block characters colored from the source image
- **Half-Tone** — circular halftone dots with palette and color-improvement controls
- **Glitch** — red/cyan bar treatment
- **Stipple** — four dot-distribution styles
- **Single-Line** — four TSP/continuous-line styles
- **Custom** — configurable block density, orientation, spacing, and colors

## Release status

Version 4.47.1 promotes the RC93 rendering/UI state to release. The accepted rendering engine, defaults, control ranges, and UI are unchanged from RC93. The only runtime change after RC93 is a Manifest V3 service-worker hardening fix so toolbar overlay toggling remains reliable after the background worker is suspended or restarted.

The release also removes development-history files from the shipping package and replaces the corrupted RC license file with a valid PolyForm Noncommercial 1.0.0 notice.

## Install from source

1. Download or clone this repository.
2. Open your Chromium-based browser's Extensions page.
3. Enable **Developer mode**.
4. Choose **Load unpacked**.
5. Select the repository folder containing `manifest.json`.
6. Open a normal webpage containing images.
7. Click the Textify toolbar icon, then click a highlighted image.

Textify ignores images smaller than 100 × 100 pixels. Images larger than 1000 pixels on their longest side are downscaled for processing.

## Shared controls

The release UI keeps **Width**, **Contrast**, and **Zoom** together in a fixed standard-control group. Transformation-specific controls are grouped separately, and color controls are grouped at the bottom. **Negative** and **Transparent PNG** are toggle buttons rather than standalone checkbox rows.

Zoom is presentation-only for Stipple and Single-Line: changing Zoom does not recompute vector geometry.

## Stipple styles

1. Classic / Adaptive
2. Blue Noise / Poisson
3. Dithered / Bayer
4. Structure / Contour

The browser-qualified Blue Noise reset is 23,500 dots, dot size 0.8, contrast 0.7, zoom 35%, width 100%, spacing 27.

## Single-Line / TSP styles

1. Classic / Marilyn
2. Voronoi / Organic
3. Dithered / Maze
4. Textured / Directional

Browser-qualified release resets include:

- Classic / Marilyn: 22,006 cities, 0.45 line width, contrast 0.8, zoom 40%, Tone Support 100, Feature Detail 100.
- Voronoi / Organic: 11,225 cities, 0.95 line width, contrast 3.0, zoom 40%, Tone Contrast 100, Smoothness 100.
- Dithered / Maze: 11,000 cities, 1.0 line width, contrast 1.3, zoom 100%.
- Textured / Directional: 12,000 cities, 1.20 line width, contrast 1.4, zoom 30%, Direction Strength 65, Texture Scale 50.

## Exports

- **Copy** copies text or rendered HTML markup. For Stipple and Single-Line artwork, use PNG or HTML export.
- **Save .txt** is available for BW ASCII.
- **Save .html** creates a self-contained HTML rendition; vector modes embed a PNG image.
- **Save .png** exports a raster image of the current transformation.
- Half-Tone can export PNG with a transparent background.

## Permissions

Textify requests only:

- `activeTab` — access the page after the user clicks the toolbar icon
- `scripting` — inject the image-selection overlay
- `storage` — transfer the selected image to the output tab and remember settings

There are no analytics, trackers, remote APIs, or network requests in the runtime code. See `PRIVACY.md`.

## Documentation

- `USERSGUIDE.md` — user operation and controls
- `PROCESS.md` — complete image-to-output transformation pipeline
- `QA_REPORT.md` — final technical qualification results
- `RELEASE_ACCEPTANCE.md` — release gate decision
- `RELEASE_NOTES.md` — final release changes
- `REFERENCES_AND_INFLUENCES.md` — research lineage, visual references, algorithmic influences, and development process
- `ACKNOWLEDGMENTS.md` and `THIRD_PARTY_NOTICES.md` — attribution and bundled-dependency status
- `LICENSE.md` — license notice
- `SHA256SUMS.txt` — integrity hashes for the release source files

## Research and artistic lineage

The Stipple and Single-Line/TSP features were developed in conversation with established work on weighted Voronoi stippling, ordered dithering, and TSP art, plus development-only portrait references used for visual qualification. `REFERENCES_AND_INFLUENCES.md` explains what influenced Textify, what was implemented independently, how the Marilyn/Audrey/Rai reference images were used, and where the release intentionally diverges from classical closed-tour TSP art.

## License

Textify is distributed under the **PolyForm Noncommercial License 1.0.0**. See `LICENSE.md`.
