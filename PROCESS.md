# Textify Rendering Process

**Version 4.47.1**

This document describes the production transformation pipeline from a webpage image to the rendered/exported result.

## 1. Webpage image discovery

When the toolbar icon is clicked, the Manifest V3 service worker first checks whether Textify's content script is already active in the tab. If it is, the existing script toggles the image-selection overlays. If not, the service worker injects `content.css` and `content.js`.

`content.js` scans `img` elements that are fully loaded and at least 100 × 100 pixels. An absolute overlay is positioned over each eligible image.

## 2. Image capture and transfer

When an overlay is clicked:

1. Textify reads the image's natural dimensions and its current rendered dimensions.
2. If the longest natural dimension exceeds 1000 pixels, both dimensions are scaled proportionally so the longest side becomes 1000 pixels.
3. The image is drawn to an in-page canvas.
4. Textify reads a pixel to detect a cross-origin/tainted canvas. If browser security blocks pixel access, processing stops locally with an explanatory message.
5. The canvas is encoded as PNG to avoid adding JPEG compression artifacts.
6. `{dataURL, width, height, renderedWidth, renderedHeight}` is temporarily stored in `chrome.storage.local` as `textify_payload`.
7. The content script asks the service worker to open `output.html`.
8. The output tab reads and immediately removes `textify_payload`, then decodes the PNG into RGBA pixel data.

User settings remain in `chrome.storage.local`; the selected image payload does not remain there after the output tab consumes it.

## 3. Shared sampling and tone calculations

Textify maps output coordinates back to the source pixel array. Core luminance calculations use the standard weighted RGB form:

`L = (0.299R + 0.587G + 0.114B) / 255`

Contrast is applied with a power transform equivalent to:

`L' = L^(1 / contrast)`

Mode-specific code may then invert tone, compute darkness (`1 - L`), calculate gradients, blur local neighborhoods, or build density fields.

**Negative** participates in the vector Stipple/Single-Line tone pipeline, reversing source-tone interpretation there. Vector foreground/background helpers also invert selected colors when Negative is active. BW uses its separate Invert mapping; the other non-vector transformations retain their existing mode-specific tone/color behavior.

## 4. Shared view controls

### Width

For text-based modes, Width determines the effective output grid width. Character geometry is measured from the active monospace font, and rows are derived from source aspect ratio plus the measured character aspect ratio.

For Stipple and Single-Line, point/city geometry remains in fixed source coordinates. Width changes vector backing/export dimensions using a scale of `width / 100` and changes preview width without redefining the artwork.

### Contrast

Contrast participates in tone mapping and therefore can change Stipple/TSP geometry. It is included in vector geometry cache keys.

### Zoom

Zoom applies a CSS `scale(zoom / 100)` transform to the preview with origin at the upper left. It is presentation-only and is deliberately excluded from Stipple/TSP geometry cache keys.

## 5. BW ASCII

Textify samples each output cell, calculates luminance, applies Contrast, applies the BW Invert state, and maps the result into a density-ordered character ramp:

`$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,"^`'. `

The result is plain text in the output `<pre>` element.

## 6. Color ASCII

Color ASCII uses the same tone-to-character mapping as BW, but each character is wrapped in a span using the sampled source RGB color.

## 7. Color Block

Color Block samples the image on the text grid but always renders a full block character (`█`) using the sampled RGB color. Image density is therefore represented primarily by the source colors rather than by changing character glyphs.

## 8. Glitch

Glitch uses a fixed 60-column bar field. For each source sample, average RGB brightness is converted through the active Contrast setting and then into vertical bar height. Columns alternate red and cyan. Spacer Rows inserts full row-height gaps between generated rows.

## 9. Half-Tone

Half-Tone creates a regular circular-dot field.

1. Halftone Size determines the number of horizontal cells relative to the text-grid width.
2. Each cell samples the corresponding source pixel.
3. Optional Color Improvement modifies RGB channels using one of the selected heuristics (Strong, Privilege bright/dark, Smart, Smart channels, Hot colors, Smart hot, or Pastel).
4. Improvement Level scales the selected improvement strength.
5. Bright Overall Style moves processed RGB values toward white.
6. Processed brightness is converted through Contrast.
7. Dot diameter is proportional to cell width using `0.1 + 0.9L` after the mode's tone mapping.
8. Dot color comes either from the selected palette or directly from the processed source RGB.
9. Background is either the selected color or transparent for PNG export.

## 10. Custom blocks

Custom uses independent Row Density and Col Density settings. Each cell samples the source and derives a brightness factor. Depending on Orientation, brightness changes either block height or block width. H Gap reduces horizontal block extent. Spacer Rows adds vertical separation. Selected block colors cycle across cells over the selected background color.

## 11. Stipple pipeline

Stipple produces point geometry in source coordinates and then draws a constant-radius dot at each point. Dot Size is appearance-only.

### Classic / Adaptive

Classic builds a weighted tonal/structural density field, samples points from it, and injects bounded feature/portrait anchors. The release Reset is 16,000 points, dot size 0.7, contrast 1.4, Relaxation 50.

### Blue Noise / Poisson

Blue Noise builds a tone map, converts it to darkness, adds modest compact-structure support, detects flat border-connected dark backgrounds, then performs variable-radius Poisson/blue-noise placement. Darker areas permit closer points; lighter areas require more spacing. Progressive exclusion-radius passes fill the requested budget without relying on invisible near-duplicate padding. Release Reset: 23,500 points, dot size 0.8, contrast 0.7, zoom 35%, Spacing 27.

### Dithered / Bayer

Dithered uses ordered Bayer threshold structure over image tone to produce a deterministic tonal stipple field. Release Reset: 16,000 points, dot size 0.7, contrast 1.2, Tone Contrast 50.

### Structure / Contour

Structure uses the high-contrast structural density profile with feature and portrait anchor injection. Release Reset: 16,000 points, dot size 0.7, contrast 1.5, Structure Emphasis 50.

For all Stipple styles, the geometry cache key includes source dimensions, requested point count, Contrast, Negative state, active style, and relevant style controls.

## 12. Single-Line / TSP pipeline

Single-Line first generates style-specific **cities**, then builds one continuous **open** path through all cities. The painted output never closes the final point back to the first.

### Classic / Marilyn

Classic uses the release's zero-inclusive tonal-grid city grammar, permitting bright cells to receive no cities while darker cells receive higher local counts. Tone Support and Feature Detail alter the city field. Release Reset: 22,006 cities, line width 0.45, contrast 0.8, zoom 40%, Tone Support 100, Feature Detail 100.

### Voronoi / Organic

Voronoi/Organic builds weighted centroidal/Voronoi-derived city placement over the tone field. Tone Contrast and Smoothness control the weighting/relaxation behavior. Release Reset: 11,225 cities, line width 0.95, contrast 3.0, zoom 40%, Tone Contrast 100, Smoothness 100.

### Dithered / Maze

Dithered/Maze uses ordered tonal/Bayer ranking to generate deterministic city structure before routing. Release Reset: 11,000 cities, line width 1.0, contrast 1.3, Tone Contrast 50, Pattern Strength 50.

### Textured / Directional

Textured/Directional uses Organic-derived city behavior with directional displacement and a rotated anisotropic metric for routing. Direction Strength and Texture Scale control the metric/displacement strength. Release Reset: 12,000 cities, line width 1.20, contrast 1.4, zoom 30%, Direction Strength 65, Texture Scale 50.

### TSP route construction

The route core is shared by all four styles:

1. Build a geometric seed using a multi-fragment path for normal release counts or a Hilbert/local order for very large counts.
2. Apply bounded local 2-opt improvement.
3. Repair long bridges and selected crossings within a fixed work budget.
4. For the directional style, compute route cost in its anisotropic metric while keeping displayed coordinates unchanged.
5. Cut the worst cycle edge so the result becomes one open continuous path.
6. Classic and Textured receive an additional bounded actual-coordinate bridge-repair pass.
7. Stroke the open path with round joins and caps.

Line Width affects only the final stroke and is excluded from city placement, routing, and geometry cache keys.

## 13. Persistence and contextual ranges

Settings are saved in `chrome.storage.local`. The release retains calibration revision 93. Style changes apply contextual slider limits while preserving the chosen release default. Important extended ranges include:

- Contrast: 0.2–4.0
- Blue Noise point count: up to 40,000
- Classic TSP city count: up to 40,000
- Classic Tone Support / Feature Detail: 0–160
- Voronoi Tone Contrast / Smoothness: 0–160

## 14. Reset and export

Reset restores the active mode/style's calibrated tuple, synchronizes contextual ranges, clears vector geometry caches where applicable, saves settings, and rerenders.

PNG export redraws the current mode to an export canvas. TXT export is BW-only. HTML export serializes text/HTML modes and embeds a PNG data URL for Stipple and Single-Line.

## 15. Research lineage and visual references

This document describes the production mechanics. The research papers, public implementation references, TSP-art lineage, Marilyn/Audrey/Rai development references, and the reasoning that led to Textify's specific deviations from classical algorithms are documented separately in `REFERENCES_AND_INFLUENCES.md`.

